import fs from "fs/promises";
import path from "path";
import bcrypt from "bcrypt";
import crypto from "crypto";
import prisma from "../config/db.js";
import { buildInboundDedupKey } from "../utils/emailDedup.js";

const uploadsRoot = path.join(process.cwd(), "uploads");
const DEFAULT_ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@workspace.app";

const normalizeEmail = (value = "") => value.trim().toLowerCase();

const uniqueRecipients = (entries = []) =>
  [
    ...new Map(
      entries
        .filter((entry) => entry?.email)
        .map((entry) => [normalizeEmail(entry.email), { ...entry, email: normalizeEmail(entry.email) }])
    ).values(),
  ];

const normalizeAddress = (entry) => {
  if (!entry) {
    return null;
  }

  if (typeof entry === "string") {
    const email = normalizeEmail(entry);

    if (!email) {
      return null;
    }

    return {
      name: email.split("@")[0],
      email,
    };
  }

  const email = normalizeEmail(entry.email || entry.address || "");

  if (!email) {
    return null;
  }

  return {
    name: entry.name?.trim() || email.split("@")[0],
    email,
  };
};

const normalizeAddressList = (entries = []) =>
  uniqueRecipients(
    (Array.isArray(entries) ? entries : [entries]).map(normalizeAddress).filter(Boolean)
  );

const normalizeAttachment = (attachment) => {
  if (!attachment?.filename || !attachment?.contentBase64) {
    return null;
  }

  return {
    filename: attachment.filename,
    contentType: attachment.contentType || "application/octet-stream",
    contentBase64: attachment.contentBase64,
    size: attachment.size || Buffer.byteLength(attachment.contentBase64, "base64"),
  };
};

const normalizeAttachmentList = (attachments = []) =>
  (Array.isArray(attachments) ? attachments : [attachments])
    .map(normalizeAttachment)
    .filter(Boolean);

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

const ensureMailboxOwner = async () => {
  const ownerEmail =
    process.env.MAILBOX_OWNER_APP_EMAIL?.trim() ||
    process.env.IMAP_USER?.trim() ||
    process.env.SMTP_USER?.trim();

  if (!ownerEmail) {
    return null;
  }

  return prisma.user.findUnique({
    where: { email: ownerEmail },
  });
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

const findOrCreateExternalContact = async ({ email, name }) => {
  const normalizedEmail = normalizeEmail(email);

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

const findUsersByEmails = async (emails = []) => {
  const normalized = [...new Set(emails.map(normalizeEmail).filter(Boolean))];

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

const saveIncomingAttachments = async (attachments = [], ownerId, messageKey) => {
  if (!ownerId || attachments.length === 0) {
    return [];
  }

  const targetDir = path.join(uploadsRoot, ownerId);
  await fs.mkdir(targetDir, { recursive: true });

  const saved = [];

  for (const attachment of attachments) {
    const safeName = attachment.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storedName = `${Date.now()}-${messageKey}-${safeName}`;
    const absolutePath = path.join(targetDir, storedName);

    await fs.writeFile(absolutePath, Buffer.from(attachment.contentBase64, "base64"));

    saved.push({
      id: storedName,
      name: attachment.filename,
      storedName,
      mimeType: attachment.contentType,
      size: attachment.size,
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

export const storeInboundEmail = async ({
  from,
  to = [],
  cc = [],
  bcc = [],
  subject = "",
  text = "",
  html = "",
  attachments = [],
  receivedAt,
  messageId,
}) => {
  const fromAddress = normalizeAddress(from);

  if (!fromAddress?.email) {
    throw new Error("Inbound email is missing a valid sender address");
  }

  const sender = await findOrCreateExternalContact(fromAddress);
  const toRecipients = normalizeAddressList(to);
  const ccRecipients = normalizeAddressList(cc);
  const bccRecipients = normalizeAddressList(bcc);
  const body = text?.trim() || html?.toString() || "";
  const attachmentList = normalizeAttachmentList(attachments);
  const createdAt = receivedAt ? new Date(receivedAt) : new Date();
  const toUsers = await findUsersByEmails(toRecipients.map((entry) => entry.email));
  const owner = await ensureMailboxOwner();
  const adminUser = await findDefaultAdminUser();
  const mailboxUserEmail =
    process.env.IMAP_USER?.trim() ||
    process.env.SMTP_USER?.trim() ||
    process.env.MAILBOX_OWNER_APP_EMAIL?.trim();

  const targets = [
    ...new Map(toUsers.map((user) => [user.id, user])).values(),
  ];

  // The mailbox owner always receives all inbound emails,
  // regardless of what the To header says.
  if (owner?.id) {
    targets.push(owner);
  }

  // Deduplicate targets by user id
  const uniqueTargetMap = new Map(targets.map((user) => [user.id, user]));
  const uniqueTargets = [...uniqueTargetMap.values()];

  if (uniqueTargets.length === 0 && owner) {
    uniqueTargets.push(owner);
  } else if (uniqueTargets.length === 0 && adminUser) {
    uniqueTargets.push(adminUser);
  }

  if (uniqueTargets.length === 0) {
    throw new Error("No target mailbox user found for inbound email");
  }

  const records = [];
  const messageKey = (messageId || crypto.randomUUID()).replace(/[^a-zA-Z0-9._-]/g, "_");

  for (const target of uniqueTargets) {
    const normalizedSubject = subject.trim() || "(no subject)";
    const existingEmail = await findExistingInboundEmail({
      senderId: sender.id,
      senderEmail: sender.email,
      receiverId: target.id,
      subject: normalizedSubject,
      body,
      createdAt,
      toRecipients,
      ccRecipients,
      bccRecipients,
    });

    if (existingEmail) {
      const serializedExisting = {
        ...existingEmail,
        attachments: JSON.parse(existingEmail.attachments || "[]"),
        toRecipients: JSON.parse(existingEmail.toRecipients || "[]"),
        ccRecipients: JSON.parse(existingEmail.ccRecipients || "[]"),
        bccRecipients: JSON.parse(existingEmail.bccRecipients || "[]"),
      };
      records.push(serializedExisting);
      continue;
    }

    const savedAttachments = await saveIncomingAttachments(
      attachmentList,
      target.id,
      messageKey
    );

    const email = await prisma.email.create({
      data: {
        subject: normalizedSubject,
        body,
        attachments: JSON.stringify(savedAttachments),
        toRecipients: JSON.stringify(toRecipients),
        ccRecipients: JSON.stringify(ccRecipients),
        bccRecipients: JSON.stringify(bccRecipients),
        senderId: sender.id,
        receiverId: target.id,
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

    const serialized = {
      ...email,
      attachments: savedAttachments,
      toRecipients,
      ccRecipients,
      bccRecipients,
    };

    global.io?.to(`user:${target.id}`).emit("newEmail", serialized);
    records.push(serialized);
  }

  return records;
};
