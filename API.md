# API Testing Guide

## Base URL

- Development: `http://localhost:3000`
- Production: `https://your-app.your-caprover-domain.com`

## Endpoints

### Health Check

```bash
GET /api/health
```

Response:

```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Users

#### Get all users

```bash
GET /api/users
```

#### Get user by ID

```bash
GET /api/users/:id
```

#### Create user

```bash
POST /api/users
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com"
}
```

#### Update user

```bash
PUT /api/users/:id
Content-Type: application/json

{
  "name": "John Updated",
  "email": "john.updated@example.com"
}
```

#### Delete user

```bash
DELETE /api/users/:id
```

### Chats

#### Get all chats

```bash
GET /api/chats
```

#### Get chat by ID

```bash
GET /api/chats/:id
```

#### Create chat

```bash
POST /api/chats
Content-Type: application/json

{
  "title": "General Discussion"
}
```

#### Update chat

```bash
PUT /api/chats/:id
Content-Type: application/json

{
  "title": "Updated Title"
}
```

#### Delete chat

```bash
DELETE /api/chats/:id
```

### Messages

#### Get all messages

```bash
GET /api/messages
GET /api/messages?chatId=1
GET /api/messages?userId=1
```

#### Get message by ID

```bash
GET /api/messages/:id
```

#### Create message

```bash
POST /api/messages
Content-Type: application/json

{
  "content": "Hello, how are you?",
  "chatId": 1,
  "userId": 1
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
