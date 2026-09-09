const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'job_matching',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  connectTimeout: 10000,
  maxIdle: 10,
  idleTimeout: 60000,
});

// Test connection on startup
pool.getConnection()
  .then((connection) => {
    console.log(`✅ MySQL Database connected successfully to job_matching on port ${Number(process.env.DB_PORT) || 3306}`);
    connection.release();
  })
  .catch((error) => {
    console.error('❌ CRITICAL MYSQL CONNECTION ERROR:', error.code, error.message);
    console.error('Make sure:');
    console.error('  1. MySQL/MariaDB is running on', process.env.DB_HOST || 'localhost');
    console.error('  2. Database exists:', process.env.DB_NAME || 'job_matching');
    console.error('  3. Credentials are correct in .env file');
    process.exit(1);
  });

module.exports = pool;