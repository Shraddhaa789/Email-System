import bcrypt from "bcrypt";
import prisma from "../config/db.js";
import { serializeGroup, serializeUser } from "../utils/user.utils.js";
import { getPrimaryGroupDomain, slugifyGroupName } from "../utils/group.utils.js";
import { getAdminPreferences, saveAdminPreferences } from "../utils/adminPreferences.js";

const THIRTY_DAYS_IN_MS = 30 * 24 * 60 * 60 * 1000;

const formatUserPayload = (body) => ({
  email: body.email?.trim().toLowerCase(),
  name: body.name?.trim() || null,
  role: body.role?.trim() || null,
  team: body.team?.trim() || null,
  workingHours: body.workingHours?.trim() || null,
  location: body.location?.trim() || null,
  userType: body.userType === "guest" ? "guest" : "member",
});

const groupInclude = {
  memberships: {
    include: {
      user: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  },
};

const deletedRetentionCutoff = () => new Date(Date.now() - THIRTY_DAYS_IN_MS);

const purgeExpiredDeletedUsers = async () => {
  const expiredUsers = await prisma.user.findMany({
    where: {
      deletedAt: {
        lt: deletedRetentionCutoff(),
      },
      accountRole: "user",
    },
    select: {
      id: true,
    },
  });

  if (expiredUsers.length === 0) {
    return;
  }

  const userIds = expiredUsers.map((user) => user.id);

  await prisma.$transaction([
    prisma.groupMember.deleteMany({
      where: {
        userId: { in: userIds },
      },
    }),
    prisma.email.deleteMany({
      where: {
        OR: [{ senderId: { in: userIds } }, { receiverId: { in: userIds } }],
      },
    }),
    prisma.user.deleteMany({
      where: {
        id: { in: userIds },
      },
    }),
  ]);
};

const getUsers = () =>
  prisma.user.findMany({
    orderBy: [{ deletedAt: "asc" }, { accountRole: "asc" }, { createdAt: "desc" }],
  });

const normalizeDomain = (value = "") =>
  value.trim().toLowerCase().replace(/^@+/, "");

const getPreferredGroupDomain = async () => {
  const domains = await prisma.mailDomain.findMany({
    orderBy: { createdAt: "asc" },
    select: { domain: true },
  });

  return getPrimaryGroupDomain(domains);
};

const serializeGroupsWithDomain = (groups, mailDomain) =>
  groups.map((group) => serializeGroup({ ...group, mailDomain }));

const ensureManagedDomainEmail = async (email) => {
  const normalizedEmail = email?.trim().toLowerCase();

  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    return {
      valid: false,
      message: "User email must use one of the saved domains",
    };
  }

  const [, domainPart] = normalizedEmail.split("@");
  const domain = normalizeDomain(domainPart);

  const existingDomain = await prisma.mailDomain.findFirst({
    where: { domain },
  });

  if (!existingDomain) {
    return {
      valid: false,
      message: "Email must end with one of the saved domains",
    };
  }

  return {
    valid: true,
    email: normalizedEmail,
  };
};

