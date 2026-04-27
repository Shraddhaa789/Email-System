# Mail Receiver Setup

This document describes the recommended self-hosted inbound mail architecture for this project:

```text
Internet sender
-> MX for your domain
-> VPS
-> Haraka SMTP receiver
-> Express inbound endpoint
-> PostgreSQL + uploads
-> Socket.IO
-> React inbox UI
```

## Goal

Receive email directly in this project without first storing it in GoDaddy/Titan.


## What Is Already Implemented

The backend now exposes a public inbound endpoint at:

`POST /api/email/inbound`

Implemented in:

- [backend/src/routes/email.routes.js](C:/Users/shraddha.more/Desktop/outlook/backend/src/routes/email.routes.js)
- [backend/src/controllers/email.controller.js](C:/Users/shraddha.more/Desktop/outlook/backend/src/controllers/email.controller.js)
- [backend/src/services/inbound-email.service.js](C:/Users/shraddha.more/Desktop/outlook/backend/src/services/inbound-email.service.js)

This endpoint:

- accepts inbound mail JSON from Haraka
- maps recipients to app users
- creates inbox rows in the existing `Email` table
- stores attachments in `backend/uploads`
- emits realtime `newEmail` socket events to the UI

## Required Backend Environment

Add this to [backend/.env](C:/Users/shraddha.more/Desktop/outlook/backend/.env):

```env
INBOUND_MAIL_SECRET=replace-with-a-long-random-secret
```

The inbound endpoint accepts the secret in either:

- header: `x-inbound-mail-secret`
- body: `secret`

## Inbound Payload Contract

Haraka should POST JSON like this:

```json
{
  "messageId": "<abc123@example.com>",
  "receivedAt": "2026-04-14T10:15:00.000Z",
  "from": {
    "name": "Sender Name",
    "email": "sender@example.com"
  },
  "to": [
    {
      "name": "Support",
      "email": "support@aksentt.co.in"
    }
  ],
  "cc": [],
  "bcc": [],
  "subject": "Test inbound email",
  "text": "Plain text body",
  "html": "<p>Plain text body</p>",
  "attachments": [
    {
      "filename": "invoice.pdf",
      "contentType": "application/pdf",
      "size": 12034,
      "contentBase64": "BASE64_CONTENT"
    }
  ]
}
```

## How Recipient Routing Works

Inbound recipient matching uses the app `User.email` field.

Examples:

- `support@aksentt.co.in` must exist as a user in the app if you want a dedicated mailbox owner
- if no exact recipient user is found, the backend falls back to:
  - `MAILBOX_OWNER_APP_EMAIL`
  - or the first admin account

If you want multiple inboxes in the project, create one app user per mail address.

Examples:

- `sales@aksentt.co.in`
- `support@aksentt.co.in`
- `info@aksentt.co.in`

## VPS Requirements

Your VPS must provide:

- a public static IPv4 address
- ability to open inbound port `25`
- outbound HTTPS access from Haraka to your backend
- reverse DNS / PTR support

## DNS Setup

Assuming your receiver hostname is `mail.aksentt.co.in`:

1. Create an `A` record:

```text
mail.aksentt.co.in -> YOUR_VPS_IP
```

2. Create an `MX` record:

```text
aksentt.co.in -> priority 10 -> mail.aksentt.co.in
```

3. Ask your VPS provider to set reverse DNS:

```text
YOUR_VPS_IP -> mail.aksentt.co.in
```

4. Add SPF:

```text
v=spf1 mx ~all
```

5. Add DKIM and DMARC later if you will also send mail from the same server.

## Haraka Installation

On the VPS:

```powershell
npm install -g Haraka
haraka -i C:\mail\haraka
```

Then install `mailparser` inside the Haraka app:

```powershell
cd C:\mail\haraka
npm install mailparser
```

## Haraka Plugin

Copy this plugin into your Haraka instance:

- [deployment/haraka/plugins/project_to_backend.js](C:/Users/shraddha.more/Desktop/outlook/deployment/haraka/plugins/project_to_backend.js)

It parses the SMTP message and POSTs it to your backend.

## Haraka Configuration

### 1. Enable local-domain recipient acceptance

Edit `config/host_list` and add:

```text
aksentt.co.in
```

Add additional domains or subdomains if needed.

### 2. Enable required plugins

Edit `config/plugins`.

Use a minimal inbound setup like:

```text
rcpt_to.in_host_list
data.headers
attachment
project_to_backend
```

Place `project_to_backend` after recipient acceptance plugins.

### 3. Set Haraka environment values

Set these environment variables for the Haraka process:

```env
PROJECT_INBOUND_URL=https://your-backend-domain.example.com/api/email/inbound
PROJECT_INBOUND_SECRET=the-same-secret-as-backend
```

If your backend is on the same VPS behind a reverse proxy:

```env
PROJECT_INBOUND_URL=http://127.0.0.1:5000/api/email/inbound
```

## Reverse Proxy / HTTPS

If your backend is public, put it behind Nginx or Caddy and expose HTTPS.

Recommended flow:

```text
mail.aksentt.co.in -> Haraka on port 25
app.aksentt.co.in -> reverse proxy -> Node backend on 5000
```

## Application Setup

### 1. Create mailbox users in the app

Each inbound email address should exist as a `User.email` in the app database.

Examples:

- `sales@aksentt.co.in`
- `support@aksentt.co.in`
- `info@aksentt.co.in`

### 2. Restart the backend

After adding `INBOUND_MAIL_SECRET`, restart the backend server.

### 3. Restart Haraka

After adding the plugin and env vars, restart Haraka.

## End-To-End Test

1. Send a test email from Gmail to `support@aksentt.co.in`
2. Confirm the VPS accepts SMTP on port `25`
3. Confirm Haraka logs show the message
4. Confirm the backend receives `POST /api/email/inbound`
5. Confirm a row is created in `Email`
6. Confirm the React inbox updates

## Recommended Migration Plan

1. Keep Titan active during testing
2. Set up Haraka on a subdomain first if you want low risk
3. Test end-to-end with one mailbox user
4. Add the rest of the mailbox users
5. Change root-domain MX only after successful testing
6. Disable Titan IMAP sync once inbound direct delivery is working

## Operational Notes

This setup gives you full control, but you are responsible for:

- server uptime
- SMTP port availability
- abuse protection
- spam filtering
- backups
- DKIM/DMARC if you later send from the same infrastructure

## Recommended Next Code Changes

After deployment succeeds, the next improvements should be:

1. add inbound request logging
2. add deduplication by `messageId`
3. add a mailbox-to-user admin mapping table instead of exact email matching
4. add background virus/spam scanning for attachments
5. add webhook signature verification beyond a shared secret
