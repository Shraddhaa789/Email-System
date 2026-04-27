import fs from "fs/promises";
import path from "path";
import bcrypt from "bcrypt";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import prisma from "../config/db.js";
import { buildInboundDedupKey } from "../utils/emailDedup.js";

const uploadsRoot = path.join(process.cwd(), "uploads");
const dataRoot = path.join(process.cwd(), "data");
const syncStatePath = path.join(dataRoot, "mail-sync-state.json");
const DEFAULT_ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@aksentt.app";
const DEFAULT_INITIAL_SYNC_MODE = "all";

let syncTimer = null;
let syncInProgress = false;
let lastSyncStartedAt = null;
let lastSyncFinishedAt = null;
let lastSyncError = null;

const parseBoolean = (value, fallback = false) => {
  if (typeof value !== "string") {
    return fallback;
  }

  return value.toLowerCase() === "true";
};

const getImapConfig = () => {
  const host = process.env.IMAP_HOST?.trim();
  const port = Number.parseInt(process.env.IMAP_PORT || "", 10);
  const secure =
    typeof process.env.IMAP_SECURE === "string"
      ? parseBoolean(process.env.IMAP_SECURE)
      : true;
  const user = process.env.IMAP_USER?.trim() || process.env.SMTP_USER?.trim();
  const pass = process.env.IMAP_PASS?.trim() || process.env.SMTP_PASS?.trim();
  const ownerEmail =
    process.env.MAILBOX_OWNER_APP_EMAIL?.trim() ||
    process.env.IMAP_USER?.trim() ||
    process.env.SMTP_USER?.trim();
  const pollIntervalMs = Math.max(
    15000,
    Number.parseInt(process.env.IMAP_POLL_INTERVAL_MS || "", 10) || 60000
  );
  const initialSyncMode = (process.env.IMAP_INITIAL_SYNC_MODE || DEFAULT_INITIAL_SYNC_MODE)
    .trim()
    .toLowerCase();

  return {
    host,
    port: Number.isFinite(port) ? port : 993,
    secure,
    user,
    pass,
    ownerEmail,
    pollIntervalMs,
    initialSyncMode: initialSyncMode === "latest" ? "latest" : "all",
  };
};

const shouldDeliverToMailboxOwner = ({
  owner,
  mailboxUserEmail,
  toRecipients = [],
}) => {
  if (!owner?.id) {
    return false;
  }

  const normalizedMailboxUserEmail = mailboxUserEmail?.trim().toLowerCase();
  const recipientEmails = toRecipients.map((entry) => entry.email?.trim().toLowerCase()).filter(Boolean);

  return (
    recipientEmails.includes(owner.email?.trim().toLowerCase()) ||
    (normalizedMailboxUserEmail ? recipientEmails.includes(normalizedMailboxUserEmail) : false)
  );
};

const readSyncState = async () => {
  try {
    const raw = await fs.readFile(syncStatePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return { lastUid: 0 };
  }
};

const writeSyncState = async (state) => {
  await fs.mkdir(dataRoot, { recursive: true });
  await fs.writeFile(syncStatePath, JSON.stringify(state, null, 2), "utf8");
};

const updateSyncState = async (updater) => {
  const currentState = await readSyncState();
  const nextState = updater(currentState);
  await writeSyncState(nextState);
  return nextState;
};

const ensureMailboxOwner = async (ownerEmail) => {
  if (!ownerEmail) {
    return null;
  }

  return prisma.user.findUnique({
    where: { email: ownerEmail },
  });
};

const findDefaultAdminUser = async () => {
  const configuredAdmin = await prisma.user.findUnique({
    where: { email: DEFAULT_ADMIN_EMAIL },
  });

  if (configuredAdmin && !configuredAdmin.deletedAt) {
    return configuredAdmin;
  }

  return prisma.user.findFirst({
    where: {
      accountRole: "admin",
      deletedAt: null,
    },
    orderBy: {
      createdAt: "asc",
    },
  });
};

const findOrCreateExternalContact = async ({ email, name }) => {
  const normalizedEmail = email?.trim().toLowerCase();

  if (!normalizedEmail) {
    return null;
  }

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existing) {
    return existing;
  }

  const hashedPassword = await bcrypt.hash(`external-contact:${normalizedEmail}`, 10);

  return prisma.user.create({
    data: {
      email: normalizedEmail,
      password: hashedPassword,
      name: name || normalizedEmail.split("@")[0],
      accountRole: "user",
      userType: "guest",
      role: "External contact",
      team: "External",
      workingHours: "",
      location: "Outside organization",
    },
  });
};

