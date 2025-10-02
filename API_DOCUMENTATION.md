# Consultation Chat App API Documentation

## Overview

A comprehensive Node.js consultation chat application with paid sessions, real-time messaging, and payment integration using Midtrans.

## Base URL

```
http://localhost:3000/api
```

## Authentication

All protected endpoints require JWT token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

## API Endpoints

### Health Check

- **GET** `/health`
  - Check server status
  - No authentication required

### Users

- **GET** `/users` - Get all users (protected)
- **GET** `/users/:id` - Get user by ID (protected)
- **POST** `/users` - Create user
- **PUT** `/users/:id` - Update user (protected)
- **DELETE** `/users/:id` - Delete user (protected)
- **POST** `/users/login` - User login
- **POST** `/users/register` - User registration

### Doctors

- **GET** `/doctors` - Get all doctors
- **GET** `/doctors/:id` - Get doctor by ID
- **POST** `/doctors` - Create doctor (protected)
- **PUT** `/doctors/:id` - Update doctor (protected)
- **DELETE** `/doctors/:id` - Delete doctor (protected)
- **GET** `/doctors/:id/schedules` - Get doctor schedules

### Consultations

- **GET** `/consultations` - Get all consultations (protected)
- **GET** `/consultations/:id` - Get consultation by ID (protected)
- **POST** `/consultations` - Create consultation (protected)
- **PUT** `/consultations/:id` - Update consultation (protected)
- **DELETE** `/consultations/:id` - Delete consultation (protected)

### Payments

- **GET** `/payments` - Get all payments (protected)
- **GET** `/payments/:id` - Get payment by ID (protected)
- **POST** `/payments` - Create payment with Midtrans (protected)
- **POST** `/payments/midtrans/callback` - Midtrans webhook callback

### Chat & Messaging

- **GET** `/chats` - Get all chats (protected)
- **POST** `/chats/messages` - Send message to consultation chat (protected)
- **GET** `/chats/consultation/:consultationId/messages` - Get messages for consultation (protected)
- **GET** `/chats/consultation/:consultationId/status` - Get consultation status (protected)

### Messages (Legacy)

- **GET** `/messages` - Get all messages (protected)
- **GET** `/messages/:id` - Get message by ID (protected)
- **POST** `/messages` - Create message (protected)
- **PUT** `/messages/:id` - Update message (protected)
- **DELETE** `/messages/:id` - Delete message (protected)

### News

- **GET** `/news` - Get all news
- **GET** `/news/:id` - Get news by ID
- **POST** `/news` - Create news (protected)
- **PUT** `/news/:id` - Update news (protected)
- **DELETE** `/news/:id` - Delete news (protected)

### Categories

- **GET** `/categories` - Get all categories
- **GET** `/categories/:id` - Get category by ID
- **POST** `/categories` - Create category (protected)
- **PUT** `/categories/:id` - Update category (protected)
- **DELETE** `/categories/:id` - Delete category (protected)

## Real-time Features (Socket.IO)

### Connection

Connect to Socket.IO server with JWT authentication:

```javascript
const socket = io("http://localhost:3000", {
  auth: {
    token: "your-jwt-token",
  },
});
```

### Events

#### Client to Server

- `join_consultation` - Join a consultation room
- `leave_consultation` - Leave a consultation room
- `typing_start` - Start typing indicator
- `typing_stop` - Stop typing indicator

#### Server to Client

- `new_message` - Receive new message
- `user_joined` - User joined consultation
- `user_left` - User left consultation
- `user_typing` - Typing indicator
- `consultation_status_update` - Consultation status changed
- `new_consultation` - New consultation created (for doctors)
- `consultation_expiring` - Consultation expiring soon

## Request/Response Examples

### Send Message

**POST** `/chats/messages`

```json
{
  "consultationId": "consultation-id",
  "sender": "user", // "user" or "doctor"
  "content": "Hello doctor, I have a question..."
}
```

**Response:**

```json
{
  "success": true,
  "message": "Message sent successfully",
  "data": {
    "id": "message-id",
    "chatId": "chat-id",
    "sender": "user",
    "content": "Hello doctor, I have a question...",
    "sentAt": "2024-01-01T10:00:00.000Z",
    "user": {
      "id": "user-id",
      "fullname": "John Doe",
      "photo": "photo-url"
    }
  },
  "consultation": {
    "id": "consultation-id",
    "isActive": true,
    "expiresAt": "2024-01-01T10:30:00.000Z",
    "doctorAvailable": true
  }
}
```

### Create Payment

**POST** `/payments`

```json
{
  "doctorId": "doctor-id",
  "amount": 100000,
  "patientName": "John Doe",
  "patientEmail": "john@example.com",
  "patientPhone": "08123456789"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Payment created successfully",
  "data": {
    "redirectUrl": "https://app.sandbox.midtrans.com/snap/v2/vtweb/...",
    "token": "snap-token",
    "orderId": "payment-id",
    "payment": {
      "id": "payment-id",
      "amount": 100000,
      "status": "pending"
    }
  }
}
```

## Database Schema

### Key Models

- **User** - Patients using the app
- **Doctor** - Medical professionals
- **DoctorSchedule** - Doctor availability
- **Consultation** - Paid consultation sessions (30 min duration)
- **Payment** - Midtrans payment records
- **Chat** - One-to-one linked with consultations
- **Message** - Individual chat messages
- **News** - App news/articles
- **Category** - News categories

### Key Relationships

- User ↔ Consultation (as patient)
- Doctor ↔ Consultation
- Doctor ↔ DoctorSchedule (one-to-many)
- Payment ↔ Consultation (one-to-one)
- Consultation ↔ Chat (one-to-one)
- Chat ↔ Message (one-to-many)
- Message ↔ User/Doctor
- Category ↔ News (one-to-many)

## Environment Variables

```env
DATABASE_URL="postgresql://username:password@localhost:5432/dbname"
JWT_SECRET="your-jwt-secret"
MIDTRANS_SERVER_KEY="your-midtrans-server-key"
MIDTRANS_CLIENT_KEY="your-midtrans-client-key"
MIDTRANS_IS_PRODUCTION=false
PORT=3000
NODE_ENV=production
FRONTEND_URL="http://localhost:3000"
```

## Features

- ✅ User & Doctor Management
- ✅ JWT Authentication
- ✅ Paid Consultation Sessions (30 minutes)
- ✅ Real-time Chat with Socket.IO
- ✅ Payment Integration (Midtrans Snap)
- ✅ Doctor Schedule Validation
- ✅ Consultation Status & Expiry
- ✅ News & Categories Management
- ✅ Docker Support
- ✅ CapRover Deployment Ready

## Deployment

The app is containerized and ready for CapRover deployment with:

- Automatic database migrations
- Health checks
- Environment configuration
- Production optimizations
