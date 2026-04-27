import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const ownerEmail = 'shraddha.more@aksentt.co.in';
  const owner = await prisma.user.findUnique({ where: { email: ownerEmail } });

  if (!owner) {
    console.log('Owner not found!');
    await prisma.$disconnect();
    return;
  }

  // Recent inbox emails for the owner
  const ownerInbox = await prisma.email.findMany({
    where: { receiverId: owner.id, folder: 'inbox' },
    include: {
      sender: { select: { email: true, name: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: 15
  });

  console.log(`=== LATEST INBOX for ${ownerEmail} (${ownerInbox.length} shown) ===`);
  ownerInbox.forEach(e => {
    console.log(`  ${e.createdAt.toISOString()} | From: ${e.sender?.email?.padEnd(35)} | ${e.subject?.slice(0, 60)}`);
  });

  // Check if there are emails from external senders (gmail etc)
  const externalInbox = await prisma.email.findMany({
    where: {
      receiverId: owner.id,
      folder: 'inbox',
      sender: {
        email: { contains: 'gmail' }
      }
    },
    include: { sender: { select: { email: true } } },
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  console.log(`\n=== GMAIL EMAILS in owner's inbox: ${externalInbox.length} ===`);
  externalInbox.forEach(e => {
    console.log(`  ${e.createdAt.toISOString()} | ${e.sender?.email} | ${e.subject?.slice(0, 50)}`);
  });

  // Check sync state
  const fs = await import('fs/promises');
  try {
    const state = JSON.parse(await fs.readFile('./data/mail-sync-state.json', 'utf8'));
    console.log('\n=== SYNC STATE ===');
    console.log(JSON.stringify(state, null, 2));
  } catch {
    console.log('\n=== NO SYNC STATE FILE ===');
  }

  // What user is the frontend logged in as? Check who has sent emails recently
  const recentSent = await prisma.email.findMany({
    where: { folder: 'sent' },
    include: { sender: { select: { email: true } } },
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log('\n=== RECENT SENT EMAILS (who is sending?) ===');
  recentSent.forEach(e => {
    console.log(`  ${e.createdAt.toISOString()} | Sender: ${e.sender?.email} | ${e.subject?.slice(0, 50)}`);
  });

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
