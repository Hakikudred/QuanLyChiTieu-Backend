const pool = require('./db');
const bcrypt = require('bcryptjs');

async function seedUser() {
    try {
        console.log('Seeding default user...');
        const password = '123';
        const hashedPassword = await bcrypt.hash(password, 10);
        const email = 'user@example.com';
        const name = 'Người dùng mẫu';

        // Check if user ID 1 exists
        const [rows] = await pool.query('SELECT * FROM user_profile WHERE id = 1');

        if (rows.length > 0) {
            // Update existing user 1
            await pool.execute(
                'UPDATE user_profile SET email = ?, password = ?, name = COALESCE(name, ?) WHERE id = 1',
                [email, hashedPassword, name]
            );
            console.log('Updated User ID 1 with default credentials.');
        } else {
            // Insert new user if ID 1 doesn't exist (force ID 1 if possible, or just insert)
            // Note: Forcing ID might fail if auto_increment is higher, but we try insert normally.
            await pool.execute(
                'INSERT INTO user_profile (name, email, password) VALUES (?, ?, ?)',
                [name, email, hashedPassword]
            );
            console.log('Created new default user.');
        }

        console.log('------------------------------------------------');
        console.log('SUCCESS!');
        console.log('Email: ' + email);
        console.log('Password: ' + password);
        console.log('------------------------------------------------');

    } catch (err) {
        console.error('Error seeding user:', err);
    } finally {
        process.exit();
    }
}

seedUser();
