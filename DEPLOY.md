# CapRover Deployment Guide

## Persiapan untuk Deploy ke CapRover

### 1. Setup Database PostgreSQL di CapRover

1. Buka CapRover Dashboard
2. Pilih "Apps" > "One-Click Apps/Databases"
3. Cari dan install PostgreSQL
4. Catat connection details (host, port, username, password, database name)

### 2. Create App di CapRover

1. Buka "Apps" > "Create New App"
2. Nama app: `dokter-app-server`
3. Enable "Has Persistent Data" jika diperlukan

### 3. Set Environment Variables

Di app settings CapRover, tambahkan environment variables:

```
DATABASE_URL=postgresql://postgres:password@srv-captain--postgres-db:5432/dokter_app_db
JWT_SECRET=your-super-secret-jwt-key-production
NODE_ENV=production
PORT=80
```

### 4. Deploy Methods

#### Method 1: Upload ZIP File

1. Buat deployment package:
   ```bash
   deploy.bat
   ```
2. Upload `deploy.zip` di CapRover dashboard

#### Method 2: Git Repository

1. Push code ke Git repository
2. Connect repository di CapRover
3. Set branch dan auto-deploy

#### Method 3: CapRover CLI

1. Install CapRover CLI:
   ```bash
   npm install -g caprover
   ```
2. Login:
   ```bash
   caprover login
   ```
3. Deploy:
   ```bash
   caprover deploy
   ```

### 5. Post-Deployment

1. Jalankan migrations:

   - Buka app di CapRover
   - Go to "Deployment" tab
   - Add startup command: `npx prisma migrate deploy`

2. Test API endpoints:
   - Health check: `https://your-app.your-caprover-domain.com/api/health`
   - Users: `https://your-app.your-caprover-domain.com/api/users`

### 6. SSL Certificate

CapRover akan otomatis setup SSL certificate jika domain sudah dikonfigurasi.

### 7. Custom Domain (Optional)

1. Di app settings, tambahkan custom domain
2. Update DNS records sesuai instruksi CapRover
3. Enable force HTTPS

## Monitoring & Logs

- Lihat logs real-time di CapRover dashboard
- Monitor resource usage (CPU, Memory)
- Set up alerts jika diperlukan

## Backup Database

Setup automated backup untuk PostgreSQL database melalui CapRover atau script cron job.
