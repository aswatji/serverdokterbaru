/**
 * Script untuk mengecek data chat di database
 * Jalankan: node check-chats.js
 */

import prisma from "./config/database.js";

async function checkChats() {
  try {
    console.log("🔍 Checking all chats in database...\n");

    const chats = await prisma.chat.findMany({
      select: {
        id: true,
        chatKey: true,
        userId: true,
        doctorId: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    if (chats.length === 0) {
      console.log("⚠️ No chats found in database");
      return;
    }

    console.log(`📊 Found ${chats.length} chat(s):\n`);

    chats.forEach((chat, index) => {
      console.log(`Chat #${index + 1}:`);
      console.log(`  ID: ${chat.id}`);
      console.log(`  ChatKey: ${chat.chatKey}`);
      console.log(`  UserId: ${chat.userId}`);
      console.log(`  DoctorId: ${chat.doctorId}`);
      console.log(`  Created: ${chat.createdAt}`);
      console.log(`  Updated: ${chat.updatedAt}`);
      console.log("");
    });

    // Check for problematic chatKeys
    const problematicChats = chats.filter(
      (chat) => chat.chatKey === "chat123" || chat.chatKey === "test-chat-123"
    );

    if (problematicChats.length > 0) {
      console.log("⚠️ WARNING: Found hardcoded chatKey(s):");
      problematicChats.forEach((chat) => {
        console.log(
          `  - Chat ID ${chat.id} has chatKey: "${chat.chatKey}" (should be "${chat.userId}-${chat.doctorId}")`
        );
      });
      console.log(
        "\n💡 Recommendation: Delete these test chats or update chatKeys"
      );
    }
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkChats();
