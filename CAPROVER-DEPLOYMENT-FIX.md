# 🚀 CapRover Deployment Fix Guide

## 🔍 Masalah yang Diperbaiki

### 1. **NGINX 502 Bad Gateway**
**Penyebab:** Server tidak respond ke health check CapRover

**Solusi:** ✅ FIXED
- Added `/health` endpoint (tanpa `/api` prefix)
- Server bind ke `0.0.0.0` (bukan `localhost`)
- Port changed to 80 (CapRover default)

### 2. **SIGTERM Signal**
**Penyebab:** CapRover kill process karena health check gagal

**Solusi:** ✅ FIXED
- Graceful shutdown handler sudah ada
- Health check responds immediately (no database check)

### 3. **Port Mismatch**
**Penyebab:** Server running di port 3000, CapRover expect port 80

**Solusi:** ✅ FIXED
```javascript
const PORT = process.env.PORT || 80;
server.listen(PORT, "0.0.0.0", () => { ... });
```

---

## 📦 Deployment Steps

### 1. Update Environment Variables di CapRover

Login ke CapRover Dashboard → Your App → App Configs → Environment Variables:

```env
# Database (REQUIRED)
DATABASE_URL=postgresql://user:password@host:5432/database?schema=public

# Server
NODE_ENV=production
PORT=80

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# MinIO
MINIO_ENDPOINT=databasedokter-api.dokterapp.my.id
MINIO_PORT=443
MINIO_USE_SSL=true
MINIO_ACCESS_KEY=aswat
MINIO_SECRET_KEY=Azzam070117
MINIO_BUCKET_NAME=uploads
MINIO_REGION=eu-east-1
```

### 2. Commit Changes

```bash
git add .
git commit -m "fix: CapRover deployment - port 80, health check, graceful shutdown"
git push origin main
```

### 3. Deploy ke CapRover

**Option A: Via Git**
```bash
# CapRover will auto-deploy dari Git (jika sudah setup)
```

**Option B: Via CLI**
```bash
npm install -g caprover
caprover deploy
```

**Option C: Via CapRover Dashboard**
1. Buka CapRover Dashboard
2. Pilih app Anda
3. Tab **"Deployment"**
4. Klik **"Deploy via ImageName"** atau upload tarball

---

## 🔍 Verify Deployment

### 1. Check Logs
```bash
# Via CapRover Dashboard
Apps → Your App → Logs

# Cari output ini:
✅ Server is running on port 80
Health check (CapRover): http://localhost:80/health
```

### 2. Test Health Check
```bash
curl https://your-app.caprover.domain/health

# Expected response:
{
  "status": "ok",
  "timestamp": "2025-10-19T...",
  "port": 80
}
```

### 3. Test API
```bash
curl https://your-app.caprover.domain/api/health

# Expected response:
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2025-10-19T..."
}
```

### 4. Test Socket.IO
```javascript
const socket = io("https://your-app.caprover.domain", {
  path: "/socket.io/",
  transports: ["websocket", "polling"]
});

socket.on("connect", () => {
  console.log("✅ Connected:", socket.id);
});
```

---

## 🐛 Troubleshooting

### Issue: Still getting 502
**Check:**
1. Database connection string benar?
2. Environment variables sudah set?
3. Port 80 tidak digunakan process lain?

**Solution:**
```bash
# Check logs di CapRover
Apps → Your App → Logs

# Cari error:
❌ Database connection failed
❌ ECONNREFUSED
❌ Port already in use
```

### Issue: Health check failed
**Check:**
```bash
# Test from inside container
docker exec -it $(docker ps | grep your-app | awk '{print $1}') sh
wget -O- http://localhost:80/health
```

**Solution:**
- Pastikan endpoint `/health` returns 200 OK
- Pastikan server bind ke `0.0.0.0` (bukan `localhost`)

### Issue: Database not connecting
**Check:**
```bash
# Test database connection
npx prisma db push --accept-data-loss
```

**Solution:**
- Verify `DATABASE_URL` format
- Check if database host accessible from CapRover
- Check firewall rules

---

## 📊 Expected Log Output

### Successful Deployment
```
🚀 Starting production deployment setup...
⏳ Waiting for database connection...
✅ Database connected!
🔄 Running database migrations...
No pending migrations to apply.
✅ Database setup completed!
🌟 Starting the application...

> dokter-app-server@1.0.0 start
> node index.js

🚀 Starting Dokter App Server...
Testing database connection... (1/5)
✅ Database connection successful
✅ Server initialization complete
✅ Server is running on port 80
Environment: production
Health check (CapRover): http://localhost:80/health
Health check (API): http://localhost:80/api/health
Chat Socket.IO server initialized for real-time messaging
```

### Failed Deployment (502)
```
npm error signal SIGTERM
npm error command failed
NGINX 502 Bad Gateway
```

---

## 🎯 Quick Fixes

### If server keeps crashing:
```bash
# 1. Check if DATABASE_URL is set
echo $DATABASE_URL

# 2. Test database connection manually
npx prisma db push

# 3. Check if port 80 is available
netstat -tulpn | grep :80

# 4. Restart app in CapRover
Apps → Your App → "Force Rebuild" button
```

### If Socket.IO not connecting:
```javascript
// React Native client
const socket = io("https://serverbaru.dokterapp.my.id", {
  path: "/socket.io/",  // Important!
  transports: ["websocket", "polling"],
  reconnection: true
});
```

---

## ✅ Checklist Deployment

- [x] Port changed to 80
- [x] `/health` endpoint added (no DB check)
- [x] Server binds to `0.0.0.0`
- [x] Graceful shutdown handlers in place
- [x] Environment variables set in CapRover
- [x] `captain-definition` created
- [x] Database connection working
- [x] MinIO credentials set
- [ ] Deploy to CapRover
- [ ] Test `/health` endpoint
- [ ] Test `/api/health` endpoint
- [ ] Test Socket.IO connection
- [ ] Test file upload

---

## 📝 Notes

- **Port 80** adalah default untuk CapRover (bukan 3000)
- **`0.0.0.0`** bind address penting untuk Docker networking
- **`/health`** endpoint HARUS respond cepat (no DB check)
- **SIGTERM** handler already implemented untuk graceful shutdown
- **Socket.IO** path adalah `/socket.io/` (default)

---

## 🆘 Need Help?

Jika masih error, kirim:
1. Screenshot logs dari CapRover Dashboard
2. Output dari `curl https://your-app.caprover.domain/health`
3. Environment variables (censor sensitive data)

---

**Last Updated:** October 19, 2025
**Status:** ✅ Ready to deploy
