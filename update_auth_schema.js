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
        console.log('Updating schema for Authentication...');

        // 1. Add password column
        try {
            await pool.query(`
                ALTER TABLE user_profile
                ADD COLUMN password VARCHAR(255) DEFAULT NULL;
            `);
            console.log('✅ Added password column.');
        } catch (e) {
            console.log('ℹ️ Password column might already exist:', e.message);
        }

        // 2. Modify ID to AUTO_INCREMENT (Critical for multiple users)
        try {
            // Modify ID to perform Auto Increment. 
            // Note: modifying Primary Key column can be sensitive.
            await pool.query(`
                ALTER TABLE user_profile
                MODIFY id INT AUTO_INCREMENT;
            `);
            console.log('✅ Modified ID to AUTO_INCREMENT.');
        } catch (e) {
            console.log('⚠️ Could not set AUTO_INCREMENT (might already be set):', e.message);
        }

        // 3. Make email UNIQUE
        try {
            await pool.query(`CREATE UNIQUE INDEX idx_email ON user_profile(email);`);
            console.log('✅ Added UNIQUE index on email.');
        } catch (e) {
            console.log('ℹ️ UNIQUE index on email might already exist:', e.message);
        }

    } catch (err) {
        console.error('❌ Error updating schema:', err.message);
    } finally {
        await pool.end();
    }
}

updateSchema();
