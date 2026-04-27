export const slugifyGroupName = (value = "") =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const getPrimaryGroupDomain = (domains = []) => domains?.[0]?.domain || "group.workspace";

export const buildGroupEmail = (slug = "", domain = "group.workspace") =>
  slug ? `${slug}@${domain}`.toLowerCase() : "";
