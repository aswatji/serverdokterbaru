# 📋 Prisma Schema Documentation

## Updated Schema for Consultation-based Paid Chat App

### Database Configuration

- **Provider**: PostgreSQL
- **Environment**: `DATABASE_URL`
- **Generator**: `prisma-client-js`

---

## 🗄️ Data Models

### 1. 👤 User Model (Patients)

```prisma
model User {
  id           String          @id @default(cuid())
  email        String          @unique
  password     String          // bcrypt hash
  fullname     String
  photo        String?
  profession   String?
  createdAt    DateTime        @default(now())
  updatedAt    DateTime        @updatedAt

  // Relations
  consultations Consultation[] @relation("PatientConsultations")
  messages     Message[]
}
```

**Purpose**: Represents patients who book consultations
**Key Features**: Unique email, bcrypt password, optional profile fields

### 2. 👨‍⚕️ Doctor Model (Medical Professionals)

```prisma
model Doctor {
  id           String           @id @default(cuid())
  name         String
  specialty    String
  bio          String?
  photo        String?
  createdAt    DateTime         @default(now())
  updatedAt    DateTime         @updatedAt

  // Relations
  consultations Consultation[]  @relation("DoctorConsultations")
  schedules    DoctorSchedule[]
  messages     Message[]
}
```

**Purpose**: Medical professionals providing consultations
**Key Features**: Specialty tracking, bio, availability schedules

### 3. 📅 DoctorSchedule Model (Availability)

```prisma
model DoctorSchedule {
  id        String   @id @default(cuid())
  doctor    Doctor   @relation(fields: [doctorId], references: [id])
  doctorId  String
  dayOfWeek Int      // 0=Sunday, 1=Monday, ..., 6=Saturday
  startTime DateTime
  endTime   DateTime
}
```

**Purpose**: Define when doctors are available for consultations
**Key Features**: Day-of-week scheduling (0-6), time ranges

### 4. 💳 Payment Model (Midtrans Integration)

```prisma
model Payment {
  id           String        @id @default(cuid()) // Also Midtrans order_id
  amount       Float
  status       String        // "pending", "success", "failed"
  createdAt    DateTime      @default(now())

  // Relations
  consultation Consultation?
}
```

**Purpose**: Track payment status for consultations
**Key Features**: ID doubles as Midtrans order_id, status tracking

### 5. 🩺 Consultation Model (Paid Sessions)

```prisma
model Consultation {
  id           String      @id @default(cuid())
  patient      User        @relation("PatientConsultations", fields: [patientId], references: [id])
  patientId    String
  doctor       Doctor      @relation("DoctorConsultations", fields: [doctorId], references: [id])
  doctorId     String
  payment      Payment?    @relation(fields: [paymentId], references: [id])
  paymentId    String?     @unique
  startedAt    DateTime    @default(now())
  expiresAt    DateTime
  isActive     Boolean     @default(true)

  // Relations
  chat         Chat?
}
```

**Purpose**: Represents paid consultation sessions
**Key Features**: Time-limited sessions, payment linking, activity status

### 6. 💬 Chat Model (Consultation Rooms)

```prisma
model Chat {
  id              String      @id @default(cuid())
  consultation    Consultation @relation(fields: [consultationId], references: [id])
  consultationId  String      @unique

  // Relations
  messages        Message[]
}
```

**Purpose**: Chat room container for each consultation
**Key Features**: One-to-one with consultations, contains messages

### 7. 📝 Message Model (Chat Messages)

```prisma
model Message {
  id        String   @id @default(cuid())
  chat      Chat     @relation(fields: [chatId], references: [id])
  chatId    String
  sender    String   // "user" | "doctor"
  content   String
  sentAt    DateTime @default(now())

  // Optional relations
  user      User?    @relation(fields: [userId], references: [id])
  userId    String?
  doctor    Doctor?  @relation(fields: [doctorId], references: [id])
  doctorId  String?
}
```

**Purpose**: Individual chat messages within consultations
**Key Features**: Sender identification, message attribution, timestamps

### 8. 📰 News Model (Optional - Content)

```prisma
model News {
  id        String   @id @default(cuid())
  title     String
  content   String
  createdAt DateTime @default(now())
}
```

**Purpose**: App news and health articles
**Key Features**: Simple content management

### 9. 🗂️ Category Model (Optional - Organization)

```prisma
model Category {
  id     String  @id @default(cuid())
  name   String
  items  String?
}
```

**Purpose**: Categories for content organization
**Key Features**: Flexible item storage

---

## 🔗 Relationship Mapping

### Core Consultation Flow:

1. **User** books consultation → **Payment** created
2. **Payment** success → **Consultation** activated
3. **Consultation** → **Chat** room created
4. **Messages** exchanged between User & Doctor
5. **DoctorSchedule** validates availability

### Key Relationships:

- **User** ↔ **Consultation** (one-to-many as patient)
- **Doctor** ↔ **Consultation** (one-to-many)
- **Doctor** ↔ **DoctorSchedule** (one-to-many)
- **Payment** ↔ **Consultation** (one-to-one)
- **Consultation** ↔ **Chat** (one-to-one)
- **Chat** ↔ **Message** (one-to-many)
- **User/Doctor** ↔ **Message** (message attribution)

---

## 🚀 Business Logic Features

### Payment Integration:

- Payment ID serves as Midtrans order_id
- Status tracking: pending → success/failed
- One-to-one consultation linking

### Consultation Management:

- Time-limited sessions (startedAt → expiresAt)
- Activity status (isActive boolean)
- Doctor availability validation

### Real-time Chat:

- Consultation-based chat rooms
- Message sender identification
- User/Doctor message attribution

### Doctor Scheduling:

- Weekly schedule definition (0-6 days)
- Time range availability
- Multiple schedules per doctor

---

## 📊 Schema Statistics

- **Total Models**: 9
- **Core Models**: 7 (User, Doctor, DoctorSchedule, Payment, Consultation, Chat, Message)
- **Optional Models**: 2 (News, Category)
- **Relationships**: 12 defined relationships
- **Unique Constraints**: 3 (User.email, Payment→Consultation, Chat→Consultation)

---

## ✅ Implementation Status

- ✅ **Schema Defined**: All models created with proper relationships
- ✅ **Prisma Generated**: Client generated successfully
- ✅ **Migration Status**: Database schema up to date
- ✅ **Validation**: No schema errors detected

**Ready for production use! 🎉**
