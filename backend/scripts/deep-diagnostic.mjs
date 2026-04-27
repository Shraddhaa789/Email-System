import { PrismaClient } from '@prisma/client';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import dotenv from 'dotenv';
import fs from 'fs/promises';

dotenv.config();
const prisma = new PrismaClient();

async function main() {
  console.log('=== COMPREHENSIVE EMAIL DIAGNOSTIC ===\n');

  // 1. Check sync state
  let syncState = { lastUid: 0 };
  try {
    syncState = JSON.parse(await fs.readFile('./data/mail-sync-state.json', 'utf8'));
  } catch {}
  console.log(`Sync state: lastUid=${syncState.lastUid}, lastSynced=${syncState.lastSyncedAt}`);

  // 2. Connect to IMAP and list the last 5 messages
  const client = new ImapFlow({
    host: process.env.IMAP_HOST,
    port: parseInt(process.env.IMAP_PORT || '993'),
    secure: process.env.IMAP_SECURE !== 'false',
    auth: {
      user: process.env.IMAP_USER,
      pass: process.env.IMAP_PASS,
    },
    logger: false,
  });

  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');

    try {
      const total = client.mailbox.exists;
      console.log(`\nIMAP: ${total} messages, nextUid=${client.mailbox.uidNext}`);

      // List the LAST 5 messages by sequence number
      const startSeq = Math.max(1, total - 4);
      console.log(`\n=== LAST 5 MESSAGES IN IMAP (seq ${startSeq}:${total}) ===`);

      for await (const msg of client.fetch(`${startSeq}:*`, {
        uid: true,
        envelope: true,
        source: true,
        internalDate: true,
      })) {
        const parsed = await simpleParser(msg.source);
        const from = parsed.from?.value?.[0]?.address || '(unknown)';
        const to = (parsed.to?.value || []).map(t => t.address).join(', ');
        const deliveredTo = parsed.headers?.get?.('delivered-to') || '';
        const xOrigTo = parsed.headers?.get?.('x-original-to') || '';

        console.log(`  UID ${msg.uid} | ${msg.internalDate?.toISOString()}`);
        console.log(`    From: ${from}`);
        console.log(`    To: ${to}`);
        if (deliveredTo) console.log(`    Delivered-To: ${deliveredTo}`);
        if (xOrigTo) console.log(`    X-Original-To: ${xOrigTo}`);
        console.log(`    Subject: ${parsed.subject}`);
        console.log('');
      }
    } finally {
      lock.release();
    }

    await client.logout();
  } catch (error) {
    console.error(`IMAP ERROR: ${error.message}`);
  }

  // 3. Check inbox emails in DB for the mailbox owner
  const ownerEmail = process.env.MAILBOX_OWNER_APP_EMAIL;
  const owner = await prisma.user.findUnique({ where: { email: ownerEmail } });

  if (owner) {
    const recentInbox = await prisma.email.findMany({
      where: { receiverId: owner.id, folder: 'inbox' },
      include: { sender: { select: { email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    console.log(`=== DB INBOX for ${ownerEmail}: ${recentInbox.length} most recent ===`);
    recentInbox.forEach(e => {
      console.log(`  ${e.createdAt.toISOString()} | From: ${e.sender?.email} | ${e.subject}`);
    });
  }

  // 4. Check ALL inbox emails across ALL users
  const allInbox = await prisma.email.findMany({
    where: { folder: 'inbox' },
    include: {
      sender: { select: { email: true } },
      receiver: { select: { email: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  console.log(`\n=== DB INBOX ALL USERS: ${allInbox.length} most recent ===`);
  allInbox.forEach(e => {
    console.log(`  ${e.createdAt.toISOString()} | ${e.sender?.email} -> ${e.receiver?.email} | ${e.subject}`);
  });

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
