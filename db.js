const mysql = require('mysql2/promise');

// Create a connection pool to manage connections
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'quanlychitieu',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: '+07:00',
    ssl: {
        rejectUnauthorized: false
    }
});

console.log('✅ Connected to MySQL (Pool Created)');

module.exports = pool;
