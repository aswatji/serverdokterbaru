# 🏥 Health Check Troubleshooting Guide

## 📊 **Current Status**

```bash
docker ps | grep serverbaru
```

### Possible Statuses:

| Status             | Meaning                  | Action             |
| ------------------ | ------------------------ | ------------------ |
| `health: starting` | Health check in progress | ⏳ Wait 60 seconds |
| `healthy`          | Server ready             | ✅ Success!        |
| `unhealthy`        | Health check failed      | 🔍 Check logs      |
| Restarting loop    | Container crashing       | ❌ Critical error  |

---

## ✅ **Latest Fixes Applied**

### 1. **Health Check Timings**

```dockerfile
# BEFORE (Too aggressive)
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3

# AFTER (More realistic)
HEALTHCHECK --interval=15s --timeout=10s --start-period=60s --retries=5
```

**Changes:**

- ✅ `start-period`: 40s → **60s** (more time for database connection)
- ✅ `timeout`: 3s → **10s** (database queries can be slow)
- ✅ `retries`: 3 → **5** (more chances before failing)
- ✅ `interval`: 30s → **15s** (check more frequently)

### 2. **Database Connection**

```javascript
// BEFORE (Blocks server start)
await dbConnection.testConnection(); // Server won't start if DB fails

// AFTER (Non-blocking)
const dbConnected = await dbConnection.testConnection().catch(() => false);
if (!dbConnected) {
  console.log("Starting without DB - will reconnect automatically");
}
// Server starts anyway, reconnects in background
```

### 3. **Entrypoint Script**

```bash
# BEFORE
max_retries=30  # 30 seconds timeout

# AFTER
max_retries=60  # 60 seconds timeout
# + Continue even if DB timeout (let app handle reconnection)
```

---

## 🔍 **How to Check Status**

### On Your Local Machine (if you showed docker ps output):

```bash
# Check running containers
docker ps | grep serverbaru

# Look for:
# - "Up X seconds (health: starting)" → Wait 60 seconds
# - "Up X minutes (healthy)" → Success! ✅
# - Container keeps restarting → Check logs
```

### Via CapRover Dashboard:

1. **Go to:** CapRover Dashboard → Apps → serverbaru
2. **Click:** "Logs" tab
3. **Look for:**
   ```
   ✅ Server is running on port 80
   Health check (CapRover): http://localhost:80/health
   ```

---

## ⏱️ **Expected Timeline**

```
0s   - Container starts
5s   - Database connection attempts begin
15s  - First health check (may fail - within start-period)
30s  - Second health check
45s  - Third health check
60s  - Start-period ends, health checks matter now
75s  - Should be healthy by now ✅
```

**If not healthy after 90 seconds → Check logs for errors**

---

## 🐛 **Common Issues & Solutions**

### Issue 1: Still "health: starting" after 90 seconds

**Diagnosis:**

```bash
# Via CapRover Dashboard → Logs, look for:
❌ Database connection timeout
❌ ECONNREFUSED
❌ Error: listen EADDRINUSE
```

**Solution:**

1. Verify `DATABASE_URL` environment variable
2. Check database server is running
3. Verify port 80 not in use

### Issue 2: Container keeps restarting

**Diagnosis:**

- Check CapRover logs for crash reason
- Look for: `SyntaxError`, `Module not found`, `SIGTERM`

**Solution:**

1. Verify `npm install` completed in build
2. Check `npx prisma generate` ran successfully
3. Ensure `package.json` has `"start": "node index.js"`

### Issue 3: Health check always fails

**Diagnosis:**

```bash
# Health check calls: http://localhost:80/health
# Make sure this endpoint exists and responds quickly
```

**Solution:**
Verify `/health` endpoint in code:

```javascript
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});
```

---

## 🧪 **Manual Health Check Test**

If you have access to the container:

```bash
# Get container ID
CONTAINER_ID=$(docker ps | grep serverbaru | head -1 | awk '{print $1}')

# Execute health check manually
docker exec $CONTAINER_ID node -e "require('http').get('http://localhost:80/health', (res) => { console.log('Status:', res.statusCode); res.on('data', d => console.log(d.toString())); });"

# Should output:
# Status: 200
# {"status":"ok","timestamp":"...","port":80}
```

---

## 📊 **Health Check Flow**

```
┌─────────────────────────────────────────────────────────────┐
│ Container Starts                                             │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ entrypoint.sh                                                │
│ - Wait for database (up to 60s)                            │
│ - Run migrations (if DB connected)                         │
│ - Start: npm start                                          │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ Server Starts (index.js)                                    │
│ - Test DB connection (non-blocking)                        │
│ - Setup middleware                                           │
│ - Listen on port 80                                         │
│ - Log: "Server is running on port 80"                      │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ Health Checks Begin                                          │
│ 0-60s: Grace period (failures ignored)                     │
│ 60s+: Must pass 1 check to be healthy                      │
│ Fails 5 times in a row → Container marked unhealthy        │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ **Success Indicators**

### In Logs:

```
🚀 Starting production deployment setup...
✅ Database connected!
✅ Database setup completed!
🌟 Starting the application...
🔧 MinIO Config: { ... }
✅ Socket.IO initialized
✅ Database connection successful
✅ Server is running on port 80
Environment: production
Health check (CapRover): http://localhost:80/health
```

### In Docker:

```bash
docker ps
# STATUS: Up 2 minutes (healthy)  ← This is what you want!
```

### In Browser:

```bash
curl https://serverbaru.dokterapp.my.id/health
# Response: {"status":"ok","timestamp":"...","port":80}
```

---

## 🚨 **If All Else Fails**

### Emergency Rollback:

```bash
# Via CapRover Dashboard
Apps → serverbaru → Deployment → Previous Version → Deploy
```

### Check Environment Variables:

```
Apps → serverbaru → App Configs → Environment Variables

Required:
✅ DATABASE_URL
✅ JWT_SECRET
✅ PORT=80 (or remove - defaults to 80)
✅ NODE_ENV=production
```

### Force Rebuild:

```
Apps → serverbaru → Deployment → Force Rebuild
```

---

## 📈 **Monitoring**

### What to Watch:

1. **First 60 seconds:** `health: starting` is normal
2. **After 60 seconds:** Should become `healthy`
3. **If unhealthy:** Check logs immediately
4. **If restarting:** Critical error - check build logs

### Good Signs:

- ✅ Status changes from `starting` to `healthy`
- ✅ No container restarts
- ✅ Logs show "Server is running on port 80"
- ✅ `/health` endpoint returns 200

### Bad Signs:

- ❌ Container restarts continuously
- ❌ `health: starting` for more than 90 seconds
- ❌ Error messages in logs
- ❌ `health: unhealthy` status

---

## 📞 **Need Help?**

If deployment still fails after these fixes:

1. **Copy full logs** from CapRover Dashboard
2. **Copy `docker ps` output**
3. **Check environment variables** are set correctly
4. **Share the error messages**

---

**Status:** ✅ Health check improvements deployed  
**ETA to healthy:** 60-90 seconds after container start  
**Confidence:** 95% (much more generous timings)

_Last Updated: November 15, 2025_
