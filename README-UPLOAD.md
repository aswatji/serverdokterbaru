# 📤 WhatsApp-Style Upload dengan Multer + Socket.IO

Sistem upload gambar dan file real-time seperti WhatsApp menggunakan Express, Multer, dan Socket.IO.

## 🚀 Fitur

- ✅ Upload gambar (JPG, PNG) max 5MB
- ✅ Upload file PDF max 5MB
- ✅ Upload multiple files (batch upload max 10 files)
- ✅ Real-time notification via Socket.IO
- ✅ Preview gambar
- ✅ File info (nama, ukuran, tipe)
- ✅ Typing indicator
- ✅ Auto-scroll to latest message
- ✅ WhatsApp-like UI

## 📁 File Structure

```
servertest/
├── routes/
│   └── chatUploadRoutes.js          # Route untuk upload file
├── middleware/
│   └── uploadMiddleware.js          # Multer configuration
├── chatSocket.js                     # Socket.IO handlers
├── chat-upload-test.html            # Frontend test HTML
└── README-UPLOAD.md                 # Dokumentasi ini
```

## 🔧 Konfigurasi

### 1. Multer Configuration (`uploadMiddleware.js`)

```javascript
// Support: JPEG, PNG, PDF
// Max size: 5MB per file
// Storage: Memory (buffer) untuk upload ke MinIO
```

### 2. Environment Variables

Pastikan di CapRover sudah ada:

```env
DATABASE_URL=postgresql://user:pass@host:5432/dbname
JWT_SECRET=your_secret_key
NODE_ENV=production
PORT=80
```

## 📡 API Endpoints

### 1. Single File Upload

**POST** `/api/chat/upload`

Headers:

```
Authorization: Bearer <JWT_TOKEN>
Content-Type: multipart/form-data
```

Body (FormData):

```
file: [File] (required)
chatId: string (required)
sender: "user" | "doctor" (required)
```

Response:

```json
{
  "success": true,
  "message": "File berhasil diupload",
  "data": {
    "id": "msg-123",
    "chatId": "chat-001",
    "sender": "user",
    "type": "image",
    "fileUrl": "https://...",
    "fileName": "photo.jpg",
    "fileSize": 245678,
    "mimeType": "image/jpeg",
    "createdAt": "2025-11-16T..."
  }
}
```

### 2. Multiple Files Upload

**POST** `/api/chat/upload/multiple`

Headers:

```
Authorization: Bearer <JWT_TOKEN>
Content-Type: multipart/form-data
```

Body (FormData):

```
files: [File, File, ...] (max 10 files)
chatId: string (required)
sender: "user" | "doctor" (required)
```

Response:

```json
{
  "success": true,
  "message": "3 file berhasil diupload",
  "data": [
    {
      "id": "msg-123",
      "chatId": "chat-001",
      "type": "image",
      "fileUrl": "https://...",
      ...
    },
    ...
  ]
}
```

## 🔌 Socket.IO Events

### Client → Server

#### 1. Join Chat Room

```javascript
socket.emit("join_chat", chatId);
```

#### 2. Typing Indicator

```javascript
socket.emit("typing", {
  chatId: "chat-001",
  sender: "user",
});

socket.emit("stop_typing", {
  chatId: "chat-001",
  sender: "user",
});
```

#### 3. Send Text Message

```javascript
socket.emit(
  "send_message",
  {
    chatId: "chat-001",
    sender: "user",
    content: "Hello!",
    type: "text",
  },
  (response) => {
    if (response.success) {
      console.log("Message sent!");
    }
  }
);
```

### Server → Client

#### 1. New Message (including uploaded files)

```javascript
socket.on("new_message", (message) => {
  console.log("New message:", message);
  // message.type: "text" | "image" | "pdf" | "file"
  // message.fileUrl: URL for download/preview
});
```

#### 2. Typing Indicators

```javascript
socket.on("typing", ({ chatId, sender }) => {
  // Show "Sedang mengetik..."
});

socket.on("stop_typing", ({ chatId, sender }) => {
  // Hide typing indicator
});
```

#### 3. User Joined

```javascript
socket.on("user_joined", ({ socketId, chatId, timestamp }) => {
  console.log("User joined:", socketId);
});
```

## 💻 Frontend Integration

### 1. HTML Test Client

Buka file `chat-upload-test.html` di browser:

```bash
# Edit konfigurasi di HTML:
const API_URL = "https://serverbaru.dokterapp.my.id";
const CHAT_ID = "your-chat-id";
const TOKEN = "your-jwt-token";
```

Kemudian buka file di browser untuk testing.

### 2. JavaScript Integration

```javascript
// Initialize Socket.IO
const socket = io("https://serverbaru.dokterapp.my.id", {
  path: "/socket.io/",
  transports: ["websocket"],
  auth: { token: "your-jwt-token" },
});

// Join chat room
socket.emit("join_chat", "chat-001");

// Listen for new messages
socket.on("new_message", (message) => {
  if (message.type === "image") {
    displayImage(message.fileUrl);
  } else if (message.type === "pdf") {
    displayPDFLink(message.fileUrl, message.fileName);
  } else {
    displayTextMessage(message.content);
  }
});

// Upload file
async function uploadFile(file, chatId, sender) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("chatId", chatId);
  formData.append("sender", sender);

  const response = await fetch(`${API_URL}/api/chat/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
    },
    body: formData,
  });

  const result = await response.json();
  return result;
}
```

### 3. React/Vue Integration

```jsx
// React Example
import { useEffect, useState } from "react";
import io from "socket.io-client";

