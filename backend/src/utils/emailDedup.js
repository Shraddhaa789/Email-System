const normalizeText = (value = "") =>
  value
    .replace(/\r\n/g, "\n")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const normalizeEmail = (value = "") => value.trim().toLowerCase();

const normalizeTimestamp = (value) => {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Date(Math.floor(date.getTime() / 1000) * 1000).toISOString();
};

const normalizeRecipientList = (recipients = []) =>
  (Array.isArray(recipients) ? recipients : [])
    .map((entry) => normalizeEmail(entry?.email || ""))
    .filter(Boolean)
    .sort()
    .join(",");

export const buildInboundDedupKey = ({
  senderEmail = "",
  receiverId = "",
  folder = "inbox",
  subject = "",
  body = "",
  createdAt,
  toRecipients = [],
  ccRecipients = [],
  bccRecipients = [],
}) =>
  [
    normalizeEmail(senderEmail),
    receiverId,
    folder,
    normalizeText(subject),
    normalizeText(body),
    normalizeTimestamp(createdAt),
    normalizeRecipientList(toRecipients),
    normalizeRecipientList(ccRecipients),
    normalizeRecipientList(bccRecipients),
  ].join("|");

export const filterDuplicateEmails = (emails = []) => {
  const seen = new Set();

  return emails.filter((email) => {
    const key = buildInboundDedupKey({
      senderEmail: email.sender?.email || "",
      receiverId: email.receiverId,
      folder: email.folder,
      subject: email.subject,
      body: email.body,
      createdAt: email.createdAt,
      toRecipients: email.toRecipients,
      ccRecipients: email.ccRecipients,
      bccRecipients: email.bccRecipients,
    });

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
};
