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
      data: data, // Data untuk redirect (chatId, dll)
      badge: 1,
    },
  ];

  // 3. Kirim
  try {
    const chunks = expo.chunkPushNotifications(messages);
    for (let chunk of chunks) {
      await expo.sendPushNotificationsAsync(chunk);
    }
    console.log(`🔔 Notifikasi dikirim ke: ${pushToken}`);
  } catch (error) {
    console.error("❌ Gagal kirim notifikasi:", error);
  }
};