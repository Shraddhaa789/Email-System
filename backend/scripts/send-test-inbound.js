const API_BASE_URL = process.env.API_BASE_URL || "http://127.0.0.1:5000";
const INBOUND_MAIL_SECRET = process.env.INBOUND_MAIL_SECRET || "";

if (!INBOUND_MAIL_SECRET) {
  console.error("Missing INBOUND_MAIL_SECRET environment variable");
  process.exit(1);
}

const payload = {
  messageId: `<local-test-${Date.now()}@aksentt.co.in>`,
  receivedAt: new Date().toISOString(),
  from: {
    name: "Local Test Sender",
    email: "sender@example.com",
  },
  to: [
    {
      name: "Shraddha More",
      email: "shraddha.more@aksentt.co.in",
    },
  ],
  cc: [],
  bcc: [],
  subject: "Inbound mail pipeline test",
  text: "This is a local test for the inbound email webhook.",
  html: "<p>This is a local test for the inbound email webhook.</p>",
  attachments: [],
};

const response = await fetch(`${API_BASE_URL}/api/email/inbound`, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-inbound-mail-secret": INBOUND_MAIL_SECRET,
  },
  body: JSON.stringify(payload),
});

const body = await response.text();

console.log(`Status: ${response.status}`);
console.log(body);
