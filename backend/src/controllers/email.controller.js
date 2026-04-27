import fs from "fs/promises";
import path from "path";
import prisma from "../config/db.js";
import { buildGroupEmail, getPrimaryGroupDomain } from "../utils/group.utils.js";
import { getAdminPreferences } from "../utils/adminPreferences.js";
import { filterDuplicateEmails } from "../utils/emailDedup.js";
import { isSmtpConfigured, sendExternalEmail } from "../services/smtp.service.js";
import {
  getMailboxSyncStatus,
  triggerMailboxSync,
} from "../services/mailbox-sync.service.js";
import { storeInboundEmail } from "../services/inbound-email.service.js";

const uploadsRoot = path.join(process.cwd(), "uploads");

const emailDetails = {
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
};

const parseAttachments = (value) => {
  if (!value) {
    return [];
  }

  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
};

const parseRecipients = (value) => {
  if (!value) {
    return [];
  }

  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
};

const serializeEmail = (email) => ({
  ...email,
  attachments: parseAttachments(email.attachments),
  toRecipients: parseRecipients(email.toRecipients),
  ccRecipients: parseRecipients(email.ccRecipients),
  bccRecipients: parseRecipients(email.bccRecipients),
});

const serializeEmails = (emails) => emails.map(serializeEmail);
const serializeUniqueEmails = (emails) => filterDuplicateEmails(serializeEmails(emails));

const sanitizeFileName = (name) =>
  name.replace(/[^a-zA-Z0-9._-]/g, "_");

const isEmailAddress = (value = "") => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const getAttachmentsSizeBytes = (attachments = []) =>
  attachments.reduce((total, attachment) => total + (attachment?.size || 0), 0);

const splitRecipientInput = (value = "") =>
  value
    .split(/[,;\n]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);

const buildRecipientList = (users) =>
  users.map((user) => ({
    id: user.id,
    name: user.name || user.email.split("@")[0],
    email: user.email,
  }));

const buildGroupRecipientList = (groups) =>
  groups.map((group) => ({
    id: group.id,
    name: group.name,
    email: group.email,
    type: "group",
  }));

const buildExternalRecipientList = (emails) =>
  emails.map((email) => ({
    id: `external:${email.toLowerCase()}`,
    name: email.split("@")[0],
    email,
    type: "external",
  }));

const groupInclude = {
  memberships: {
    include: {
      user: true,
    },
  },
};

const getGroupMailDomain = async () => {
  const domains = await prisma.mailDomain.findMany({
    orderBy: { createdAt: "asc" },
    select: { domain: true },
  });

  return getPrimaryGroupDomain(domains);
};


const matchesGroupEntry = (entry, group) => {
  const normalizedEntry = entry.trim().toLowerCase();

  return (
    normalizedEntry === group.name.toLowerCase() ||
    normalizedEntry === group.slug.toLowerCase() ||
    normalizedEntry === group.email.toLowerCase()
  );
};

const resolveRecipientTargets = async (entries = []) => {
  const normalizedEntries = [...new Set(entries.map((entry) => entry.trim()).filter(Boolean))];

  if (normalizedEntries.length === 0) {
    return { users: [], groups: [], externalEmails: [] };
  }

  const users = await prisma.user.findMany({
    where: {
      email: {
        in: normalizedEntries,
      },
      deletedAt: null,
    },
  });

  // All users found in the database are treated as internal recipients
  // so they receive inbox copies of the email.
  const internalUsers = users;

  const matchedEmails = new Set(users.map((user) => user.email.toLowerCase()));
  const remainingEntries = normalizedEntries.filter(
    (entry) => !matchedEmails.has(entry.toLowerCase())
  );

  const groupMailDomain = await getGroupMailDomain();
  const groups = remainingEntries.length
    ? (
        await prisma.userGroup.findMany({
          include: {
            memberships: {
              include: {
                user: true,
              },
            },
          },
        })
      )
        .map((group) => ({
          ...group,
          email: buildGroupEmail(group.slug, groupMailDomain),
        }))
        .filter((group) =>
          remainingEntries.some((entry) => matchesGroupEntry(entry, group))
        )
    : [];

  const unresolvedEntries = remainingEntries.filter(
    (entry) => !groups.some((group) => matchesGroupEntry(entry, group))
  );

  const externalEmails = [...new Set(unresolvedEntries.filter((entry) => isEmailAddress(entry)))];
  const invalidEntries = unresolvedEntries.filter((entry) => !isEmailAddress(entry));

  if (invalidEntries.length > 0) {
    throw new Error("One or more recipients were not found");
  }

  const expandedUsers = groups.flatMap((group) =>
    group.memberships
      .map((membership) => membership.user)
      .filter((user) => !user.deletedAt)
  );

  const uniqueUsers = [...new Map([...internalUsers, ...expandedUsers].map((user) => [user.id, user])).values()];

  return { users: uniqueUsers, groups, externalEmails };
};

