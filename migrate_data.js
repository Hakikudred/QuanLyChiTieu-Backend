const mongoose = require('mongoose');
const mysql = require('mysql2/promise');
const connectDB = require('./db');
const { Transaction, Person } = require('./models');

async function migrate() {
    try {
        // 1. Connect to MongoDB
        await connectDB();
        console.log('Connected to MongoDB.');

        // 2. Connect to MySQL
        const mysqlConn = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'quanlychitieu'
        });
        console.log('Connected to MySQL.');

        // 3. Migrate People
        const people = await Person.find();
        console.log(`Found ${people.length} people.`);
        for (const p of people) {
            try {
                await mysqlConn.execute('INSERT IGNORE INTO people (name) VALUES (?)', [p.name]);
            } catch (e) {
                console.error(`Error inserting person ${p.name}:`, e.message);
            }
        }
        console.log('People migration complete.');

        // 4. Migrate Transactions
        const transactions = await Transaction.find();
        console.log(`Found ${transactions.length} transactions.`);
        for (const t of transactions) {
            try {
                // Determine participants JSON
                let participants = [];
                if (t.participants && t.participants.length > 0) {
                    participants = t.participants;
                } else if (t.person) {
                    // Legacy fallback
                    participants = [{ name: t.person, amount: t.price }];
                }

                await mysqlConn.execute(
                    `INSERT IGNORE INTO transactions (id, name, price, date, category, type, participants) 
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [
                        t.id,
                        t.name,
                        t.price,
                        new Date(t.date),
                        t.category,
                        t.type || 'expense',
                        JSON.stringify(participants)
                    ]
                );
            } catch (e) {
                console.error(`Error inserting transaction ${t.id}:`, e.message);
            }
        }
        console.log('Transactions migration complete.');

        await mysqlConn.end();
        process.exit(0);

    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
