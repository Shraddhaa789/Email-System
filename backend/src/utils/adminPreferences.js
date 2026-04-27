import fs from "fs/promises";
import path from "path";

const preferencesDir = path.join(process.cwd(), "data");
const preferencesPath = path.join(preferencesDir, "admin-preferences.json");

const defaultPreferences = {
  attachmentLimitMb: 25,
};

const normalizePreferences = (value = {}) => ({
  attachmentLimitMb: Math.min(
    100,
    Math.max(1, Number.parseInt(value.attachmentLimitMb, 10) || defaultPreferences.attachmentLimitMb)
  ),
});

export const getAdminPreferences = async () => {
  try {
    const raw = await fs.readFile(preferencesPath, "utf8");
    return normalizePreferences(JSON.parse(raw));
  } catch {
    return defaultPreferences;
  }
};

export const saveAdminPreferences = async (value = {}) => {
  const normalized = normalizePreferences(value);
  await fs.mkdir(preferencesDir, { recursive: true });
  await fs.writeFile(preferencesPath, JSON.stringify(normalized, null, 2), "utf8");
  return normalized;
};
