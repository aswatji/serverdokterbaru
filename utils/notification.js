// src/utils/notification.js
import { Expo } from "expo-server-sdk";

const expo = new Expo();

export const sendPushNotification = async (pushToken, title, body, data = {}) => {
  // 1. Cek validitas token
  if (!Expo.isExpoPushToken(pushToken)) {
    console.error(`❌ Token push tidak valid: ${pushToken}`);
    return;
  }

  // 2. Siapkan pesan
  const messages = [
    {
      to: pushToken,
      sound: "default",
      title: title,
      body: body,
      data: data,
      badge: 1,
      _displayInForeground: true, // Tambahan: Biar muncul walau app lagi dibuka (opsional)
    },
  ];

  // 3. Kirim
  try {
    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];

    for (let chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
        
        // --- LOGGING TAMBAHAN UNTUK DEBUGGING ---
        console.log("🎫 Ticket Respon dari Expo:", ticketChunk); 
        // ----------------------------------------

      } catch (error) {
        console.error("❌ Error sending chunk:", error);
      }
    }
    
    // Cek apakah ada error spesifik di dalam ticket
    // Contoh error umum: "DeviceNotRegistered" (Token lama/kadaluarsa)
    tickets.forEach((ticket) => {
        if (ticket.status === 'error') {
            console.error(`❌ Gagal kirim (Expo Error): ${ticket.message}`);
            if (ticket.details && ticket.details.error) {
                console.error(`   Detail: ${ticket.details.error}`);
            }
        } else {
            console.log(`✅ Notifikasi SUKSES dikirim ke server Expo: ${pushToken}`);
        }
    });

  } catch (error) {
    console.error("❌ Gagal total kirim notifikasi:", error);
  }
};