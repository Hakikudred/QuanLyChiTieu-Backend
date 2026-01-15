const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function setup() {
    try {
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '', // Default Laragon password
            multipleStatements: true
        });

        console.log('Connected to MySQL.');

        const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
        await connection.query(schema);

        console.log('Database and Tables created successfully.');
        await connection.end();
    } catch (err) {
        console.error('Error setting up MySQL:', err);
    }
}

setup();
