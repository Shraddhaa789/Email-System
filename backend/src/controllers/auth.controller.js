import prisma from "../config/db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { serializeUser } from "../utils/user.utils.js";
import { getAdminPreferences } from "../utils/adminPreferences.js";

const DEFAULT_ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@aksentt.app";
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const DEFAULT_ADMIN_NAME = process.env.ADMIN_NAME || "Aksentt Admin";

const createToken = (user) =>
  jwt.sign({ id: user.id, email: user.email, accountRole: user.accountRole }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

const ensureDefaultAdminExists = async () => {
  const existingAdmin = await prisma.user.findUnique({
    where: { email: DEFAULT_ADMIN_EMAIL },
  });

  if (existingAdmin) {
    if (existingAdmin.accountRole === "admin") {
      return existingAdmin;
    }

    return prisma.user.update({
      where: { id: existingAdmin.id },
      data: {
        accountRole: "admin",
        userType: "member",
        name: existingAdmin.name || DEFAULT_ADMIN_NAME,
        role: existingAdmin.role || "Administrator",
        team: existingAdmin.team || "Admin",
        workingHours: existingAdmin.workingHours || "9:00 AM - 6:00 PM",
        location: existingAdmin.location || "HQ",
      },
    });
  }

  const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);

  return prisma.user.create({
    data: {
      email: DEFAULT_ADMIN_EMAIL,
      password: hashedPassword,
      name: DEFAULT_ADMIN_NAME,
      accountRole: "admin",
      userType: "member",
      role: "Administrator",
      team: "Admin",
      workingHours: "9:00 AM - 6:00 PM",
      location: "HQ",
    },
  });
};

const upsertDemoUser = async ({ email, password, name }) => {
  const hashedPassword = await bcrypt.hash(password, 10);

  return prisma.user.upsert({
    where: { email },
    update: {
      name,
      accountRole: "user",
      userType: "member",
      role: "Product Designer",
      team: "Workspace",
      workingHours: "9:30 AM - 6:30 PM",
      location: "Pune HQ",
      password: hashedPassword,
    },
    create: {
      email,
      name,
      accountRole: "user",
      userType: "member",
      role: "Product Designer",
      team: "Workspace",
      workingHours: "9:30 AM - 6:30 PM",
      location: "Pune HQ",
      password: hashedPassword,
    },
  });
};

const ensureDemoEmail = async ({
  subject,
  body,
  senderId,
  receiverId,
  folder,
  isStarred = false,
  createdAt,
}) => {
  const existingEmail = await prisma.email.findFirst({
    where: {
      subject,
      body,
      senderId,
      receiverId,
      folder,
    },
  });

  if (existingEmail) {
    return existingEmail;
  }

  return prisma.email.create({
    data: {
      subject,
      body,
      senderId,
      receiverId,
      folder,
      isStarred,
      createdAt,
    },
  });
};

