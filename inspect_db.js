const pool = require('./db');

async function checkSchema() {
    try {
        console.log('Connecting to DB...');
        const [rows] = await pool.query('DESCRIBE transactions');
        console.log('--- TRANSACTIONS TABLE SCHEMA ---');
        rows.forEach(row => {
            console.log(`${row.Field} (${row.Type}) - Null: ${row.Null}`);
        });
        process.exit(0);
    } catch (e) {
        console.error('Error inspecting DB:', e);
        process.exit(1);
    }
}

checkSchema();
