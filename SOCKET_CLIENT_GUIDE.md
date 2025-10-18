# 📱 Socket.IO Client Implementation Guide

## 🚀 Fitur yang Sudah Diperbaiki

✅ **Callback Support** - Server mengirim `callback({ success: true })` setelah terima pesan
✅ **Broadcast** - `io.to(chatId).emit('new_message', data)` ke semua client di room
✅ **Image Upload** - Support kirim gambar (jpg, png) via socket.io dengan base64
✅ **PDF Upload** - Support kirim file PDF via socket.io

---

## 📡 Socket.IO Events

### Server → Client Events

| Event | Description | Payload |
|-------|-------------|---------|
| `new_message` | Pesan baru masuk | `{ messageId, chatId, sender, type, content, sentAt }` |
| `error` | Terjadi error | `{ message: string }` |
| `user_joined` | User lain join room | `{ socketId, chatId, timestamp }` |
| `user_left` | User lain leave room | `{ socketId, chatId, timestamp }` |
| `doctor_ready` | Dokter sudah available | `{ chatId, doctorId, doctorName, timestamp }` |
| `message_deleted` | Pesan dihapus | `{ messageId, chatId }` |

### Client → Server Events

| Event | Description | Payload | Callback |
|-------|-------------|---------|----------|
| `join_chat` | Join ke chat room | `chatId: string` | - |
| `send_message` | Kirim pesan (text/image/file) | `{ chatId, sender, content, type, fileData }` | `{ success: boolean, data?: object, error?: string }` |
| `leave_chat` | Leave chat room | `chatId: string` | - |

---

## 💻 Client-Side Implementation

### 1. Install Socket.IO Client

```bash
npm install socket.io-client
# atau
yarn add socket.io-client
```

### 2. Initialize Socket Connection

```javascript
import { io } from "socket.io-client";

const socket = io("http://localhost:3000", {
  transports: ["websocket", "polling"],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5,
});

// Connection events
socket.on("connect", () => {
  console.log("✅ Connected to server:", socket.id);
});

socket.on("disconnect", () => {
  console.log("🔴 Disconnected from server");
});

socket.on("error", (error) => {
  console.error("❌ Socket error:", error);
});
```

### 3. Join Chat Room

```javascript
function joinChat(chatId) {
  socket.emit("join_chat", chatId);
  console.log(`👋 Joining chat: ${chatId}`);
}

// Listen for new messages in this room
socket.on("new_message", (data) => {
  console.log("📩 New message:", data);
  displayMessage(data); // Your function to show message in UI
});
```

### 4. Send Text Message (with Callback)

```javascript
function sendTextMessage(chatId, sender, content) {
  const payload = {
    chatId: chatId,
    sender: sender, // "user" or "doctor"
    content: content,
    type: "text"
  };

  // ✅ With callback to know if message was received
  socket.emit("send_message", payload, (response) => {
    if (response.success) {
      console.log("✅ Message sent successfully:", response.data);
      // Update UI to show message sent
      showMessageSent(response.data);
    } else {
      console.error("❌ Failed to send message:", response.error);
      // Show error to user
      showError(response.error);
    }
  });
}

// Usage:
sendTextMessage("chat123", "user", "Hello doctor!");
```

### 5. Send Image Message (Base64)

```javascript
function sendImageMessage(chatId, sender, imageFile) {
  const reader = new FileReader();
  
  reader.onload = function(e) {
    const base64Data = e.target.result; // "data:image/png;base64,iVBORw0KG..."
    
    const payload = {
      chatId: chatId,
      sender: sender,
      type: "image",
      fileData: base64Data, // Full data URI with prefix
      content: "" // Optional: caption
    };

    socket.emit("send_message", payload, (response) => {
      if (response.success) {
        console.log("✅ Image sent:", response.data);
        // Show image in chat
        displayImage(response.data.content); // MinIO URL
      } else {
        console.error("❌ Failed to send image:", response.error);
        showError(response.error);
      }
    });
  };

  reader.readAsDataURL(imageFile); // Convert to base64
}

// Usage with HTML input:
// <input type="file" id="imageInput" accept="image/*" />
document.getElementById("imageInput").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) {
    sendImageMessage("chat123", "user", file);
  }
});
```

### 6. Send PDF File

