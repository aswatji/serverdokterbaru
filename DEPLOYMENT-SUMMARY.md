# 🎯 CapRover Deployment - Problem & Solution Summary

**Date:** October 19, 2025  
**Status:** ✅ FIXED - Ready to Deploy

---

## 🔴 **Masalah yang Terjadi**

### 1. NGINX 502 Bad Gateway

```
ERROR: NGINX 502 Bad Gateway :/
Server crashed dengan SIGTERM signal
```

**Root Cause:**

- Server running di port **3000** (CapRover expect port **80**)
- Health check endpoint `/api/health` tidak accessible
- Server tidak bind ke `0.0.0.0` (bind ke `localhost` saja)
- CapRover gagal verify health check → kill process → 502 error

### 2. Logs dari CapRover

```
✅ Server is running on port 3000  ← WRONG PORT!
npm error signal SIGTERM            ← CapRover killed the process
npm error command failed
```

---

## ✅ **Solusi yang Diterapkan**

### 1. **Port Changed: 3000 → 80**

```javascript
// ❌ BEFORE
const PORT = process.env.PORT || 3000;

// ✅ AFTER
const PORT = process.env.PORT || 80; // CapRover uses port 80
```

### 2. **Health Check Endpoint Added**

```javascript
// ✅ NEW - For CapRover (no /api prefix, fast response)
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    port: PORT,
  });
});

// Existing /api/health still works for API monitoring
app.get("/api/health", healthCheck);
```

### 3. **Server Bind Address Fixed**

```javascript
// ❌ BEFORE (implicit localhost)
server.listen(PORT, () => { ... });

// ✅ AFTER (explicit 0.0.0.0 for Docker)
server.listen(PORT, "0.0.0.0", () => { ... });
```

### 4. **Graceful Shutdown** (Already Implemented ✅)

```javascript
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
```

### 5. **CapRover Definition File**

Created `captain-definition` with:

- Dockerfile that exposes port 80
- Health check using `/health` endpoint
- Proper environment variables

---

## 📋 **Deployment Checklist**

### Pre-Deployment

- [x] Port changed to 80
- [x] `/health` endpoint added
- [x] Server binds to `0.0.0.0`
- [x] `captain-definition` created
- [x] Code pushed to GitHub
- [ ] Verify environment variables in CapRover

### Deploy

1. **Login ke CapRover Dashboard**

   ```
   https://captain.your-domain.com
   ```

2. **Check Environment Variables**

   - Apps → Your App → App Configs → Environment Variables
   - Required: `DATABASE_URL`, `JWT_SECRET`, MinIO credentials

3. **Deploy**

   - Apps → Your App → Deployment
   - Connect to GitHub repo or manual deploy
   - Wait for build & deployment

4. **Verify Deployment**

   ```bash
   # Test health check
   curl https://serverbaru.dokterapp.my.id/health

   # Expected: {"status":"ok","timestamp":"...","port":80}
   ```

### Post-Deployment

- [ ] Test `/health` endpoint → should return 200 OK
- [ ] Test `/api/health` endpoint → should show database status
- [ ] Test Socket.IO connection from React Native app
- [ ] Test file upload functionality
- [ ] Monitor logs for any errors

---

## 🧪 **Testing Commands**

### 1. Test Health Check (CapRover)

```bash
curl https://serverbaru.dokterapp.my.id/health

# Expected Response:
{
  "status": "ok",
  "timestamp": "2025-10-19T08:00:00.000Z",
  "port": 80
}
```

### 2. Test API Health (Full Check)

```bash
curl https://serverbaru.dokterapp.my.id/api/health

# Expected Response:
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2025-10-19T08:00:00.000Z"
}
```

### 3. Test Socket.IO Connection

```javascript
// React Native Client
const socket = io("https://serverbaru.dokterapp.my.id", {
  path: "/socket.io/",
  transports: ["websocket", "polling"],
  reconnection: true,
});

socket.on("connect", () => {
  console.log("✅ Connected:", socket.id);
});

socket.on("connect_error", (error) => {
  console.error("❌ Connection error:", error.message);
});
```

