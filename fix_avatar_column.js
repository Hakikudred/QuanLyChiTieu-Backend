const pool = require('./db');

async function fixAvatarColumn() {
    try {
        console.log('Checking avatar column...');

        // Check current column type
        const [rows] = await pool.query(`SHOW COLUMNS FROM user_profile LIKE 'avatar'`);
        if (rows.length > 0) {
            console.log('Current Type:', rows[0].Type);

            // If it's not longtext, change it
            if (rows[0].Type.toLowerCase().includes('varchar') || rows[0].Type.toLowerCase().includes('text')) {
                // Determine if we need to upgrade
                // MEDIUMTEXT = 16MB, LONGTEXT = 4GB. LONGTEXT is safe.
                if (rows[0].Type.toLowerCase() !== 'longtext') {
                    console.log('Upgrading avatar column to LONGTEXT...');
                    await pool.execute('ALTER TABLE user_profile MODIFY COLUMN avatar LONGTEXT');
                    console.log('Done.');
                } else {
                    console.log('Avatar column is already LONGTEXT.');
                }
            }
        } else {
            console.log('Avatar column not found?');
        }

        process.exit(0);
    } catch (err) {
        console.error('Fatal error:', err);
        process.exit(1);
    }
}

fixAvatarColumn();
