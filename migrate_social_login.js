const pool = require('./db');

async function migrate() {
    try {
        console.log('Starting migration for Social Login...');
        const connection = await pool.getConnection();

        // 1. Add auth_provider column
        try {
            await connection.query("ALTER TABLE user_profile ADD COLUMN auth_provider VARCHAR(20) DEFAULT 'local'");
            console.log('Added auth_provider column.');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') console.log('auth_provider column already exists.');
            else throw e;
        }

        // 2. Add provider_id column
        try {
            await connection.query("ALTER TABLE user_profile ADD COLUMN provider_id VARCHAR(255)");
            console.log('Added provider_id column.');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') console.log('provider_id column already exists.');
            else throw e;
        }

        // 3. Make password nullable
        try {
            await connection.query("ALTER TABLE user_profile MODIFY COLUMN password VARCHAR(255) NULL");
            console.log('Modified password column to be NULLABLE.');
        } catch (e) {
            console.log('Error modifying password column:', e.message);
        }

        console.log('Migration completed successfully.');
        connection.release();
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
