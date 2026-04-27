import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Count inbox emails per receiver
  const results = await prisma.$queryRaw`
    SELECT u.email, u.name, COUNT(e.id)::int as inbox_count
    FROM "Email" e
    JOIN "User" u ON u.id = e."receiverId"
    WHERE e.folder = 'inbox'
    GROUP BY u.email, u.name
    ORDER BY inbox_count DESC
  `;
  console.log("=== INBOX EMAILS PER USER ===");
  console.log(JSON.stringify(results, null, 2));

  // Check emails received in the last 24 hours
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recent = await prisma.email.findMany({
    where: {
      folder: "inbox",
      createdAt: { gte: oneDayAgo }
    },
    include: {
      sender: { select: { email: true } },
      receiver: { select: { email: true } }
    },
    orderBy: { createdAt: "desc" }
  });
  console.log("\n=== EMAILS IN LAST 24 HOURS ===", recent.length);
  recent.forEach(e => {
    console.log(`  ${e.createdAt.toISOString()} | ${e.sender?.email} -> ${e.receiver?.email} | ${e.subject}`);
  });

  // Check the last sync time more carefully
  const fs = await import('fs/promises');
  try {
    const state = JSON.parse(await fs.readFile('./data/mail-sync-state.json', 'utf8'));
    console.log("\n=== SYNC STATE ===");
    console.log(JSON.stringify(state, null, 2));
  } catch (e) {
    console.log("\n=== NO SYNC STATE FILE ===");
  }

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