```javascript
function sendPdfFile(chatId, sender, pdfFile) {
  const reader = new FileReader();
  
  reader.onload = function(e) {
    const base64Data = e.target.result; // "data:application/pdf;base64,..."
    
    const payload = {
      chatId: chatId,
      sender: sender,
      type: "pdf",
      fileData: base64Data,
      content: "" // Optional: file description
    };

    socket.emit("send_message", payload, (response) => {
      if (response.success) {
        console.log("✅ PDF sent:", response.data);
        displayPdfLink(response.data.content); // MinIO URL
      } else {
        console.error("❌ Failed to send PDF:", response.error);
        showError(response.error);
      }
    });
  };

  reader.readAsDataURL(pdfFile);
}
```

---

## 🎨 React Component Example

```jsx
import { useEffect, useState } from "react";
import { io } from "socket.io-client";

function ChatComponent({ chatId, userId, userType }) {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Initialize socket
  useEffect(() => {
    const newSocket = io("http://localhost:3000");
    
    newSocket.on("connect", () => {
      console.log("✅ Connected");
      newSocket.emit("join_chat", chatId);
    });

    newSocket.on("new_message", (data) => {
      console.log("📩 New message:", data);
      setMessages((prev) => [...prev, data]);
    });

    newSocket.on("error", (error) => {
      alert("Error: " + error.message);
    });

    setSocket(newSocket);

    return () => {
      newSocket.emit("leave_chat", chatId);
      newSocket.close();
    };
  }, [chatId]);

  // Send text message
  const sendMessage = () => {
    if (!inputText.trim() || !socket) return;
    
    setIsSending(true);
    
    const payload = {
      chatId: chatId,
      sender: userType, // "user" or "doctor"
      content: inputText,
      type: "text"
    };

    socket.emit("send_message", payload, (response) => {
      setIsSending(false);
      
      if (response.success) {
        console.log("✅ Message sent");
        setInputText(""); // Clear input
      } else {
        alert("Failed: " + response.error);
      }
    });
  };

  // Send image
  const sendImage = (e) => {
    const file = e.target.files[0];
    if (!file || !socket) return;

    setIsSending(true);
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const payload = {
        chatId: chatId,
        sender: userType,
        type: "image",
        fileData: event.target.result
      };

      socket.emit("send_message", payload, (response) => {
        setIsSending(false);
        
        if (response.success) {
          console.log("✅ Image sent");
        } else {
          alert("Failed: " + response.error);
        }
      });
    };

    reader.readAsDataURL(file);
  };

  return (
    <div className="chat-container">
      <div className="messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.sender}`}>
            {msg.type === "text" && <p>{msg.content}</p>}
            {msg.type === "image" && <img src={msg.content} alt="sent" />}
            {msg.type === "pdf" && <a href={msg.content} target="_blank">📄 PDF File</a>}
            <span className="time">{new Date(msg.sentAt).toLocaleTimeString()}</span>
          </div>
        ))}
      </div>

      <div className="input-area">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Type a message..."
          disabled={isSending}
        />
        
        <input
          type="file"
          accept="image/*"
          onChange={sendImage}
          disabled={isSending}
          style={{ display: "none" }}
          id="imageUpload"
        />
        
        <label htmlFor="imageUpload">📷</label>
        
        <button onClick={sendMessage} disabled={isSending}>
          {isSending ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
}

export default ChatComponent;
```

---

## 🧪 Testing dengan HTML (Vanilla JS)

```html
<!DOCTYPE html>
<html>
<head>
  <title>Chat Test Client</title>
  <script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>
