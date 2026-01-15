const pool = require('./db');

async function fixConstraint() {
    try {
        console.log('Fixing people table constraint...');

        // 1. Drop existing unique index on 'name'
        // Note: The index name is usually 'name' if defined simply as UNIQUE key.
        // We'll try to drop it.
        try {
            await pool.execute('ALTER TABLE people DROP INDEX name');
            console.log('Dropped global unique index on "name".');
        } catch (e) {
            console.log('Could not drop index "name" (might not exist or different name):', e.message);
            // Try searching for the index if needed, but let's proceed to add new one
        }

        // 2. Add composite unique index (name + user_id)
        try {
            await pool.execute('ALTER TABLE people ADD UNIQUE INDEX unique_user_person (name, user_id)');
            console.log('Added composite unique index (name, user_id).');
        } catch (e) {
            if (e.code === 'ER_DUP_KEYNAME') {
                console.log('Index unique_user_person already exists.');
            } else {
                console.error('Error adding new index:', e.message);
            }
        }

        console.log('Done.');
        process.exit(0);
    } catch (err) {
        console.error('Fatal error:', err);
        process.exit(1);
    }
}

fixConstraint();