export const register = async (req, res) => {
  try {
    await ensureDefaultAdminExists();

    const { email, password, name } = req.body;

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        accountRole: "user",
        userType: "member",
        role: "Team member",
        team: "Workspace",
        workingHours: "9:00 AM - 6:00 PM",
        location: "Office",
      },
    });

    res.json({ message: "User registered", user: serializeUser(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const login = async (req, res) => {
  try {
    await ensureDefaultAdminExists();

    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid password" });
    }

    res.json({
      message: "Login successful",
      token: createToken(user),
      user: serializeUser(user),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user || user.deletedAt) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ user: serializeUser(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const listDirectory = async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        deletedAt: null,
        accountRole: {
          not: "admin",
        },
      },
      orderBy: [
        { role: "asc" },
        { name: "asc" },
        { email: "asc" },
      ],
    });

    res.json(users.map(serializeUser));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { name, role, team, workingHours, location } = req.body;

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        name,
        role,
        team,
        workingHours,
        location,
      },
    });

    res.json({
      message: "Profile updated",
      user: serializeUser(user),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current and new password are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user || user.deletedAt) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashedPassword },
    });

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({ message: "Email and new password are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || user.deletedAt) {
      return res.status(404).json({ message: "User not found" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword },
    });

    res.json({ message: "Password reset successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getMailPreferences = async (_req, res) => {
  try {
    const preferences = await getAdminPreferences();
    res.json(preferences);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const seedDemoWorkspace = async (_req, res) => {
  try {
    const adminUser = await ensureDefaultAdminExists();
    const demoPassword = "demo123";
    const [shraddha, maya, rohan, azure] = await Promise.all([
      upsertDemoUser({
        email: "user@aksentt.app",
        password: demoPassword,
        name: "Aksentt User",
      }),
      upsertDemoUser({
        email: "maya@northstar.design",
        password: demoPassword,
        name: "Maya Patel",
      }),
      upsertDemoUser({
        email: "rohan@acmeops.io",
        password: demoPassword,
        name: "Rohan Singh",
      }),
      upsertDemoUser({
        email: "billing@microsoft.com",
        password: demoPassword,
        name: "Azure Billing",
      }),
    ]);

    const demoEmails = [
      {
        subject: "Sprint review feedback and delivery notes",
        body:
          "Hi team,\n\nThe sprint review went smoothly and the client was especially positive about the new command palette and inbox density controls.\n\nI added a few notes for follow-up:\n\n1. Tighten the mobile reading pane spacing.\n2. Make the unread state more visible in the thread list.\n3. Add quick actions for archive and flag in the preview header.\n\nIf we align on those three items, I think the current direction is strong enough to move into implementation.\n\nThanks,\n\nMaya",
        senderId: maya.id,
        receiverId: shraddha.id,
        folder: "inbox",
        isStarred: true,
        createdAt: new Date("2026-04-06T09:42:00"),
      },
      {
        subject: "Calendar invite: launch planning",
        body:
          "Sending over the Thursday planning block. Please bring rollout risks and dependency updates so we can lock the launch timeline before Friday.",
        senderId: rohan.id,
        receiverId: shraddha.id,
        folder: "inbox",
        createdAt: new Date("2026-04-05T17:20:00"),
      },
      {
        subject: "Your March cloud usage summary",
        body:
          "Usage has increased 12% month-over-month. The attached report breaks spend down by resource group and highlights the new analytics workloads added last week.",
        senderId: azure.id,
        receiverId: shraddha.id,
        folder: "inbox",
        createdAt: new Date("2026-04-05T10:15:00"),
      },
      {
        subject: "Follow-up: sprint review recap",
        body:
          "Hi Maya,\n\nThanks again for the review notes. I am consolidating the final implementation plan today and will send the updated milestones after the design handoff.\n\nBest,\n\nShraddha",
        senderId: shraddha.id,
        receiverId: maya.id,
        folder: "sent",
        createdAt: new Date("2026-04-06T09:42:00"),
      },
      {
        subject: "Draft: onboarding mail polish notes",
        body:
          "Need to rewrite the onboarding follow-up before sending.\n\n- tighten the first paragraph\n- mention mobile spacing fix\n- add rollout timeline",
        senderId: shraddha.id,
        receiverId: shraddha.id,
        folder: "draft",
        createdAt: new Date("2026-04-04T15:10:00"),
      },
      {
        subject: "Archived: design system decisions",
        body:
          "Capturing the resolved decisions from the design systems sync so we can refer back later without keeping the thread in the active inbox.",
        senderId: maya.id,
        receiverId: shraddha.id,
        folder: "archive",
        createdAt: new Date("2026-04-03T11:25:00"),
      },
    ];

    for (const email of demoEmails) {
      await ensureDemoEmail(email);
    }

    res.json({
      message: "Demo workspace ready",
      token: createToken(shraddha),
      user: serializeUser(shraddha),
      adminCredentials: {
        email: adminUser.email,
        password: DEFAULT_ADMIN_PASSWORD,
      },
      credentials: {
        email: shraddha.email,
        password: demoPassword,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
