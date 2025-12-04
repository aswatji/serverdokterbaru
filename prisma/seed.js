import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Seed data untuk development
  console.log("Seeding data...");

  // Hapus data terkait terlebih dahulu untuk menghindari konflik foreign key
  await prisma.message.deleteMany({});
  await prisma.chat.deleteMany({});
  await prisma.consultation.deleteMany({});
  await prisma.doctorSchedule.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.doctor.deleteMany({});

  // Create sample patients
  const patient1 = await prisma.user.upsert({
    where: { email: "patient1@example.com" },
    update: {},
    create: {
      email: "patient1@example.com",
      fullname: "John Doe",
      password: await hash("password123", 12),
      profession: "Software Engineer",
    },
  });

  const patient2 = await prisma.user.upsert({
    where: { email: "patient2@example.com" },
    update: {},
    create: {
      email: "patient2@example.com",
      fullname: "Jane Smith",
      password: await hash("password123", 12),
      profession: "Teacher",
    },
  });

  // Create sample doctors
  const doctor1 = await prisma.doctor.create({
    data: {
      fullname: "Dr. Ahmad Sutanto",
      category: "Kardiologi",
      university: "Universitas Indonesia",
      strNumber: "STR-0001",
      gender: "male",
      email: "doctor1@example.com",
      password: await hash("password123", 12),
      bio: "Spesialis jantung dengan pengalaman 15 tahun",
    },
  });

  const doctor2 = await prisma.doctor.create({
    data: {
      fullname: "Dr. Sarah Wijaya",
      category: "Dermatologi",
      university: "Universitas Gadjah Mada",
      strNumber: "STR-0002",
      gender: "female",
      email: "doctor2@example.com",
      password: await hash("password123", 12),
      bio: "Spesialis kulit dan kelamin berpengalaman",
    },
  });

  // Create doctor schedules
  await prisma.doctorSchedule.createMany({
    data: [
      {
        doctorId: doctor1.id,
        dayOfWeek: 1, // Monday
        startTime: new Date("2024-01-01T09:00:00Z"),
        endTime: new Date("2024-01-01T17:00:00Z"),
      },
      {
        doctorId: doctor1.id,
        dayOfWeek: 3, // Wednesday
        startTime: new Date("2024-01-01T09:00:00Z"),
        endTime: new Date("2024-01-01T17:00:00Z"),
      },
      {
        doctorId: doctor2.id,
        dayOfWeek: 2, // Tuesday
        startTime: new Date("2024-01-01T10:00:00Z"),
        endTime: new Date("2024-01-01T16:00:00Z"),
      },
    ],
  });

  // Create sample payment
  const payment1 = await prisma.payment.create({
    data: {
      amount: 150000,
      status: "success",
    },
  });

  // Create sample consultation
  const consultation1 = await prisma.consultation.create({
    data: {
      patientId: patient1.id,
      doctorId: doctor1.id,
      paymentId: payment1.id,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
    },
  });

  // Create chat for the consultation
  const chat1 = await prisma.chat.create({
    data: {
      consultationId: consultation1.id,
    },
  });

  // Create sample messages
  await prisma.message.createMany({
    data: [
      {
        chatId: chat1.id,
        sender: "user",
        content: "Halo dokter, saya ingin konsultasi tentang nyeri dada",
        userId: patient1.id,
      },
      {
        chatId: chat1.id,
        sender: "doctor",
        content:
          "Halo, bisa ceritakan lebih detail tentang nyeri yang Anda rasakan?",
        doctorId: doctor1.id,
      },
      {
        chatId: chat1.id,
        sender: "user",
        content:
          "Nyerinya seperti ditusuk-tusuk dan sering terjadi saat beraktivitas",
        userId: patient1.id,
      },
    ],
  });

  // Create sample news
  await prisma.news.createMany({
    data: [
      {
        title: "Tips Menjaga Kesehatan Jantung",
        content:
          "Berikut adalah beberapa tips untuk menjaga kesehatan jantung Anda...",
      },
      {
        title: "Pentingnya Olahraga Rutin",
        content:
          "Olahraga rutin sangat penting untuk menjaga kesehatan tubuh...",
      },
    ],
  });

  // Create sample categories
  await prisma.category.createMany({
    data: [
      {
        name: "Spesialisasi Dokter",
        items: "Kardiologi, Dermatologi, Neurologi, Ortopedi",
      },
      {
        name: "Jenis Konsultasi",
        items: "Chat, Video Call, Audio Call",
      },
    ],
  });

  // ✅ Seed Chat Templates for all doctors
  console.log("🌱 Seeding Chat Templates...");
  
  const defaultTemplates = [
    // ETIKET
    {
      category: "etiket",
      title: "Sapaan",
      content: "Selamat pagi/siang/sore/malam. Terima kasih telah berkonsultasi dengan saya.",
    },
    {
      category: "etiket",
      title: "Penutup",
      content: "Semoga cepat sembuh. Jangan ragu untuk berkonsultasi kembali jika ada keluhan.",
    },
    // ANAMNESIS
    {
      category: "anamnesis",
      title: "Keluhan Utama",
      content: "Bisa tolong jelaskan keluhan yang Anda rasakan saat ini? Sejak kapan keluhan ini muncul?",
    },
    {
      category: "anamnesis",
      title: "Riwayat Penyakit",
      content: "Apakah Anda memiliki riwayat penyakit kronis seperti diabetes, hipertensi, atau asma?",
    },
    {
      category: "anamnesis",
      title: "Alergi Obat",
      content: "Apakah Anda memiliki alergi terhadap obat-obatan tertentu?",
    },
    // PENJELASAN
    {
      category: "penjelasan",
      title: "Diagnosis Sementara",
      content: "Berdasarkan gejala yang Anda sampaikan, kemungkinan Anda mengalami [diagnosis]. Namun, untuk memastikan diperlukan pemeriksaan lebih lanjut.",
    },
    {
      category: "penjelasan",
      title: "Cara Minum Obat",
      content: "Obat ini diminum [frekuensi] per hari, [waktu]. Pastikan diminum setelah makan untuk mengurangi efek samping pada lambung.",
    },
    // PELAKSANAAN
    {
      category: "pelaksanaan",
      title: "Istirahat Cukup",
      content: "Saya sarankan Anda untuk istirahat yang cukup minimal 7-8 jam per hari dan hindari aktivitas berat sementara waktu.",
    },
    {
      category: "pelaksanaan",
      title: "Minum Air Putih",
      content: "Pastikan Anda minum air putih minimal 2 liter (8 gelas) per hari untuk membantu proses penyembuhan.",
    },
    {
      category: "pelaksanaan",
      title: "Kompres Hangat",
      content: "Anda bisa mengompres bagian yang nyeri dengan air hangat selama 15-20 menit, 2-3 kali sehari.",
    },
    // LAB
    {
      category: "lab",
      title: "Tes Darah Lengkap",
      content: "Saya merekomendasikan Anda untuk melakukan pemeriksaan darah lengkap untuk melihat kondisi kesehatan Anda secara menyeluruh.",
    },
    {
      category: "lab",
      title: "Rontgen",
      content: "Untuk memastikan diagnosis, diperlukan pemeriksaan rontgen [bagian tubuh]. Silakan lakukan di laboratorium terdekat.",
    },
    // QUICK
    {
      category: "quick",
      title: "Baik, saya mengerti",
      content: "Baik, saya mengerti. Terima kasih atas informasinya.",
    },
    {
      category: "quick",
      title: "Mohon tunggu",
      content: "Mohon tunggu sebentar, saya akan memeriksa data Anda terlebih dahulu.",
    },
    {
      category: "quick",
      title: "Sudah saya resepkan",
      content: "Sudah saya resepkan obatnya. Silakan cek di menu resep dan lakukan pembayaran.",
    },
  ];

  // Get all doctors
  const doctors = await prisma.doctor.findMany({ select: { id: true, fullname: true } });
  
  for (const doctor of doctors) {
    console.log(`📝 Creating templates for ${doctor.fullname}...`);
    
    for (const template of defaultTemplates) {
      await prisma.chatTemplate.upsert({
        where: {
          doctorId_category_title: {
            doctorId: doctor.id,
            category: template.category,
            title: template.title,
          },
        },
        update: { content: template.content },
        create: {
          doctorId: doctor.id,
          category: template.category,
          title: template.title,
          content: template.content,
        },
      });
    }
    
    console.log(`✅ ${defaultTemplates.length} templates created for ${doctor.fullname}`);
  }

  console.log("✅ Chat Templates seeding completed!");
  console.log("Seeding completed successfully!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