export const getOverview = async (_req, res) => {
  try {
    await purgeExpiredDeletedUsers();

    const [users, groups, domains] = await Promise.all([
      prisma.user.findMany(),
      prisma.userGroup.findMany({ include: groupInclude }),
      prisma.mailDomain.findMany(),
    ]);
    const groupMailDomain = getPrimaryGroupDomain(domains);

    const activeUsers = users.filter(
      (user) => user.accountRole !== "admin" && !user.deletedAt && user.userType !== "guest"
    );
    const guestUsers = users.filter(
      (user) => user.accountRole !== "admin" && !user.deletedAt && user.userType === "guest"
    );
    const deletedUsers = users.filter(
      (user) =>
        user.accountRole !== "admin" &&
        user.deletedAt &&
        user.deletedAt >= deletedRetentionCutoff()
    );

    const roleMap = activeUsers.reduce((accumulator, user) => {
      const key = user.role || "Unassigned";
      accumulator[key] = (accumulator[key] || 0) + 1;
      return accumulator;
    }, {});

    res.json({
      totals: {
        users: activeUsers.length,
        guests: guestUsers.length,
        deletedUsers: deletedUsers.length,
        groups: groups.length,
        contacts: activeUsers.length + guestUsers.length,
        domains: domains.length,
      },
      topRoles: Object.entries(roleMap)
        .map(([name, count]) => ({ name, count }))
        .sort((left, right) => right.count - left.count)
        .slice(0, 5),
      groups: serializeGroupsWithDomain(groups, groupMailDomain),
      domains,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const listUsers = async (_req, res) => {
  try {
    await purgeExpiredDeletedUsers();
    const users = await getUsers();
    res.json(users.map(serializeUser));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const createUser = async (req, res) => {
  try {
    const { password } = req.body;
    const payload = formatUserPayload(req.body);

    if (!payload.email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const managedEmail = await ensureManagedDomainEmail(payload.email);

    if (!managedEmail.valid) {
      return res.status(400).json({ message: managedEmail.message });
    }

    payload.email = managedEmail.email;

    const existingUser = await prisma.user.findUnique({
      where: { email: payload.email },
    });

    if (existingUser && !existingUser.deletedAt) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = existingUser
      ? await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            ...payload,
            password: hashedPassword,
            accountRole: "user",
            deletedAt: null,
          },
        })
      : await prisma.user.create({
          data: {
            ...payload,
            password: hashedPassword,
            accountRole: "user",
          },
        });

    res.status(201).json({
      message: "User created",
      user: serializeUser(user),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    const payload = formatUserPayload(req.body);

    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (existingUser.accountRole === "admin") {
      return res.status(400).json({ message: "The admin account cannot be edited here" });
    }

    const managedEmail = await ensureManagedDomainEmail(payload.email || existingUser.email);

    if (!managedEmail.valid) {
      return res.status(400).json({ message: managedEmail.message });
    }

    payload.email = managedEmail.email;

    if (payload.email && payload.email !== existingUser.email) {
      const emailInUse = await prisma.user.findUnique({
        where: { email: payload.email },
      });

      if (emailInUse && emailInUse.id !== existingUser.id) {
        return res.status(400).json({ message: "Email is already in use" });
      }
    }

    const data = {
      email: payload.email || existingUser.email,
      name: payload.name,
      role: payload.role,
      team: payload.team,
      workingHours: payload.workingHours,
      location: payload.location,
      userType: payload.userType,
    };

    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }

      data.password = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({
      where: { id },
      data,
    });

    res.json({
      message: "User updated",
      user: serializeUser(user),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.id === id) {
      return res.status(400).json({ message: "You cannot delete your own admin account" });
    }

    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (existingUser.accountRole === "admin") {
      return res.status(400).json({ message: "The admin account cannot be deleted" });
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    res.json({
      message: "User moved to deleted users for 30 days",
      user: serializeUser(user),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const restoreUser = async (req, res) => {
  try {
    const { id } = req.params;

    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser || !existingUser.deletedAt) {
      return res.status(404).json({ message: "Deleted user not found" });
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        deletedAt: null,
      },
    });

    res.json({
      message: "User restored",
      user: serializeUser(user),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const permanentlyDeleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser || !existingUser.deletedAt) {
      return res.status(404).json({ message: "Deleted user not found" });
    }

    await prisma.$transaction([
      prisma.groupMember.deleteMany({
        where: { userId: id },
      }),
      prisma.email.deleteMany({
        where: {
          OR: [{ senderId: id }, { receiverId: id }],
        },
      }),
      prisma.user.delete({
        where: { id },
      }),
    ]);

    res.json({ message: "User permanently deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const listGroups = async (_req, res) => {
  try {
    const groups = await prisma.userGroup.findMany({
      include: groupInclude,
      orderBy: {
        createdAt: "desc",
      },
    });
    const groupMailDomain = await getPreferredGroupDomain();

    res.json(serializeGroupsWithDomain(groups, groupMailDomain));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const createGroup = async (req, res) => {
  try {
    const { name, description = "", memberIds = [] } = req.body;
    const trimmedName = name?.trim();
    const slug = slugifyGroupName(trimmedName);

    if (!trimmedName || !slug) {
      return res.status(400).json({ message: "Group name is required" });
    }

    const users = await prisma.user.findMany({
      where: {
        id: { in: memberIds },
        deletedAt: null,
      },
    });

    const groupMailDomain = await getPreferredGroupDomain();

    const group = await prisma.userGroup.create({
      data: {
        name: trimmedName,
        slug,
        description: description.trim() || null,
        ownerId: req.user.id,
        memberships: {
          create: users.map((user) => ({
            userId: user.id,
          })),
        },
      },
      include: groupInclude,
    });

    res.status(201).json({
      message: "Group created",
      group: serializeGroup({ ...group, mailDomain: groupMailDomain }),
    });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(400).json({ message: "A group with that name already exists" });
    }

    res.status(500).json({ error: err.message });
  }
};

export const updateGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description = "", memberIds = [] } = req.body;
    const trimmedName = name?.trim();
    const slug = slugifyGroupName(trimmedName);

    if (!trimmedName || !slug) {
      return res.status(400).json({ message: "Group name is required" });
    }

    const groupMailDomain = await getPreferredGroupDomain();

    const existingGroup = await prisma.userGroup.findUnique({
      where: { id },
    });

    if (!existingGroup) {
      return res.status(404).json({ message: "Group not found" });
    }

    const users = await prisma.user.findMany({
      where: {
        id: { in: memberIds },
        deletedAt: null,
      },
    });

    const group = await prisma.$transaction(async (tx) => {
      await tx.groupMember.deleteMany({
        where: { groupId: id },
      });

      return tx.userGroup.update({
        where: { id },
        data: {
          name: trimmedName,
          slug,
          description: description.trim() || null,
          memberships: {
            create: users.map((user) => ({
              userId: user.id,
            })),
          },
        },
        include: groupInclude,
      });
    });

    res.json({
      message: "Group updated",
      group: serializeGroup({ ...group, mailDomain: groupMailDomain }),
    });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(400).json({ message: "A group with that name already exists" });
    }

    res.status(500).json({ error: err.message });
  }
};

export const deleteGroup = async (req, res) => {
  try {
    const { id } = req.params;

    const existingGroup = await prisma.userGroup.findUnique({
      where: { id },
    });

    if (!existingGroup) {
      return res.status(404).json({ message: "Group not found" });
    }

    await prisma.userGroup.delete({
      where: { id },
    });

    res.json({ message: "Group deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const listDomains = async (_req, res) => {
  try {
    const domains = await prisma.mailDomain.findMany({
      orderBy: { createdAt: "desc" },
    });

    res.json(domains);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const createDomain = async (req, res) => {
  try {
    const normalized = normalizeDomain(req.body.domain);

    if (!normalized || !normalized.includes(".")) {
      return res.status(400).json({ message: "Enter a valid domain like aksentt.in" });
    }

    const domain = await prisma.mailDomain.create({
      data: {
        domain: normalized,
      },
    });

    res.status(201).json({
      message: "Domain added",
      domain,
    });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(400).json({ message: "That domain already exists" });
    }

    res.status(500).json({ error: err.message });
  }
};

export const deleteDomain = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.mailDomain.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ message: "Domain not found" });
    }

    await prisma.mailDomain.delete({
      where: { id },
    });

    res.json({ message: "Domain deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getPreferences = async (_req, res) => {
  try {
    const preferences = await getAdminPreferences();
    res.json(preferences);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updatePreferences = async (req, res) => {
  try {
    const preferences = await saveAdminPreferences(req.body);
    res.json({
      message: "Preferences updated",
      preferences,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