### 4. Test File Upload

```bash
curl -X POST https://serverbaru.dokterapp.my.id/api/chat/send \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test-image.jpg" \
  -F "chatId=test-chat-123" \
  -F "sender=user"
```

---

## 📊 **Expected Results**

### Successful Deployment Logs

```
🚀 Starting production deployment setup...
✅ Database connected!
✅ Database setup completed!
🌟 Starting the application...

> dokter-app-server@1.0.0 start
> node index.js

🔧 MinIO Config: { ... }
✅ Socket.IO initialized
🚀 Starting Dokter App Server...
✅ Database connection successful
✅ Server initialization complete
✅ Server is running on port 80           ← CORRECT PORT!
Environment: production
Health check (CapRover): http://localhost:80/health    ← NEW!
Health check (API): http://localhost:80/api/health
Chat Socket.IO server initialized for real-time messaging
```

### No More Errors

```
❌ BEFORE:
npm error signal SIGTERM
NGINX 502 Bad Gateway

✅ AFTER:
Server keeps running
Health check passes
No SIGTERM signals
```

---

## 🐛 **Troubleshooting**

### If still getting 502:

1. **Check CapRover Logs**

   ```
   Apps → Your App → Logs
   ```

2. **Verify Environment Variables**

   ```
   DATABASE_URL, JWT_SECRET, MINIO_* variables
   ```

3. **Test Database Connection**

   ```bash
   # From CapRover terminal
   npx prisma db push
   ```

4. **Force Rebuild**
   ```
   Apps → Your App → Force Rebuild button
   ```

### If Socket.IO not connecting:

1. **Check path in client**

   ```javascript
   path: "/socket.io/"; // Must include trailing slash
   ```

2. **Check CORS settings**

   ```javascript
   // Server allows all origins by default
   cors: {
     origin: "*";
   }
   ```

3. **Try polling first**
   ```javascript
   transports: ["polling", "websocket"]; // Polling first
   ```

---

## 📝 **Files Changed**

1. **`index.js`** - Port 80, `/health` endpoint, bind `0.0.0.0`
2. **`captain-definition`** - CapRover deployment config
3. **`CAPROVER-DEPLOYMENT-FIX.md`** - Detailed deployment guide
4. **`CHATKEY-TROUBLESHOOTING.md`** - ChatKey debugging guide
5. **`controllers/chatController.js`** - Enhanced logging
6. **`check-chats.js`** - Database check utility
7. **`fix-chatkeys.js`** - ChatKey fix utility

---

## ✅ **Action Items**

1. ✅ Code changes completed
2. ✅ Committed to Git
3. ✅ Pushed to GitHub
4. ⏳ **NEXT:** Deploy via CapRover
5. ⏳ **NEXT:** Verify health checks
6. ⏳ **NEXT:** Test Socket.IO connection
7. ⏳ **NEXT:** Test file upload

---

## 🎯 **Success Criteria**

- [ ] Server starts without SIGTERM
- [ ] `/health` returns 200 OK
- [ ] `/api/health` shows database connected
- [ ] Socket.IO client can connect
- [ ] File upload works via Socket.IO
- [ ] No 502 errors in production
- [ ] Logs show "Server is running on port 80"

---

## 📚 **Related Documentation**

- [`CAPROVER-DEPLOYMENT-FIX.md`](CAPROVER-DEPLOYMENT-FIX.md) - Full deployment guide
- [`CHATKEY-TROUBLESHOOTING.md`](CHATKEY-TROUBLESHOOTING.md) - ChatKey debugging
- [CapRover 502 Troubleshooting](https://caprover.com/docs/troubleshooting.html#successful-deploy-but-502-bad-gateway-error)

---

**Status:** ✅ Ready to deploy  
**Next Step:** Deploy via CapRover dashboard or CLI  
**ETA:** 5-10 minutes for deployment

---

_Last Updated: October 19, 2025_