const normalizeAddressList = (addressObject) =>
  (addressObject?.value || [])
    .map((entry) => ({
      name: entry.name || entry.address?.split("@")[0] || "",
      email: entry.address?.trim().toLowerCase(),
    }))
    .filter((entry) => entry.email);

const normalizeHeaderAddressList = (value) => {
  if (!value) {
    return [];
  }

  const raw = Array.isArray(value) ? value.join(",") : String(value);

  return raw
    .split(/[,\n]+/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const match = entry.match(/<?([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})>?/i);
      const email = match?.[1]?.toLowerCase();

      return email
        ? {
            name: email.split("@")[0],
            email,
          }
        : null;
    })
    .filter(Boolean);
};

const uniqueRecipients = (entries = []) =>
  [...new Map(entries.filter(Boolean).map((entry) => [entry.email.toLowerCase(), entry])).values()];

const getHeaderRecipients = (parsed) =>
  uniqueRecipients([
    ...normalizeHeaderAddressList(parsed.headers?.get("delivered-to")),
    ...normalizeHeaderAddressList(parsed.headers?.get("x-original-to")),
    ...normalizeHeaderAddressList(parsed.headers?.get("envelope-to")),
  ]);

const findUsersByEmails = async (emails = []) => {
  const normalized = [...new Set(emails.map((email) => email.trim().toLowerCase()).filter(Boolean))];

  if (normalized.length === 0) {
    return [];
  }

  return prisma.user.findMany({
    where: {
      email: {
        in: normalized,
      },
      deletedAt: null,
    },
  });
};

const saveIncomingAttachments = async (attachments = [], ownerId, uid) => {
  if (!Array.isArray(attachments) || attachments.length === 0) {
    return [];
  }

  const targetDir = path.join(uploadsRoot, ownerId);
  await fs.mkdir(targetDir, { recursive: true });

  const saved = [];

  for (const attachment of attachments) {
    const safeName = (attachment.filename || "attachment.bin").replace(/[^a-zA-Z0-9._-]/g, "_");
    const storedName = `${Date.now()}-${uid}-${safeName}`;
    const absolutePath = path.join(targetDir, storedName);
    await fs.writeFile(absolutePath, attachment.content);

    saved.push({
      id: storedName,
      name: attachment.filename || safeName,
      storedName,
      mimeType: attachment.contentType || "application/octet-stream",
      size: attachment.size || attachment.content?.length || 0,
      relativePath: path.join(ownerId, storedName).replaceAll("\\", "/"),
    });
  }

  return saved;
};

