const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  // Seed data untuk development
  console.log("Seeding data...");

  // Create users
  const user1 = await prisma.user.upsert({
    where: { email: "user1@example.com" },
    update: {},
    create: {
      email: "user1@example.com",
      name: "John Doe",
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: "user2@example.com" },
    update: {},
    create: {
      email: "user2@example.com",
      name: "Jane Smith",
    },
  });

  // Create chats
  const chat1 = await prisma.chat.create({
    data: {
      title: "General Discussion",
    },
  });

  // Create messages
  await prisma.message.create({
    data: {
      content: "Hello, how are you?",
      chatId: chat1.id,
      userId: user1.id,
    },
  });

  await prisma.message.create({
    data: {
      content: "I am fine, thank you!",
      chatId: chat1.id,
      userId: user2.id,
    },
  });

  console.log("Seeding completed successfully!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
