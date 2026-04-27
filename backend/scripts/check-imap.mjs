import { PrismaClient } from '@prisma/client';
import { ImapFlow } from 'imapflow';
import dotenv from 'dotenv';
import fs from 'fs/promises';

dotenv.config();
const prisma = new PrismaClient();

async function main() {
  // 1. Check what the sync state says
  let syncState = { lastUid: 0 };
  try {
    syncState = JSON.parse(await fs.readFile('./data/mail-sync-state.json', 'utf8'));
  } catch {}
  console.log('=== SYNC STATE ===');
  console.log(`  lastUid: ${syncState.lastUid}`);
  console.log(`  lastSyncedAt: ${syncState.lastSyncedAt}`);

  // 2. Connect to IMAP and check how many total messages and latest UID
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
    console.log('\n=== IMAP CONNECTION: SUCCESS ===');

    const lock = await client.getMailboxLock('INBOX');
    try {
      console.log(`  Total messages in IMAP INBOX: ${client.mailbox.exists}`);
      console.log(`  Next UID: ${client.mailbox.uidNext}`);
      console.log(`  Already synced up to UID: ${syncState.lastUid}`);

      const pendingRange = `${syncState.lastUid + 1}:*`;
      let pendingCount = 0;
      const pendingMessages = [];

      for await (const msg of client.fetch(pendingRange, {
        uid: true,
        envelope: true,
        internalDate: true,
      })) {
        pendingCount++;
        pendingMessages.push({
          uid: msg.uid,
          from: msg.envelope?.from?.[0]?.address || '(unknown)',
          to: (msg.envelope?.to || []).map(t => t.address).join(', '),
          subject: msg.envelope?.subject || '(no subject)',
          date: msg.internalDate?.toISOString() || '',
        });
      }

      console.log(`\n=== PENDING (UNSYNCED) MESSAGES: ${pendingCount} ===`);
      pendingMessages.forEach(m => {
        console.log(`  UID ${m.uid} | ${m.date} | From: ${m.from} -> To: ${m.to} | ${m.subject}`);
      });

      if (pendingCount === 0) {
        console.log('  >> No new messages to sync. If you sent a test from Gmail,');
        console.log('     make sure you sent it TO: aksentt@aksentt.co.in');
        console.log('     (that is the IMAP mailbox being monitored)');
      }
    } finally {
      lock.release();
    }

    await client.logout();
  } catch (error) {
    console.error('\n=== IMAP CONNECTION FAILED ===');
    console.error(`  Error: ${error.message}`);
  }

  // 3. Show who the logged-in user likely is
  console.log('\n=== DELIVERY CONFIG ===');
  console.log(`  IMAP mailbox monitored: ${process.env.IMAP_USER}`);
  console.log(`  Mailbox owner (gets all emails): ${process.env.MAILBOX_OWNER_APP_EMAIL}`);
  console.log(`  Emails sent to ${process.env.IMAP_USER} will be delivered to:`);
  console.log(`    1. ${process.env.MAILBOX_OWNER_APP_EMAIL} (always, as mailbox owner)`);
  console.log(`    2. Any user in DB whose email matches the To/Cc headers`);

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
