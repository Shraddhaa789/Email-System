import { buildGroupEmail } from "./group.utils.js";

export const serializeUser = (user) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  accountRole: user.accountRole,
  userType: user.userType,
  role: user.role,
  team: user.team,
  workingHours: user.workingHours,
  location: user.location,
  createdAt: user.createdAt,
  deletedAt: user.deletedAt,
});

export const serializeGroup = (group) => ({
  id: group.id,
  name: group.name,
  slug: group.slug,
  email: buildGroupEmail(group.slug, group.mailDomain),
  description: group.description,
  createdAt: group.createdAt,
  ownerId: group.ownerId,
  memberCount: group.memberships?.length || 0,
  members: (group.memberships || []).map((membership) => serializeUser(membership.user)),
});