</head>
<body>
  <h1>Chat Test Client</h1>
  
  <div>
    <input type="text" id="chatId" placeholder="Chat ID" value="chat123" />
    <button onclick="joinChat()">Join Chat</button>
  </div>
  
  <div>
    <input type="text" id="messageInput" placeholder="Type message..." />
    <button onclick="sendText()">Send Text</button>
  </div>
  
  <div>
    <input type="file" id="imageInput" accept="image/*" onchange="sendImage()" />
    <label for="imageInput">📷 Send Image</label>
  </div>
  
  <div id="messages" style="border: 1px solid #ccc; height: 300px; overflow-y: auto; padding: 10px;"></div>

  <script>
    const socket = io("http://localhost:3000");
    let currentChatId = null;

    socket.on("connect", () => {
      console.log("✅ Connected:", socket.id);
      document.getElementById("messages").innerHTML += `<p>✅ Connected: ${socket.id}</p>`;
    });

    socket.on("new_message", (data) => {
      console.log("📩 New message:", data);
      const msgDiv = document.getElementById("messages");
      
      let content = '';
      if (data.type === 'text') {
        content = data.content;
      } else if (data.type === 'image') {
        content = `<img src="${data.content}" style="max-width: 200px;" />`;
      } else if (data.type === 'pdf') {
        content = `<a href="${data.content}" target="_blank">📄 PDF File</a>`;
      }
      
      msgDiv.innerHTML += `<p><strong>${data.sender}:</strong> ${content} <small>(${new Date(data.sentAt).toLocaleTimeString()})</small></p>`;
      msgDiv.scrollTop = msgDiv.scrollHeight;
    });

    socket.on("error", (error) => {
      alert("Error: " + error.message);
    });

    function joinChat() {
      currentChatId = document.getElementById("chatId").value;
      socket.emit("join_chat", currentChatId);
      console.log("👋 Joined chat:", currentChatId);
    }

    function sendText() {
      const content = document.getElementById("messageInput").value;
      if (!content.trim() || !currentChatId) return;

      const payload = {
        chatId: currentChatId,
        sender: "user", // or "doctor"
        content: content,
        type: "text"
      };

      socket.emit("send_message", payload, (response) => {
        if (response.success) {
          console.log("✅ Message sent:", response.data);
          document.getElementById("messageInput").value = "";
        } else {
          alert("Failed: " + response.error);
        }
      });
    }

    function sendImage() {
      const file = document.getElementById("imageInput").files[0];
      if (!file || !currentChatId) return;

      const reader = new FileReader();
      reader.onload = function(e) {
        const payload = {
          chatId: currentChatId,
          sender: "user",
          type: "image",
          fileData: e.target.result // Full data URI
        };

        socket.emit("send_message", payload, (response) => {
          if (response.success) {
            console.log("✅ Image sent:", response.data);
          } else {
            alert("Failed: " + response.error);
          }
        });
      };
      reader.readAsDataURL(file);
    }
  </script>
</body>
</html>
```

---

## 📝 Message Format Examples

### Text Message
```json
{
  "messageId": "clxxx123",
  "chatId": "chat123",
  "sender": "user",
  "type": "text",
  "content": "Hello doctor!",
  "sentAt": "2025-10-18T10:30:00.000Z"
}
```

### Image Message
```json
{
  "messageId": "clxxx124",
  "chatId": "chat123",
  "sender": "doctor",
  "type": "image",
  "content": "https://databasedokter-api.dokterapp.my.id/uploads/chat/uuid.jpg",
  "sentAt": "2025-10-18T10:31:00.000Z"
}
```

### PDF Message
```json
{
  "messageId": "clxxx125",
  "chatId": "chat123",
  "sender": "doctor",
  "type": "pdf",
  "content": "https://databasedokter-api.dokterapp.my.id/uploads/chat/uuid.pdf",
  "sentAt": "2025-10-18T10:32:00.000Z"
}
```

---

## 🔧 Troubleshooting

### Gambar tidak terkirim?
1. Pastikan file size < 5MB
2. Pastikan format: jpg, jpeg, png
3. Check console untuk error MinIO
4. Pastikan MinIO credentials di `.env` benar

### Callback tidak dipanggil?
1. Pastikan Socket.IO client version >= 4.0
2. Pastikan menggunakan parameter callback di `socket.emit()`
3. Check server logs untuk error

### Message tidak di-broadcast?
1. Pastikan sudah join chat room dulu (`join_chat`)
2. Check chatId benar
3. Pastikan chat.isActive = true di database

---

## 🚀 Performance Tips

1. **Compress Images** - Compress gambar sebelum kirim untuk mempercepat upload
2. **Show Loading** - Tampilkan loading indicator saat `isSending = true`
3. **Lazy Load Images** - Load gambar secara lazy di chat history
4. **Pagination** - Load message history dengan pagination (jangan semua sekaligus)

---

**Last Updated:** October 18, 2025  
**Server URL:** http://localhost:3000  
**Socket.IO Version:** 4.5.4+
