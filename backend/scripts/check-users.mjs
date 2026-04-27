import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, accountRole: true, deletedAt: true }
  });
  console.log("=== ALL USERS ===");
  users.forEach(u => console.log(`  ${u.accountRole.padEnd(6)} | ${u.email.padEnd(35)} | ${u.name || '(no name)'} | deleted: ${u.deletedAt ? 'YES' : 'no'}`));

  // Check if mailbox owner exists
  const ownerEmail = process.env.MAILBOX_OWNER_APP_EMAIL || '';
  const owner = await prisma.user.findUnique({ where: { email: ownerEmail } });
  console.log(`\n=== MAILBOX OWNER CHECK ===`);
  console.log(`  MAILBOX_OWNER_APP_EMAIL = "${ownerEmail}"`);
  console.log(`  Found in DB: ${owner ? 'YES (id: ' + owner.id + ')' : 'NO <<<< THIS IS THE PROBLEM'}`);

  // Check recent inbox emails
  const inboxCount = await prisma.email.count({ where: { folder: 'inbox' } });
  const sentCount = await prisma.email.count({ where: { folder: 'sent' } });
  console.log(`\n=== EMAIL COUNTS ===`);
  console.log(`  Inbox: ${inboxCount}`);
  console.log(`  Sent: ${sentCount}`);

  // Check domains
  const domains = await prisma.mailDomain.findMany();
  console.log(`\n=== MAIL DOMAINS ===`);
  domains.forEach(d => console.log(`  ${d.domain}`));
  if (domains.length === 0) console.log('  (none configured)');

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
