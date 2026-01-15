const mysql = require('mysql2/promise');

async function updateSchema() {
    const pool = mysql.createPool({
        host: 'localhost', user: 'root', password: '', database: 'quanlychitieu'
    });

    try {
        console.log('Adding user_id ownership columns...');

        // 1. Transactions
        try {
            await pool.query(`ALTER TABLE transactions ADD COLUMN user_id INT DEFAULT 1;`);
            console.log('✅ Added user_id to transactions');
        } catch (e) { console.log('ℹ️ transactions.user_id exists'); }

        // 2. People
        try {
            await pool.query(`ALTER TABLE people ADD COLUMN user_id INT DEFAULT 1;`);
            console.log('✅ Added user_id to people');
        } catch (e) { console.log('ℹ️ people.user_id exists'); }

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await pool.end();
    }
}

updateSchema();
