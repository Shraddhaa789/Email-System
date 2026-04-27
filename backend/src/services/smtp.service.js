import nodemailer from "nodemailer";

const escapeHtml = (value = "") =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const escapeHeaderValue = (value = "") => value.replace(/[\r\n"]/g, "").trim();

const buildHtmlBody = (body = "") => {
  const escaped = escapeHtml(body || "").replace(/\r?\n/g, "<br />");

  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f6f8fb;font-family:Segoe UI,Arial,sans-serif;color:#1f2a37;">
    <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #dbe5f0;border-radius:16px;padding:24px;">
      <div style="font-size:14px;line-height:1.7;color:#334155;">${escaped || " "}</div>
    </div>
  </body>
</html>`;
};

const parseBoolean = (value, fallback = false) => {
  if (typeof value !== "string") {
    return fallback;
  }

  return value.toLowerCase() === "true";
};

const getSmtpConfig = () => {
  const host = process.env.SMTP_HOST?.trim();
  const port = Number.parseInt(process.env.SMTP_PORT || "", 10);
  const secure =
    typeof process.env.SMTP_SECURE === "string"
      ? parseBoolean(process.env.SMTP_SECURE)
      : port === 465;
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const fromEmail = process.env.SMTP_FROM_EMAIL?.trim() || user;
  const fromName = process.env.SMTP_FROM_NAME?.trim() || "";

  return {
    host,
    port: Number.isFinite(port) ? port : secure ? 465 : 587,
    secure,
    user,
    pass,
    fromEmail,
    fromName,
  };
};

const buildTransporter = () => {
  const config = getSmtpConfig();

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });
};

const toMailAttachment = (attachment) => {
  if (!attachment?.name || !attachment?.dataUrl) {
    return null;
  }

  const match = attachment.dataUrl.match(/^data:(.+);base64,(.+)$/);

  if (!match) {
    return null;
  }

  const [, mimeType, base64Data] = match;

  return {
    filename: attachment.name,
    content: Buffer.from(base64Data, "base64"),
    contentType: mimeType,
  };
};

export const isSmtpConfigured = () => {
  const config = getSmtpConfig();
  return Boolean(config.host && config.user && config.pass && config.fromEmail);
};

export const sendExternalEmail = async ({
  fromName,
  replyTo,
  to = [],
  cc = [],
  bcc = [],
  subject = "",
  body = "",
  attachments = [],
}) => {
  const config = getSmtpConfig();

  if (!isSmtpConfigured()) {
    throw new Error("SMTP is not configured");
  }

  const transporter = buildTransporter();
  const mailAttachments = attachments.map(toMailAttachment).filter(Boolean);
  const safeFromName = escapeHeaderValue(fromName || config.fromName || "");
  const displayFrom = safeFromName ? `"${safeFromName}" <${config.fromEmail}>` : config.fromEmail;

  await transporter.sendMail({
    from: displayFrom,
    replyTo: replyTo || config.fromEmail,
    to: to.length ? to.join(", ") : undefined,
    cc: cc.length ? cc.join(", ") : undefined,
    bcc: bcc.length ? bcc.join(", ") : undefined,
    subject: subject || "(no subject)",
    text: body || "",
    html: buildHtmlBody(body),
    headers: {
      "X-Auto-Response-Suppress": "OOF, AutoReply",
      "X-Priority": "3",
    },
    attachments: mailAttachments,
  });
};
