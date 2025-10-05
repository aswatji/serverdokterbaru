// Test doctor registration with alamatRumahSakit
const http = require("http");

console.log("Testing Doctor Registration with alamatRumahSakit...");

const testData = JSON.stringify({
  email: "dr.hospital.test@gmail.com",
  password: "securepass123",
  fullname: "Dr. Hospital Test",
  category: "Spesialis Jantung",
  university: "Universitas Indonesia",
  strNumber: "STR202310099",
  gender: "FEMALE",
  alamatRumahSakit:
    "RS Cipto Mangunkusumo, Jl. Diponegoro No.71, Jakarta Pusat",
});

const options = {
  hostname: "localhost",
  port: 3000,
  path: "/api/auth/doctor/register",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(testData),
  },
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);

  let data = "";
  res.on("data", (chunk) => (data += chunk));
  res.on("end", () => {
    try {
      const response = JSON.parse(data);
      console.log("Response:", JSON.stringify(response, null, 2));

      if (response.success && response.data.alamatRumahSakit) {
        console.log("\n✅ SUCCESS: alamatRumahSakit field working correctly!");
        console.log("Hospital Address:", response.data.alamatRumahSakit);
      } else {
        console.log("\n❌ ISSUE: alamatRumahSakit field might not be working");
      }
    } catch (e) {
      console.log("Raw response:", data);
    }
  });
});

req.on("error", (e) => console.error("Error:", e.message));
req.write(testData);
req.end();
