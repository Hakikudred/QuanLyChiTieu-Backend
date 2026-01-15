const pool = require('./db');

async function checkSchema() {
    try {
        const [rows] = await pool.query('DESCRIBE transactions');
        const columns = rows.map(r => r.Field);
        console.log('Columns:', columns.join(', '));
        process.exit(0);
    } catch (e) {
        console.error('Error:', e);
        process.exit(1);
    }
}

checkSchema();