const findExistingInboundEmail = async ({
  senderId,
  senderEmail,
  receiverId,
  subject,
  body,
  createdAt,
  toRecipients,
  ccRecipients,
  bccRecipients,
}) => {
  const candidateWindowStart = new Date(new Date(createdAt).getTime() - 60 * 1000);
  const candidateWindowEnd = new Date(new Date(createdAt).getTime() + 60 * 1000);
  const expectedKey = buildInboundDedupKey({
    senderEmail,
    receiverId,
    folder: "inbox",
    subject,
    body,
    createdAt,
    toRecipients,
    ccRecipients,
    bccRecipients,
  });

  const candidates = await prisma.email.findMany({
    where: {
      senderId,
      receiverId,
      folder: "inbox",
      createdAt: {
        gte: candidateWindowStart,
        lte: candidateWindowEnd,
      },
    },
    include: {
      sender: {
        select: {
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 10,
  });

  return (
    candidates.find((candidate) => {
      let parsedToRecipients = [];
      let parsedCcRecipients = [];
      let parsedBccRecipients = [];

      try {
        parsedToRecipients = JSON.parse(candidate.toRecipients || "[]");
        parsedCcRecipients = JSON.parse(candidate.ccRecipients || "[]");
        parsedBccRecipients = JSON.parse(candidate.bccRecipients || "[]");
      } catch {}

      return (
        buildInboundDedupKey({
          senderEmail: candidate.sender?.email || senderEmail,
          receiverId: candidate.receiverId,
          folder: candidate.folder,
          subject: candidate.subject,
          body: candidate.body,
          createdAt: candidate.createdAt,
          toRecipients: parsedToRecipients,
          ccRecipients: parsedCcRecipients,
          bccRecipients: parsedBccRecipients,
        }) === expectedKey
      );
    }) || null
  );
};

const importMessage = async ({ message, owner, adminUser }) => {
  const config = getImapConfig();
  const parsed = await simpleParser(message.source);
  const fromAddress = normalizeAddressList(parsed.from)[0];

  if (!fromAddress?.email) {
    return;
  }

  const sender = await findOrCreateExternalContact(fromAddress);
  const toRecipients = uniqueRecipients([
    ...normalizeAddressList(parsed.to),
    ...getHeaderRecipients(parsed),
  ]);
  const ccRecipients = uniqueRecipients(normalizeAddressList(parsed.cc));
  const bccRecipients = uniqueRecipients(normalizeAddressList(parsed.bcc));
  const body = parsed.text?.trim() || parsed.html?.toString() || "";
  const createdAt = message.internalDate || parsed.date || new Date();
  const toUsers = await findUsersByEmails(toRecipients.map((entry) => entry.email));

  const recipientTargets = toUsers.map((user) => ({ user, bucket: "to" }));

  // The mailbox owner always receives all emails from their monitored mailbox,
  // regardless of what the To header says (handles forwarded mail, catch-all, etc).
  if (owner?.id) {
    recipientTargets.push({ user: owner, bucket: "mailbox-owner" });
  }

  const uniqueTargets = [
    ...new Map(recipientTargets.map((entry) => [entry.user.id, entry])).values(),
  ];

  if (uniqueTargets.length === 0 && owner) {
    uniqueTargets.push({ user: owner, bucket: "fallback-owner" });
  } else if (uniqueTargets.length === 0 && adminUser) {
    uniqueTargets.push({ user: adminUser, bucket: "fallback-admin" });
  }

  for (const target of uniqueTargets) {
    const subject = parsed.subject?.trim() || "(no subject)";
    const existingEmail = await findExistingInboundEmail({
      senderId: sender.id,
      senderEmail: sender.email,
      receiverId: target.user.id,
      subject,
      body,
      createdAt,
      toRecipients,
      ccRecipients,
      bccRecipients,
    });

    if (existingEmail) {
      continue;
    }

    const attachments = await saveIncomingAttachments(parsed.attachments, target.user.id, message.uid);
    const imported = await prisma.email.create({
      data: {
        subject,
        body,
        attachments: JSON.stringify(attachments),
        toRecipients: JSON.stringify(toRecipients),
        ccRecipients: JSON.stringify(ccRecipients),
        bccRecipients: JSON.stringify(bccRecipients),
        senderId: sender.id,
        receiverId: target.user.id,
        folder: "inbox",
        createdAt,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        receiver: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    global.io?.to(`user:${target.user.id}`).emit("newEmail", {
      ...imported,
      attachments,
      toRecipients,
      ccRecipients,
      bccRecipients,
    });
  }
};

const syncMailbox = async () => {
  if (syncInProgress) {
    return { skipped: true, reason: "sync-already-running" };
  }

  const config = getImapConfig();

  if (!config.host || !config.user || !config.pass || !config.ownerEmail) {
    return { skipped: true, reason: "imap-not-configured" };
  }

  syncInProgress = true;
  lastSyncStartedAt = new Date().toISOString();
  lastSyncError = null;
  const client = new ImapFlow({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
    logger: false,
  });

  try {
    const owner = await ensureMailboxOwner(config.ownerEmail);
    const adminUser = await findDefaultAdminUser();

    if (!owner) {
      console.warn(`[mail-sync] mailbox owner ${config.ownerEmail} not found in app users`);
    }

    if (!adminUser) {
      console.warn("[mail-sync] default admin user not found in app users");
    }

    await client.connect();
    const lock = await client.getMailboxLock("INBOX");

    try {
      const state = await readSyncState();

      if (!state.lastUid) {
        if (config.initialSyncMode === "latest") {
          const bootstrapUid = Math.max(0, Number(client.mailbox.uidNext || 1) - 1);
          await writeSyncState({
            lastUid: bootstrapUid,
            initialSyncMode: config.initialSyncMode,
            lastSyncedAt: new Date().toISOString(),
          });
          lastSyncFinishedAt = new Date().toISOString();
          return {
            importedCount: 0,
            lastUid: bootstrapUid,
            mode: config.initialSyncMode,
          };
        }

        await writeSyncState({
          lastUid: 0,
          initialSyncMode: config.initialSyncMode,
        });
      }

      const latestState = await readSyncState();
      const range = `${latestState.lastUid + 1}:*`;
      let newestUid = latestState.lastUid;
      let importedCount = 0;

      for await (const message of client.fetch(range, {
        uid: true,
        source: true,
        internalDate: true,
      })) {
        await importMessage({ message, owner, adminUser });
        newestUid = Math.max(newestUid, message.uid || newestUid);
        importedCount += 1;
      }

      await updateSyncState((currentState) => ({
        ...currentState,
        lastUid: newestUid,
        initialSyncMode: currentState.initialSyncMode || config.initialSyncMode,
        lastSyncedAt: new Date().toISOString(),
      }));
      lastSyncFinishedAt = new Date().toISOString();

      return {
        importedCount,
        lastUid: newestUid,
        mode: latestState.initialSyncMode || config.initialSyncMode,
      };
    } finally {
      lock.release();
    }
  } catch (error) {
    lastSyncError = error.message;
    console.error("[mail-sync] sync failed:", error.message);
    throw error;
  } finally {
    try {
      await client.logout();
    } catch {}

    syncInProgress = false;
  }
};

export const triggerMailboxSync = async () => syncMailbox();

export const getMailboxSyncStatus = async () => {
  const config = getImapConfig();
  const state = await readSyncState();

  return {
    configured: Boolean(config.host && config.user && config.pass && config.ownerEmail),
    inProgress: syncInProgress,
    ownerEmail: config.ownerEmail || null,
    mailboxUser: config.user || null,
    pollIntervalMs: config.pollIntervalMs,
    initialSyncMode: state.initialSyncMode || config.initialSyncMode,
    lastUid: Number.isFinite(state.lastUid) ? state.lastUid : 0,
    lastSyncedAt: state.lastSyncedAt || lastSyncFinishedAt,
    lastSyncStartedAt,
    lastSyncFinishedAt,
    lastSyncError,
  };
};

export const startMailboxSync = () => {
  const config = getImapConfig();

  if (!config.host || !config.user || !config.pass) {
    console.log("[mail-sync] IMAP not configured, skipping external inbox sync");
    return;
  }

  if (syncTimer) {
    clearInterval(syncTimer);
  }

  syncMailbox().catch((error) => {
    console.error("[mail-sync] initial sync failed:", error.message);
  });

  syncTimer = setInterval(() => {
    syncMailbox().catch((error) => {
      console.error("[mail-sync] scheduled sync failed:", error.message);
    });
  }, config.pollIntervalMs);

  console.log(`[mail-sync] external inbox sync started for ${config.user}`);
};
