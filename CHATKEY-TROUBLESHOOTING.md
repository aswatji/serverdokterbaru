# 🔧 Troubleshooting: ChatKey "chat123" Issue

## 🎯 Masalah

Backend mengembalikan `chatKey: "chat123"` instead of unique chatKey like `userId-doctorId`.

## 🔍 Penyebab

Ada beberapa kemungkinan:

1. **Data lama di database** - Chat dengan chatKey hardcoded dari testing
2. **Frontend mengirim userId/doctorId yang salah**
3. **Cache/state management issue di frontend**

## ✅ Solusi

### Step 1: Cek Data di Database

```bash
node check-chats.js
```

Output akan menunjukkan semua chat dan chatKey mereka. Cari yang berisi "chat123".

### Step 2: Fix ChatKey yang Salah

```bash
node fix-chatkeys.js
```

Script ini akan otomatis memperbaiki semua chatKey menjadi format `userId-doctorId`.

### Step 3: Cek Backend Logs

Restart server dan coba create chat lagi. Perhatikan logs:

```bash
npm start
```

Logs yang harus muncul:

```
🔍 createChat called with: { userId: '...', doctorId: '...' }
✅ Existing chat found: { id: '...', chatKey: 'userId-doctorId', ... }
📤 Returning chat data: { chatId: '...', chatKey: 'userId-doctorId' }
```

### Step 4: Cek Frontend Request

Di React Native, tambahkan log di `initializeChat`:

```typescript
const res = await api.post(
  "/chat",
  { userId: userData.id, doctorId: targetDoctorId },
  { headers: { Authorization: `Bearer ${token}` } }
);

console.log("🔍 Chat Data received from server:", res.data);
```

Output seharusnya:

```
🔍 Chat Data received from server: {
  success: true,
  data: {
    id: "...",
    chatKey: "userId-doctorId",  // ✅ BUKAN "chat123"
    userId: "...",
    doctorId: "..."
  }
}
```

## 🐛 Debugging Checklist

- [ ] Run `node check-chats.js` - ada "chat123" di database?
- [ ] Run `node fix-chatkeys.js` - perbaiki chatKey yang salah
- [ ] Restart server - `npm start`
- [ ] Cek backend logs saat POST /chat
- [ ] Cek frontend logs: `console.log("🔍 Chat Data received from server:", res.data)`
- [ ] Test dengan user & doctor baru (belum pernah chat)
- [ ] Test dengan user & doctor yang sudah pernah chat

## 🎯 Expected Behavior

| Scenario                        | Expected ChatKey                                      |
| ------------------------------- | ----------------------------------------------------- |
| User cmgrn... + Doctor cmgrn... | `cmgrnrdm20000j0kye93oa6bs-cmgrnylj20003j0ky8e5nhfzu` |
| New user + New doctor           | `[userId]-[doctorId]`                                 |
| Existing chat                   | Same as when created                                  |

## 🚨 Common Mistakes

❌ **SALAH:**

```typescript
// Frontend mengirim string hardcoded
{ userId: "chat123", doctorId: "test" }
```

✅ **BENAR:**

```typescript
// Frontend mengirim ID dari userData
{ userId: userData.id, doctorId: targetDoctorId }
```

## 📞 Next Steps

1. Run kedua script di atas
2. Share screenshot output dari:
   - `node check-chats.js`
   - Backend logs saat POST /chat
   - Frontend log `🔍 Chat Data received from server:`

Dengan info ini kita bisa identifikasi masalahnya dengan pasti! 🚀
