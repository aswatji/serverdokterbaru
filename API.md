# API Testing Guide - Consultation Chat App

## Base URL

- Development: `http://localhost:3000`
- Production: `https://your-app.your-caprover-domain.com`

## Overview

This API provides endpoints for a consultation chat application with paid sessions, supporting:

- User and Doctor management
- Paid consultation sessions
- Real-time messaging
- Payment processing (Midtrans integration)
- Doctor schedules
- News and categories

## Authentication

Most endpoints require authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer your-jwt-token
```

## Endpoints

### Health Check

```bash
GET /api/health
```

Response:

```json
{
  "success": true,
  "message": "Consultation App Server is running",
  "timestamp": "2025-09-28T00:00:00.000Z",
  "version": "2.0.0"
}
```

### Users (Patients)

#### Get all users

```bash
GET /api/users
```

#### Get user by ID

```bash
GET /api/users/:id
```

#### Create user (Register)

```bash
POST /api/users
Content-Type: application/json

{
  "fullname": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "profession": "Software Engineer",
  "photo": "https://example.com/photo.jpg"
}
```

#### Update user

```bash
PUT /api/users/:id
Content-Type: application/json

{
  "fullname": "John Updated",
  "email": "john.updated@example.com",
  "profession": "Senior Engineer",
  "photo": "https://example.com/new-photo.jpg"
}
```

#### Delete user

```bash
DELETE /api/users/:id
```

### Doctors

#### Get all doctors

```bash
GET /api/doctors
```

#### Get doctor by ID

```bash
GET /api/doctors/:id
```

#### Create doctor

```bash
POST /api/doctors
Content-Type: application/json

{
  "fullname": "Dr. Ahmad Sutanto",
  "category": "Kardiologi",
  "university": "Universitas Indonesia",
  "strNumber": "STR-0001",
  "gender": "male",
  "email": "doctor1@example.com",
  "password": "password123",
  "bio": "Spesialis jantung dengan pengalaman 15 tahun",
  "photo": "https://example.com/doctor.jpg"
}
```

#### Update doctor

```bash
PUT /api/doctors/:id
Content-Type: application/json

{
  "fullname": "Dr. Ahmad Sutanto, Sp.JP",
  "category": "Kardiologi",
  "university": "Universitas Indonesia",
  "strNumber": "STR-0001",
  "gender": "male",
  "email": "doctor1@example.com",
  "bio": "Updated bio...",
  "photo": "https://example.com/updated-photo.jpg"
}
```

#### Add doctor schedule

```bash
POST /api/doctors/:id/schedules
Content-Type: application/json

{
  "dayOfWeek": 1,
  "startTime": "2024-01-01T09:00:00Z",
  "endTime": "2024-01-01T17:00:00Z"
}
```

#### Update doctor schedule

```bash
PUT /api/doctors/schedules/:scheduleId
Content-Type: application/json

{
  "dayOfWeek": 2,
  "startTime": "2024-01-01T10:00:00Z",
  "endTime": "2024-01-01T16:00:00Z"
}
```

### Consultations

#### Get all consultations

```bash
GET /api/consultations
GET /api/consultations?patientId=user123
GET /api/consultations?doctorId=doctor123
GET /api/consultations?isActive=true
```

#### Get consultation by ID

```bash
GET /api/consultations/:id
```

#### Create consultation

```bash
POST /api/consultations
Content-Type: application/json

{
  "patientId": "user123",
  "doctorId": "doctor123",
  "paymentId": "payment123",
  "duration": 60
}
```

#### Update consultation

```bash
PUT /api/consultations/:id
Content-Type: application/json

{
  "paymentId": "payment456",
  "expiresAt": "2024-01-01T18:00:00Z",
  "isActive": false
}
```

#### End consultation

```bash
PUT /api/consultations/:id/end
```

### Payments

#### Get all payments

```bash
GET /api/payments
GET /api/payments?status=success
```

#### Get payment by ID

```bash
GET /api/payments/:id
```

#### Create payment

```bash
POST /api/payments
Content-Type: application/json

{
  "amount": 150000,
  "status": "pending"
}
```

#### Update payment status

```bash
PUT /api/payments/:id/status
Content-Type: application/json

{
  "status": "success"
}
```

#### Midtrans webhook

```bash
POST /api/payments/webhook/midtrans
Content-Type: application/json

{
  "order_id": "payment123",
  "transaction_status": "settlement",
  "fraud_status": "accept"
}
```

### Messages

#### Get all messages

```bash
GET /api/messages
GET /api/messages?chatId=chat123
GET /api/messages?userId=user123
GET /api/messages?doctorId=doctor123
```

#### Get message by ID

```bash
GET /api/messages/:id
```

#### Create message (Send message)

```bash
POST /api/messages
Content-Type: application/json

# User sending message
{
  "content": "Hello doctor, I have a question",
  "chatId": "chat123",
  "sender": "user",
  "userId": "user123"
}

# Doctor replying
{
  "content": "Hello, how can I help you?",
  "chatId": "chat123",
  "sender": "doctor",
  "doctorId": "doctor123"
}
```

#### Update message

```bash
PUT /api/messages/:id
Content-Type: application/json

{
  "content": "Updated message content"
}
```

#### Delete message

```bash
DELETE /api/messages/:id
```

### News

#### Get all news

```bash
GET /api/news
GET /api/news?search=kesehatan
```

#### Get news by ID

```bash
GET /api/news/:id
```

#### Create news

```bash
POST /api/news
Content-Type: application/json

{
  "title": "Tips Menjaga Kesehatan Jantung",
  "content": "Berikut adalah beberapa tips untuk menjaga kesehatan jantung..."
}
```

#### Update news

```bash
PUT /api/news/:id
Content-Type: application/json

{
  "title": "Updated Title",
  "content": "Updated content..."
}
```

### Categories

#### Get all categories

```bash
GET /api/categories
```

#### Create category

```bash
POST /api/categories
Content-Type: application/json

{
  "name": "Spesialisasi Dokter",
  "items": "Kardiologi, Dermatologi, Neurologi"
}
```

## Example with curl

### Test health check

```bash
curl http://localhost:3000/api/health
```

### Create a user

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name": "John Doe", "email": "john@example.com"}'
```

### Get all users

```bash
curl http://localhost:3000/api/users
```

### Create a chat

```bash
curl -X POST http://localhost:3000/api/chats \
  -H "Content-Type: application/json" \
  -d '{"title": "General Discussion"}'
```

### Create a message

```bash
curl -X POST http://localhost:3000/api/messages \
  -H "Content-Type: application/json" \
  -d '{"content": "Hello World!", "chatId": 1, "userId": 1}'
```

## Response Format

All API responses follow this format:

### Success Response

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... }
}
```

### Error Response

```json
{
  "success": false,
  "message": "Error description",
  "errors": [ ... ] // Optional validation errors
}
```
