// utils/redisClient.js
import { createClient } from "redis";

// URL ini sesuaikan dengan Environment Variable di CapRover
const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 3) {
        console.warn("⚠️  Redis tidak tersedia setelah 3 percobaan, mode tanpa cache diaktifkan.");
        return false; // Hentikan retry
      }
      return Math.min(retries * 100, 2000);
    },
  },
});

redisClient.on("error", (err) => console.error("❌ Redis Error:", err.message));
redisClient.on("connect", () => console.log("✅ Berhasil terhubung ke Redis!"));

// ✅ Hubungkan ke Redis dengan aman — jangan crash server jika Redis tidak ada
try {
  await redisClient.connect();
} catch (err) {
  console.warn("⚠️  Gagal terhubung ke Redis:", err.message);
  console.warn("⚠️  Server akan berjalan tanpa caching Redis.");
}

// ✅ Buat wrapper aman agar tidak crash jika Redis disconnected
const safeRedisClient = {
  get: async (key) => {
    try {
      if (!redisClient.isReady) return null;
      return await redisClient.get(key);
    } catch (err) {
      console.error("❌ Redis GET error:", err.message);
      return null;
    }
  },
  setEx: async (key, ttl, value) => {
    try {
      if (!redisClient.isReady) return;
      return await redisClient.setEx(key, ttl, value);
    } catch (err) {
      console.error("❌ Redis SETEX error:", err.message);
    }
  },
  del: async (key) => {
    try {
      if (!redisClient.isReady) return;
      return await redisClient.del(key);
    } catch (err) {
      console.error("❌ Redis DEL error:", err.message);
    }
  },
  isReady: () => redisClient.isReady,
};

export default safeRedisClient;
