/**
 * Script untuk memperbaiki chatKey yang salah
 * Jalankan: node fix-chatkeys.js
 */

import prisma from "./config/database.js";

async function fixChatKeys() {
  try {
    console.log("🔧 Fixing incorrect chatKeys in database...\n");

    // Get all chats
    const chats = await prisma.chat.findMany({
      select: {
        id: true,
        chatKey: true,
        userId: true,
        doctorId: true,
      },
    });

    if (chats.length === 0) {
      console.log("⚠️ No chats found in database");
      return;
    }

    let fixedCount = 0;
    let errorCount = 0;

    for (const chat of chats) {
      const correctChatKey = `${chat.userId}-${chat.doctorId}`;

      // Check if chatKey needs fixing
      if (chat.chatKey !== correctChatKey) {
        console.log(`\n🔄 Fixing chat ${chat.id}:`);
        console.log(`  Old chatKey: ${chat.chatKey}`);
        console.log(`  New chatKey: ${correctChatKey}`);

        try {
          await prisma.chat.update({
            where: { id: chat.id },
            data: { chatKey: correctChatKey },
          });

          console.log(`  ✅ Fixed successfully`);
          fixedCount++;
        } catch (error) {
          console.error(`  ❌ Error fixing: ${error.message}`);
          errorCount++;
        }
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`  Total chats: ${chats.length}`);
    console.log(`  Fixed: ${fixedCount}`);
    console.log(`  Errors: ${errorCount}`);
    console.log(`  Already correct: ${chats.length - fixedCount - errorCount}`);
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

fixChatKeys();
