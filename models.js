const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true }, // Keeping String ID to match frontend UUIDs
    name: { type: String, required: true },
    price: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    category: String,
    type: { type: String, enum: ['income', 'expense'], default: 'expense' },
    participants: [{ name: String, amount: Number }]
});

const personSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true }
});

const Transaction = mongoose.model('Transaction', transactionSchema);
const Person = mongoose.model('Person', personSchema);

module.exports = { Transaction, Person };
