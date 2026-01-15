const mysql = require('mysql2/promise');

async function updateSchema() {
    const pool = mysql.createPool({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'quanlychitieu',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });

    try {
        console.log('Adding new columns to user_profile...');

        const alterQuery = `
            ALTER TABLE user_profile
            ADD COLUMN gender VARCHAR(50) DEFAULT NULL,
            ADD COLUMN dob VARCHAR(50) DEFAULT NULL,
            ADD COLUMN cccd VARCHAR(50) DEFAULT NULL,
            ADD COLUMN bank_name VARCHAR(100) DEFAULT NULL,
            ADD COLUMN bank_account VARCHAR(50) DEFAULT NULL;
        `;

        await pool.query(alterQuery);
        console.log('✅ Schema updated successfully!');

    } catch (err) {
        console.error('❌ Error updating schema:', err.message);
    } finally {
        await pool.end();
    }
}

updateSchema();