export const getRecipientSuggestions = async (req, res) => {
  try {
    const query = (req.query.q || "").trim().toLowerCase();
    const groupMailDomain = await getGroupMailDomain();
    const [groups, users] = await Promise.all([
      prisma.userGroup.findMany({
        include: groupInclude,
        orderBy: { name: "asc" },
        take: query ? 20 : 8,
      }),
      prisma.user.findMany({
        where: {
          deletedAt: null,
        },
        orderBy: [{ name: "asc" }, { email: "asc" }],
        take: query ? 20 : 8,
      }),
    ]);

    const groupSuggestions = groups
      .map((group) => ({
        id: group.id,
        type: "group",
        name: group.name,
        slug: group.slug,
        email: buildGroupEmail(group.slug, groupMailDomain),
        memberCount: group.memberships.length,
      }))
      .filter((group) => {
        if (!query) {
          return true;
        }

        return [group.name, group.slug, group.email]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(query));
      })
      .slice(0, 8);

    const userSuggestions = users
      .map((user) => ({
        id: user.id,
        type: "user",
        name: user.name || user.email.split("@")[0],
        email: user.email,
      }))
      .filter((user) => {
        if (!query) {
          return true;
        }

        return [user.name, user.email]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(query));
      })
      .slice(0, 8);

    const suggestions = [...userSuggestions, ...groupSuggestions]
      .sort((left, right) => left.name.localeCompare(right.name))
      .slice(0, 8);

    res.json(suggestions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const ensureAttachmentLimit = async (attachments = []) => {
  const preferences = await getAdminPreferences();
  const attachmentLimitBytes = preferences.attachmentLimitMb * 1024 * 1024;

  if (getAttachmentsSizeBytes(attachments) > attachmentLimitBytes) {
    throw new Error(`Attachments exceed the ${preferences.attachmentLimitMb} MB limit`);
  }
};

const saveAttachments = async (attachments = [], userId) => {
  if (!Array.isArray(attachments) || attachments.length === 0) {
    return [];
  }

  await ensureAttachmentLimit(attachments);

  const targetDir = path.join(uploadsRoot, userId);
  await fs.mkdir(targetDir, { recursive: true });

  const saved = [];

  for (const attachment of attachments) {
    if (!attachment?.name || !attachment?.dataUrl) {
      continue;
    }

    const match = attachment.dataUrl.match(/^data:(.+);base64,(.+)$/);
    if (!match) {
      continue;
    }

    const [, mimeType, base64Data] = match;
    const safeName = sanitizeFileName(attachment.name);
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${safeName}`;
    const absolutePath = path.join(targetDir, fileName);

    await fs.writeFile(absolutePath, Buffer.from(base64Data, "base64"));

    saved.push({
      id: fileName,
      name: attachment.name,
      storedName: fileName,
      mimeType,
      size: attachment.size || Buffer.byteLength(base64Data, "base64"),
      relativePath: path.join(userId, fileName).replaceAll("\\", "/"),
    });
  }

  return saved;
};

const findOwnedEmail = (id, userId) =>
  prisma.email.findFirst({
    where: {
      id,
      OR: [{ receiverId: userId }, { senderId: userId }],
    },
  });

const allowedFolders = new Set(["inbox", "sent", "draft", "archive", "trash"]);
const trashRetentionCutoff = () => {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return date;
};

export const sendEmail = async (req, res) => {
  const { to, cc = "", bcc = "", subject, body, attachments = [] } = req.body;

  try {
    const toEmails = splitRecipientInput(to);
    const ccEmails = splitRecipientInput(cc);
    const bccEmails = splitRecipientInput(bcc);

    if (toEmails.length === 0) {
      return res.status(400).json({ message: "At least one recipient is required" });
    }

    const [
      { users: toUsers, groups: toGroups, externalEmails: toExternalEmails },
      { users: ccUsers, groups: ccGroups, externalEmails: ccExternalEmails },
      { users: bccUsers, groups: bccGroups, externalEmails: bccExternalEmails },
    ] =
      await Promise.all([
        resolveRecipientTargets(toEmails),
        resolveRecipientTargets(ccEmails),
        resolveRecipientTargets(bccEmails),
      ]);

    if (toUsers.length === 0 && toGroups.length === 0 && toExternalEmails.length === 0) {
      return res.status(400).json({ message: "At least one valid recipient is required" });
    }

    const toList = [
      ...buildRecipientList(toUsers),
      ...buildGroupRecipientList(toGroups),
      ...buildExternalRecipientList(toExternalEmails),
    ];
    const ccList = [
      ...buildRecipientList(ccUsers),
      ...buildGroupRecipientList(ccGroups),
      ...buildExternalRecipientList(ccExternalEmails),
    ];
    const bccList = [
      ...buildRecipientList(bccUsers),
      ...buildGroupRecipientList(bccGroups),
      ...buildExternalRecipientList(bccExternalEmails),
    ];

    const hasExternalRecipients =
      toExternalEmails.length > 0 || ccExternalEmails.length > 0 || bccExternalEmails.length > 0;

    await ensureAttachmentLimit(attachments);

    if (hasExternalRecipients) {
      if (!isSmtpConfigured()) {
        return res.status(500).json({
          message: "SMTP is not configured for external email sending",
        });
      }

      await sendExternalEmail({
        fromName: req.user.name || req.user.email?.split("@")[0] || "",
        replyTo: req.user.email,
        to: toExternalEmails,
        cc: ccExternalEmails,
        bcc: bccExternalEmails,
        subject,
        body,
        attachments,
      });
    }

    const savedAttachments = await saveAttachments(attachments, req.user.id);

    // Sent mail
    const sentMail = await prisma.email.create({
      data: {
        subject,
        body,
        attachments: JSON.stringify(savedAttachments),
        toRecipients: JSON.stringify(toList),
        ccRecipients: JSON.stringify(ccList),
        bccRecipients: JSON.stringify(bccList),
        senderId: req.user.id,
        receiverId: toUsers[0]?.id || req.user.id,
        folder: "sent",
      },
      include: emailDetails,
    });

    const inboxMailRecords = [];

    for (const receiver of toUsers) {
      inboxMailRecords.push(
        prisma.email.create({
          data: {
            subject,
            body,
            attachments: JSON.stringify(savedAttachments),
            toRecipients: JSON.stringify(toList),
            ccRecipients: JSON.stringify(ccList),
            bccRecipients: JSON.stringify([]),
            senderId: req.user.id,
            receiverId: receiver.id,
            folder: "inbox",
          },
          include: emailDetails,
        })
      );
    }

    for (const receiver of ccUsers) {
      inboxMailRecords.push(
        prisma.email.create({
          data: {
            subject,
            body,
            attachments: JSON.stringify(savedAttachments),
            toRecipients: JSON.stringify(toList),
            ccRecipients: JSON.stringify(ccList),
            bccRecipients: JSON.stringify([]),
            senderId: req.user.id,
            receiverId: receiver.id,
            folder: "inbox",
          },
          include: emailDetails,
        })
      );
    }

    for (const receiver of bccUsers) {
      inboxMailRecords.push(
        prisma.email.create({
          data: {
            subject,
            body,
            attachments: JSON.stringify(savedAttachments),
            toRecipients: JSON.stringify(toList),
            ccRecipients: JSON.stringify(ccList),
            bccRecipients: JSON.stringify(
              buildRecipientList([receiver])
            ),
            senderId: req.user.id,
            receiverId: receiver.id,
            folder: "inbox",
          },
          include: emailDetails,
        })
      );
    }

    const inboxMails = await Promise.all(inboxMailRecords);

    inboxMails.forEach((inboxMail) => {
      global.io?.to(`user:${inboxMail.receiverId}`).emit("newEmail", serializeEmail(inboxMail));
    });

    res.json(serializeEmail(sentMail));
  } catch (err) {
    if (err.message === "One or more recipients were not found") {
      return res.status(404).json({ message: err.message });
    }

    res.status(500).json({ error: err.message, message: err.message });
  }
};

export const saveDraft = async (req, res) => {
  const { to, cc = "", bcc = "", subject = "", body = "", attachments = [] } = req.body;

  try {
    let receiverId = req.user.id;

    if (to?.trim()) {
      const receiver = await prisma.user.findUnique({
        where: { email: to.trim() },
      });

      receiverId = receiver?.deletedAt ? req.user.id : receiver?.id || req.user.id;
    }

    const savedAttachments = await saveAttachments(attachments, req.user.id);

    const draft = await prisma.email.create({
      data: {
        subject: subject.trim() || "Untitled draft",
        body,
        attachments: JSON.stringify(savedAttachments),
        toRecipients: JSON.stringify(splitRecipientInput(to).map((email) => ({ email }))),
        ccRecipients: JSON.stringify(splitRecipientInput(cc).map((email) => ({ email }))),
        bccRecipients: JSON.stringify(splitRecipientInput(bcc).map((email) => ({ email }))),
        senderId: req.user.id,
        receiverId,
        folder: "draft",
      },
      include: emailDetails,
    });

    res.json(serializeEmail(draft));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getInbox = async (req, res) => {
  try {
    const emails = await prisma.email.findMany({
      where: {
        receiverId: req.user.id,
        folder: "inbox",
      },
      include: emailDetails,
      orderBy: { createdAt: "desc" },
    });

    res.json(serializeUniqueEmails(emails));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getMailboxStatus = async (_req, res) => {
  try {
    const status = await getMailboxSyncStatus();
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const syncMailboxNow = async (_req, res) => {
  try {
    const result = await triggerMailboxSync();
    const status = await getMailboxSyncStatus();

    res.json({
      ...status,
      result,
    });
  } catch (err) {
    res.status(500).json({ error: err.message, message: "Mailbox sync failed" });
  }
};

export const receiveInboundEmail = async (req, res) => {
  try {
    const configuredSecret = process.env.INBOUND_MAIL_SECRET?.trim();
    const providedSecret =
      req.headers["x-inbound-mail-secret"]?.toString().trim() ||
      req.body?.secret?.toString().trim();

    if (configuredSecret && providedSecret !== configuredSecret) {
      return res.status(401).json({ message: "Invalid inbound mail secret" });
    }

    const records = await storeInboundEmail({
      from: req.body?.from,
      to: req.body?.to,
      cc: req.body?.cc,
      bcc: req.body?.bcc,
      subject: req.body?.subject,
      text: req.body?.text,
      html: req.body?.html,
      attachments: req.body?.attachments,
      receivedAt: req.body?.receivedAt,
      messageId: req.body?.messageId,
    });

    res.status(202).json({
      message: "Inbound email accepted",
      importedCount: records.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message, message: "Inbound email import failed" });
  }
};

export const getSent = async (req, res) => {
  try {
    const emails = await prisma.email.findMany({
      where: {
        senderId: req.user.id,
        folder: "sent",
      },
      include: emailDetails,
      orderBy: { createdAt: "desc" },
    });

    res.json(serializeEmails(emails));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getDrafts = async (req, res) => {
  try {
    const emails = await prisma.email.findMany({
      where: {
        senderId: req.user.id,
        folder: "draft",
      },
      include: emailDetails,
      orderBy: { createdAt: "desc" },
    });

    res.json(serializeEmails(emails));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getArchive = async (req, res) => {
  try {
    const emails = await prisma.email.findMany({
      where: {
        folder: "archive",
        OR: [{ senderId: req.user.id }, { receiverId: req.user.id }],
      },
      include: emailDetails,
      orderBy: { createdAt: "desc" },
    });

    res.json(serializeEmails(emails));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getTrash = async (req, res) => {
  try {
    const emails = await prisma.email.findMany({
      where: {
        folder: "trash",
        deletedAt: {
          gte: trashRetentionCutoff(),
        },
        OR: [{ senderId: req.user.id }, { receiverId: req.user.id }],
      },
      include: emailDetails,
      orderBy: { deletedAt: "desc" },
    });

    res.json(serializeEmails(emails));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteEmail = async (req, res) => {
  const { id } = req.params;

  try {
    const email = await findOwnedEmail(id, req.user.id);

    if (!email) {
      return res.status(404).json({ message: "Email not found" });
    }

    const updatedEmail = await prisma.email.update({
      where: { id },
      data: {
        folder: "trash",
        deletedAt: new Date(),
      },
      include: emailDetails,
    });

    res.json(serializeEmail(updatedEmail));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const starEmail = async (req, res) => {
  const { id } = req.params;

  try {
    const email = await findOwnedEmail(id, req.user.id);

    if (!email) {
      return res.status(404).json({ message: "Email not found" });
    }

    const updatedEmail = await prisma.email.update({
      where: { id },
      data: { isStarred: !email.isStarred },
      include: emailDetails,
    });

    res.json(serializeEmail(updatedEmail));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const pinEmail = async (req, res) => {
  const { id } = req.params;

  try {
    const email = await findOwnedEmail(id, req.user.id);

    if (!email) {
      return res.status(404).json({ message: "Email not found" });
    }

    const updatedEmail = await prisma.email.update({
      where: { id },
      data: { isPinned: !email.isPinned },
      include: emailDetails,
    });

    res.json(serializeEmail(updatedEmail));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const archiveEmail = async (req, res) => {
  const { id } = req.params;

  try {
    const email = await findOwnedEmail(id, req.user.id);

    if (!email) {
      return res.status(404).json({ message: "Email not found" });
    }

    const updatedEmail = await prisma.email.update({
      where: { id },
      data: {
        folder: "archive",
        deletedAt: null,
      },
      include: emailDetails,
    });

    res.json(serializeEmail(updatedEmail));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const moveEmail = async (req, res) => {
  const { id } = req.params;
  const { folder } = req.body;

  try {
    if (!allowedFolders.has(folder)) {
      return res.status(400).json({ message: "Invalid folder" });
    }

    const email = await findOwnedEmail(id, req.user.id);

    if (!email) {
      return res.status(404).json({ message: "Email not found" });
    }

    const updatedEmail = await prisma.email.update({
      where: { id },
      data: {
        folder,
        deletedAt: folder === "trash" ? new Date() : null,
      },
      include: emailDetails,
    });

    res.json(serializeEmail(updatedEmail));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const toggleRead = async (req, res) => {
  const { id } = req.params;

  try {
    const email = await findOwnedEmail(id, req.user.id);

    if (!email) {
      return res.status(404).json({ message: "Email not found" });
    }

    const updatedEmail = await prisma.email.update({
      where: { id },
      data: { isRead: !email.isRead },
      include: emailDetails,
    });

    res.json(serializeEmail(updatedEmail));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const reportEmail = async (req, res) => {
  const { id } = req.params;

  try {
    const email = await findOwnedEmail(id, req.user.id);

    if (!email) {
      return res.status(404).json({ message: "Email not found" });
    }

    const updatedEmail = await prisma.email.update({
      where: { id },
      data: {
        folder: "archive",
        isStarred: false,
        isRead: true,
        deletedAt: null,
      },
      include: emailDetails,
    });

    res.json(serializeEmail(updatedEmail));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const sweepSenderEmails = async (req, res) => {
  const { id } = req.params;

  try {
    const email = await findOwnedEmail(id, req.user.id);

    if (!email) {
      return res.status(404).json({ message: "Email not found" });
    }

    const result = await prisma.email.updateMany({
      where: {
        senderId: email.senderId,
        receiverId: req.user.id,
        folder: email.folder,
      },
      data: {
        folder: "archive",
        isRead: true,
        deletedAt: null,
      },
    });

    res.json({ count: result.count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const permanentlyDeleteEmail = async (req, res) => {
  const { id } = req.params;

  try {
    const email = await findOwnedEmail(id, req.user.id);

    if (!email || email.folder !== "trash") {
      return res.status(404).json({ message: "Trash email not found" });
    }

    await prisma.email.delete({
      where: { id },
    });

    res.json({ message: "Email permanently deleted", id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const downloadAttachment = async (req, res) => {
  const { id, attachmentId } = req.params;

  try {
    const email = await findOwnedEmail(id, req.user.id);

    if (!email) {
      return res.status(404).json({ message: "Email not found" });
    }

    const attachments = parseAttachments(email.attachments);
    const attachment = attachments.find((item) => item.id === attachmentId);

    if (!attachment) {
      return res.status(404).json({ message: "Attachment not found" });
    }

    const absolutePath = path.join(uploadsRoot, attachment.relativePath);
    res.download(absolutePath, attachment.name);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
