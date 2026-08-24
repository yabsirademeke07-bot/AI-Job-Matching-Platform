const mysql = require("mysql2/promise"); // /promise የሚለውን መጨመራችንን አስተውል!

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "job_matching",
});

console.log("MariaDB Connected Successfully ✅");

module.exports = pool;
