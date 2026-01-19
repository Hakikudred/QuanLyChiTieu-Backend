const mysql = require('mysql2/promise');

// Create a connection pool to manage connections
let pool;

if (process.env.DB_URI) {
    try {
        const url = new URL(process.env.DB_URI);
        console.log(`🔗 Connecting to DB Host: ${url.hostname} (Using DB_URI)`);
        pool = mysql.createPool({
            uri: process.env.DB_URI,
            ssl: { rejectUnauthorized: false }
        });
    } catch (e) {
        console.error('❌ Invalid DB_URI format:', e.message);
        pool = mysql.createPool({
            uri: process.env.DB_URI,
            ssl: { rejectUnauthorized: false }
        });
    }
} else {
    console.log('🔗 Connecting using individual DB_* variables...');
    pool = mysql.createPool({
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
}

console.log('✅ MySQL Pool Initialized');

module.exports = pool;
