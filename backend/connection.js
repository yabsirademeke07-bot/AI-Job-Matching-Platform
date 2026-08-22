const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'job_matching',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
});

// Test connection on startup
pool.getConnection()
  .then((connection) => {
    console.log('✅ MySQL Database Connected Successfully');
    connection.release();
  })
  .catch((error) => {
    console.error('❌ Database Connection Failed:', error.message);
    console.error('Make sure:');
    console.error('  1. MySQL/MariaDB is running on', process.env.DB_HOST || 'localhost');
    console.error('  2. Database exists:', process.env.DB_NAME || 'job_matching');
    console.error('  3. Credentials are correct in .env file');
    process.exit(1);
  });

module.exports = pool;