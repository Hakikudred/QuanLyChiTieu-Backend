const pool = require('./db');

async function createAttendanceTable() {
    try {
        console.log('Creating attendance table...');

        await pool.execute(`
            CREATE TABLE IF NOT EXISTS attendance (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                date DATE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_user_date (user_id, date),
                FOREIGN KEY (user_id) REFERENCES user_profile(id) ON DELETE CASCADE
            )
        `);

        console.log('Attendance table created successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Error creating table:', err);
        process.exit(1);
    }
}

createAttendanceTable();
