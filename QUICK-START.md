# 🚀 Quick Start - WhatsApp-Style Upload

## 📝 Yang Sudah Dibuat:

### 1. **Backend Routes** ✅

- `POST /api/chat/upload` - Single file upload
- `POST /api/chat/upload/multiple` - Multiple files upload

### 2. **Frontend HTML** ✅

- `chat-upload-test.html` - Full WhatsApp-style chat UI

### 3. **Features** ✅

- ✅ Upload gambar (JPG, PNG)
- ✅ Upload PDF
- ✅ Real-time Socket.IO notification
- ✅ Typing indicator
- ✅ Image preview
- ✅ File info (name, size)
- ✅ Auto-scroll
- ✅ WhatsApp-like bubble chat

---

## ⚡ Cara Pakai (5 Menit):

### 1. **Test di Browser** (Termudah)

1. Buka file `chat-upload-test.html` di VS Code
2. Edit baris ini (line 253-256):

   ```javascript
   const API_URL = "https://serverbaru.dokterapp.my.id"; // ✅ Sudah benar
   const CHAT_ID = "test-chat-001"; // ⚠️ Ganti dengan chat ID yang valid
   const SENDER = "user"; // atau "doctor"
   const TOKEN = "your-jwt-token-here"; // ⚠️ Ganti dengan JWT token valid
   ```

3. Simpan file
4. Klik kanan → **Open with Live Server** (atau buka langsung di browser)
5. Klik icon 📎 untuk upload file
6. Done! 🎉

### 2. **Test dengan Postman**

**Request:**

```
POST https://serverbaru.dokterapp.my.id/api/chat/upload
```

**Headers:**

```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Body** (form-data):

```
file: [Select File]
chatId: chat-123
sender: user
```

**Send** → Lihat response!

### 3. **Test dengan cURL**

```bash
curl -X POST https://serverbaru.dokterapp.my.id/api/chat/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/image.jpg" \
  -F "chatId=chat-001" \
  -F "sender=user"
```

---

## 🔑 Cara Dapat JWT Token:

### 1. **Login dulu** via API:

```bash
curl -X POST https://serverbaru.dokterapp.my.id/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "password": "your-password"
  }'
```

**Response:**

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", // ← Copy ini!
  "user": { ... }
}
```

### 2. **Copy token** dan paste ke:

- Postman → Headers → `Authorization: Bearer <TOKEN>`
- HTML file → `const TOKEN = "<TOKEN>"`
- cURL → `-H "Authorization: Bearer <TOKEN>"`

---

## 📱 Cara Dapat Chat ID:

### 1. **Create chat** via API:

```bash
curl -X POST https://serverbaru.dokterapp.my.id/api/chat \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "doctorId": "doctor-456"
  }'
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "chat-abc123", // ← Copy ini!
    "userId": "user-123",
    "doctorId": "doctor-456",
    "isActive": true
  }
}
```

### 2. **Atau ambil dari chat yang sudah ada:**

```bash
curl -X GET https://serverbaru.dokterapp.my.id/api/chat \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🎯 Flow Lengkap:

```
1. User login → Dapat JWT token ✅
2. User create/join chat → Dapat chat ID ✅
3. User connect Socket.IO → Join room ✅
4. User click 📎 → Select file ✅
5. File upload via HTTP POST ✅
6. Server save to database + MinIO ✅
7. Server emit Socket.IO event ✅
8. All users in room receive real-time notification ✅
9. File muncul di chat bubble ✅
```

---

## 📂 API Endpoints Summary:

| Method | Endpoint                    | Function                     |
| ------ | --------------------------- | ---------------------------- |
| POST   | `/api/auth/login`           | Login & get JWT token        |
| POST   | `/api/auth/register`        | Register new user            |
| POST   | `/api/chat`                 | Create new chat              |
| GET    | `/api/chat`                 | Get all chats                |
| GET    | `/api/chat/:id`             | Get specific chat            |
| POST   | `/api/chat/upload`          | **Upload single file** ⭐    |
| POST   | `/api/chat/upload/multiple` | **Upload multiple files** ⭐ |
| GET    | `/api/messages/:chatId`     | Get chat messages            |

---

## 🎨 Customize UI:

Edit `chat-upload-test.html`:

### 1. **Ganti warna bubble:**

```css
.message.sent .message-bubble {
  background: #dcf8c6; /* ← Ganti warna ini */
}
```

### 2. **Ganti icon:**

```html
<button class="btn btn-attach">
  📎
  <!-- ← Ganti emoji ini -->
</button>
```

### 3. **Ganti title:**

```html
<div class="chat-header">
  <div>💬 Chat Dokter</div>
  <!-- ← Ganti text ini -->
</div>
```

---

## ⚠️ Troubleshooting:

### ❌ "File too large"

**Fix:** File > 5MB. Compress dulu atau resize.

### ❌ "Unauthorized"

**Fix:** JWT token salah atau expired. Login ulang.

### ❌ "Chat not found"

**Fix:** Chat ID salah. Cek dengan `GET /api/chat`.

### ❌ Socket.IO tidak connect

**Fix:** Check browser console. Pastikan URL dan path benar:

```javascript
const socket = io("https://serverbaru.dokterapp.my.id", {
  path: "/socket.io/", // ← WAJIB!
  transports: ["websocket"],
});
```

### ❌ CORS error

**Fix:** Server harus allow origin frontend Anda. Contact backend dev.

---

## 📦 File Structure:

```
servertest/
├── chat-upload-test.html         ← Frontend test (buka di browser)
├── README-UPLOAD.md              ← Dokumentasi lengkap
├── QUICK-START.md                ← File ini (quick guide)
├── routes/
│   └── chatUploadRoutes.js       ← Upload routes
├── middleware/
│   └── uploadMiddleware.js       ← Multer config
└── chatSocket.js                 ← Socket.IO handlers
```

---

## 🎓 Next Steps:

1. ✅ Test upload dengan HTML client
2. ✅ Test upload dengan Postman
3. ✅ Integrate ke frontend app (React/Vue/Angular)
4. ✅ Customize UI sesuai design
5. ✅ Add more features (video, audio, dll)

---

## 💡 Tips:

- Upload gambar di-resize dulu di frontend (save bandwidth)
- Gunakan loading indicator saat upload
- Show progress bar untuk file besar
- Validate file type di frontend (user experience)
- Handle network error dengan retry logic

---

**Selamat mencoba!** 🚀📤💬

Jika ada masalah, cek:

1. Browser console (F12)
2. Network tab (lihat request/response)
3. Server logs di CapRover
4. README-UPLOAD.md untuk detail teknis
