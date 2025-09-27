const http = require("http");

const options = {
  host: "localhost",
  port: process.env.PORT || 3000,
  timeout: 2000,
  path: "/api/health",
};

const healthCheck = http.request(options, (res) => {
  console.log(`HEALTHCHECK STATUS: ${res.statusCode}`);
  if (res.statusCode == 200) {
    process.exit(0);
  } else {
    process.exit(1);
  }
});

healthCheck.on("error", function (err) {
  console.log("HEALTHCHECK ERROR");
  process.exit(1);
});

healthCheck.end();
