import prisma from "../config/db.js";

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
  const { to, cc = "", bcc = "", subject, body } = req.body;

  try {
    const receiver = await prisma.user.findUnique({
      where: { email: to },
    });

    if (!receiver) {
      return res.status(404).json({ message: "User not found" });
    }

    // Sent mail
    await prisma.email.create({
      data: {
        subject,
        body: [body, cc ? `\n\nCc: ${cc}` : "", bcc ? `\nBcc: ${bcc}` : ""].join(""),
        senderId: req.user.id,
        receiverId: receiver.id,
        folder: "sent",
      },
    });

    // Inbox mail
    const inboxMail = await prisma.email.create({
      data: {
        subject,
        body: [body, cc ? `\n\nCc: ${cc}` : "", bcc ? `\nBcc: ${bcc}` : ""].join(""),
        senderId: req.user.id,
        receiverId: receiver.id,
        folder: "inbox",
      },
      include: emailDetails,
    });

    global.io?.to(`user:${receiver.id}`).emit("newEmail", inboxMail);

    res.json(inboxMail);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const saveDraft = async (req, res) => {
  const { to, cc = "", bcc = "", subject = "", body = "" } = req.body;

  try {
    let receiverId = req.user.id;

    if (to?.trim()) {
      const receiver = await prisma.user.findUnique({
        where: { email: to.trim() },
      });

      receiverId = receiver?.id || req.user.id;
    }

    const draft = await prisma.email.create({
      data: {
        subject: subject.trim() || "Untitled draft",
        body: [body, cc ? `\n\nCc: ${cc}` : "", bcc ? `\nBcc: ${bcc}` : ""].join(""),
        senderId: req.user.id,
        receiverId,
        folder: "draft",
      },
      include: emailDetails,
    });

    res.json(draft);
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

    res.json(emails);
  } catch (err) {
    res.status(500).json({ error: err.message });
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

    res.json(emails);
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

    res.json(emails);
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

    res.json(emails);
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

    res.json(emails);
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

    res.json(updatedEmail);
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

    res.json(updatedEmail);
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

    res.json(updatedEmail);
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

    res.json(updatedEmail);
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

    res.json(updatedEmail);
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

    res.json(updatedEmail);
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

    res.json(updatedEmail);
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
