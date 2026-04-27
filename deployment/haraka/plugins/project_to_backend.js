const { simpleParser } = require("mailparser");

exports.register = function () {
  this.register_hook("queue", "push_to_project_backend");
};

const normalizeAddress = (entry) => ({
  name: entry.name || (entry.address ? entry.address.split("@")[0] : ""),
  email: entry.address || "",
});

const normalizeAddressList = (addressObject) =>
  (addressObject?.value || []).map(normalizeAddress).filter((entry) => entry.email);

exports.push_to_project_backend = async function (next, connection) {
  const txn = connection?.transaction;

  if (!txn?.message_stream) {
    return next(DENYSOFT, "Missing message stream");
  }

  try {
    const parsed = await simpleParser(txn.message_stream);
    const payload = {
      messageId: parsed.messageId || txn.uuid,
      receivedAt: new Date().toISOString(),
      from: normalizeAddressList(parsed.from)[0] || null,
      to: normalizeAddressList(parsed.to),
      cc: normalizeAddressList(parsed.cc),
      bcc: normalizeAddressList(parsed.bcc),
      subject: parsed.subject || "",
      text: parsed.text || "",
      html: parsed.html ? String(parsed.html) : "",
      attachments: (parsed.attachments || []).map((attachment) => ({
        filename: attachment.filename || "attachment.bin",
        contentType: attachment.contentType || "application/octet-stream",
        size: attachment.size || attachment.content?.length || 0,
        contentBase64: attachment.content.toString("base64"),
      })),
    };

    const response = await fetch(process.env.PROJECT_INBOUND_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-inbound-mail-secret": process.env.PROJECT_INBOUND_SECRET || "",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      connection.logerror(
        this,
        `project backend rejected message ${txn.uuid} with status ${response.status}`
      );
      return next(DENYSOFT, "Project backend rejected inbound email");
    }

    return next(OK, "Queued to project backend");
  } catch (error) {
    connection.logerror(this, `project backend queue failed: ${error.message}`);
    return next(DENYSOFT, "Project backend queue failed");
  }
};