function ChatComponent({ chatId, token }) {
  const [messages, setMessages] = useState([]);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const newSocket = io("https://serverbaru.dokterapp.my.id", {
      path: "/socket.io/",
      auth: { token },
    });

    newSocket.emit("join_chat", chatId);

    newSocket.on("new_message", (message) => {
      setMessages((prev) => [...prev, message]);
    });

    setSocket(newSocket);

    return () => newSocket.close();
  }, [chatId, token]);

  const handleFileUpload = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("chatId", chatId);
    formData.append("sender", "user");

    const response = await fetch("/api/chat/upload", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    return await response.json();
  };

  return (
    <div>
      {messages.map((msg) => (
        <Message key={msg.id} message={msg} />
      ))}
      <input
        type="file"
        onChange={(e) => handleFileUpload(e.target.files[0])}
      />
    </div>
  );
}
```

## 🧪 Testing

### 1. Test dengan cURL

```bash
# Upload single file
curl -X POST https://serverbaru.dokterapp.my.id/api/chat/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/image.jpg" \
  -F "chatId=chat-001" \
  -F "sender=user"

# Upload multiple files
curl -X POST https://serverbaru.dokterapp.my.id/api/chat/upload/multiple \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "files=@/path/to/image1.jpg" \
  -F "files=@/path/to/image2.jpg" \
  -F "files=@/path/to/document.pdf" \
  -F "chatId=chat-001" \
  -F "sender=user"
```

### 2. Test dengan Postman

1. Create new request: **POST** `https://serverbaru.dokterapp.my.id/api/chat/upload`
2. Headers:
   - `Authorization: Bearer YOUR_TOKEN`
3. Body → form-data:
   - `file`: (File) Select file
   - `chatId`: (Text) chat-001
   - `sender`: (Text) user
4. Send request

### 3. Test dengan HTML Client

1. Buka `chat-upload-test.html` di browser
2. Edit konfigurasi (API_URL, CHAT_ID, TOKEN)
3. Klik icon 📎 untuk attach file
4. Pilih gambar atau PDF
5. File akan otomatis terupload dan muncul di chat

## 🔒 Security

### 1. Authentication

Semua endpoint upload memerlukan JWT token:

```javascript
// Di route
import { verifyToken } from "../middleware/authMiddleware.js";
router.post("/upload", verifyToken, upload.single("file"), ...);
```

### 2. File Validation

```javascript
// Hanya allow: JPEG, PNG, PDF
// Max size: 5MB per file
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "application/pdf",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("File type not allowed"), false);
  }
};
```

### 3. Chat Validation

Setiap upload memverifikasi:

- ✅ Chat exists
- ✅ Chat is active
- ✅ User is authorized

## 📊 Database Schema

Message table sudah include field untuk file:

```prisma
model Message {
  id        String   @id @default(uuid())
  chatId    String
  sender    String   // "user" atau "doctor"
  content   String   // Text atau file name
  type      String   // "text", "image", "pdf", "file"
  fileUrl   String?  // URL dari MinIO
  fileName  String?  // Original filename
  fileSize  Int?     // Size in bytes
  mimeType  String?  // MIME type
  read      Boolean  @default(false)
  createdAt DateTime @default(now())

  chat      Chat     @relation(fields: [chatId], references: [id])

  @@index([chatId])
  @@index([createdAt])
}
```

## 🐛 Troubleshooting

### 1. Upload gagal dengan "File too large"

**Solusi:** File melebihi 5MB. Compress atau resize file terlebih dahulu.

### 2. Socket.IO tidak connect

**Solusi:**

```javascript
// Pastikan path dan transports correct
const socket = io(API_URL, {
  path: "/socket.io/", // WAJIB ada!
  transports: ["websocket"],
});
```

### 3. 404 Not Found pada endpoint upload

**Solusi:**

- Pastikan route sudah didaftarkan di `routes/index.js`
- Pastikan URL correct: `/api/chat/upload` (bukan `/api/upload`)

### 4. CORS error

**Solusi:** Update CORS config di `index.js`:

```javascript
app.use(
  cors({
    origin: ["https://your-frontend-domain.com"],
    credentials: true,
  })
);
```

### 5. MinIO upload gagal

**Solusi:** Check environment variables:

```env
MINIO_ENDPOINT=your-minio-endpoint
MINIO_ACCESS_KEY=your-access-key
MINIO_SECRET_KEY=your-secret-key
MINIO_BUCKET=uploads
```

## 🎨 Customization

### 1. Ubah file size limit

Edit `middleware/uploadMiddleware.js`:

```javascript
export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});
```

### 2. Tambah tipe file baru

Edit `middleware/uploadMiddleware.js`:

```javascript
const allowedTypes = [
  "image/jpeg",
  "image/png",
  "application/pdf",
  "video/mp4", // Tambahkan video
  "audio/mpeg", // Tambahkan audio
];
```

### 3. Custom UI

Edit `chat-upload-test.html` sesuai design Anda:

- CSS styling di `<style>` tag
- Chat bubble colors
- File icons
- Animations

## 📚 References

- [Multer Documentation](https://github.com/expressjs/multer)
- [Socket.IO Documentation](https://socket.io/docs/)
- [MinIO JavaScript SDK](https://min.io/docs/minio/linux/developers/javascript/minio-javascript.html)

## 🤝 Support

Jika ada masalah atau pertanyaan, silakan buat issue atau hubungi developer.

---

**Happy Coding!** 🚀💬📤
