import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log:
    process.env.NODE_ENV === "development"
      ? ["query", "info", "warn", "error"]
      : ["error"],
});

// Optimize connection pool for better performance
process.on("beforeExit", async () => {
  console.log("Disconnecting Prisma...");
  await prisma.$disconnect();
});

export default prisma;
