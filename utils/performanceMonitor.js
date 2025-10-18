// ============================================
// 🎯 PERFORMANCE MONITORING UTILITIES
// ============================================
// Add these utilities to your chatController untuk monitoring

/**
 * Measure function execution time
 * Usage: const timer = measureTime('functionName');
 *        // ... your code ...
 *        timer.end(); // Logs: functionName: 150ms
 */
export function measureTime(label) {
  const start = Date.now();
  return {
    end: () => {
      const duration = Date.now() - start;
      console.log(`⏱️ ${label}: ${duration}ms`);
      return duration;
    },
  };
}

/**
 * Async function timing wrapper
 * Usage: await withTiming('queryDatabase', async () => {
 *          return await prisma.chat.findMany();
 *        });
 */
export async function withTiming(label, fn) {
  const timer = measureTime(label);
  try {
    const result = await fn();
    timer.end();
    return result;
  } catch (error) {
    timer.end();
    throw error;
  }
}

/**
 * Request timing middleware
 * Usage: app.use(requestTimingMiddleware);
 */
export function requestTimingMiddleware(req, res, next) {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const color = duration > 1000 ? "🔴" : duration > 500 ? "🟡" : "🟢";
    console.log(
      `${color} ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`
    );
  });

  next();
}

// ============================================
// 📊 USAGE EXAMPLES IN CHATCONTROLLER
// ============================================

/*
// Example 1: Individual function timing
async sendMessage(req, res) {
  const timer = measureTime('sendMessage');
  
  try {
    // ... your code ...
    timer.end();
    return res.json({...});
  } catch (error) {
    timer.end();
    throw error;
  }
}

// Example 2: Specific operation timing
async sendMessage(req, res) {
  try {
    const chat = await withTiming('findChat', async () => {
      return await prisma.chat.findUnique({...});
    });
    
    const message = await withTiming('createMessage', async () => {
      return await prisma.chatMessage.create({...});
    });
    
    return res.json({...});
  } catch (error) {
    // handle error
  }
}

// Example 3: Multiple operations timing
async sendMessage(req, res) {
  const timers = {
    total: measureTime('sendMessage-total'),
    db: measureTime('database-operations'),
    socket: measureTime('socket-broadcast'),
  };
  
  try {
    timers.db.start();
    const chat = await prisma.chat.findUnique({...});
    const message = await prisma.chatMessage.create({...});
    timers.db.end();
    
    timers.socket.start();
    io.emit('new_message', {...});
    timers.socket.end();
    
    timers.total.end();
    
    return res.json({...});
  } catch (error) {
    timers.total.end();
    throw error;
  }
}
*/

// ============================================
// 🔍 PERFORMANCE BENCHMARKING
// ============================================

/**
 * Compare performance before/after optimization
 * Run this in test environment
 */
export async function benchmarkSendMessage(iterations = 100) {
  console.log(`\n🏁 Starting benchmark (${iterations} iterations)...`);

  const times = [];

  for (let i = 0; i < iterations; i++) {
    const start = Date.now();

    // Simulate sendMessage operation
    await fetch("http://localhost:3000/api/chat/{chatKey}/send", {
      method: "POST",
      headers: {
        Authorization: "Bearer YOUR_TOKEN",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content: `Benchmark test ${i}` }),
    });

    const duration = Date.now() - start;
    times.push(duration);
  }

  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);
  const p95 = times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)];

  console.log("\n📊 Benchmark Results:");
  console.log(`   Average: ${avg.toFixed(2)}ms`);
  console.log(`   Min: ${min}ms`);
  console.log(`   Max: ${max}ms`);
  console.log(`   P95: ${p95}ms`);
  console.log(`   Total: ${times.reduce((a, b) => a + b, 0)}ms\n`);

  return { avg, min, max, p95 };
}

// ============================================
// 📈 DATABASE QUERY MONITORING
// ============================================

/**
 * Log all Prisma queries (development only)
 * Add to config/database.js
 */
export const prismaWithLogging = new PrismaClient({
  log: [
    { level: "query", emit: "event" },
    { level: "error", emit: "stdout" },
  ],
});

prismaWithLogging.$on("query", (e) => {
  console.log(`⚡ Query: ${e.query}`);
  console.log(`   Params: ${e.params}`);
  console.log(`   Duration: ${e.duration}ms`);
});

// ============================================
// 🎨 COLORED CONSOLE LOGS
// ============================================

export const log = {
  success: (msg) => console.log(`✅ ${msg}`),
  error: (msg) => console.error(`❌ ${msg}`),
  warn: (msg) => console.warn(`⚠️ ${msg}`),
  info: (msg) => console.info(`ℹ️ ${msg}`),
  perf: (label, duration) => {
    const color = duration > 1000 ? "🔴" : duration > 500 ? "🟡" : "🟢";
    console.log(`${color} ${label}: ${duration}ms`);
  },
};

// ============================================
// 💾 EXPORT ALL
// ============================================

export default {
  measureTime,
  withTiming,
  requestTimingMiddleware,
  benchmarkSendMessage,
  prismaWithLogging,
  log,
};
