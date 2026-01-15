const pool = require('./db');

async function updateSchema() {
    try {
        console.log('Checking and updating schema...');

        // Add 'paidBy'
        try {
            await pool.query('ALTER TABLE transactions ADD COLUMN paidBy VARCHAR(255)');
            console.log('Added paidBy column');
        } catch (e) {
            if (e.code !== 'ER_DUP_FIELDNAME') console.log('paidBy exists or error:', e.message);
        }

        // Add 'note'
        try {
            await pool.query('ALTER TABLE transactions ADD COLUMN note TEXT');
            console.log('Added note column');
        } catch (e) {
            if (e.code !== 'ER_DUP_FIELDNAME') console.log('note exists or error:', e.message);
        }

        // Add 'imageUri'
        try {
            await pool.query('ALTER TABLE transactions ADD COLUMN imageUri VARCHAR(500)');
            console.log('Added imageUri column');
        } catch (e) {
            if (e.code !== 'ER_DUP_FIELDNAME') console.log('imageUri exists or error:', e.message);
        }

        // Add 'user_id' just in case (though inspect showed it might be there)
        try {
            await pool.query('ALTER TABLE transactions ADD COLUMN user_id INT');
            console.log('Added user_id column');
        } catch (e) {
            if (e.code !== 'ER_DUP_FIELDNAME') console.log('user_id exists or error:', e.message);
        }

        process.exit(0);
    } catch (e) {
        console.error('Migration failed:', e);
        process.exit(1);
    }
}

updateSchema();
