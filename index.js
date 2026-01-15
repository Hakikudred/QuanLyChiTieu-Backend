require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const pool = require('./db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const authenticateToken = require('./middleware/auth');

// EMAIL CONFIG
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'secret_key_change_me_later';

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Log Requests
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// --- AUTH / OTP API (v1.1) ---

// Gửi mã OTP
app.post('/auth/send-otp', async (req, res) => {
    const { email } = req.body;
    try {
        if (!email) return res.status(400).json({ error: 'Email is required' });

        // Tạo mã 6 số
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 phút

        // Lưu vào DB
        await pool.execute(
            'INSERT INTO otp_verifications (email, otp, expires_at) VALUES (?, ?, ?)',
            [email, otp, expiresAt]
        );

        // Gửi Mail
        const mailOptions = {
            from: `"Quản Lý Chi Tiêu" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Mã xác thực đăng ký của bạn',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                    <h2 style="color: #007AFF;">Xác thực tài khoản</h2>
                    <p>Chào bạn, mã xác thực (OTP) để đăng ký tài khoản của bạn là:</p>
                    <div style="background: #F2F2F7; padding: 15px; font-size: 24px; font-weight: bold; text-align: center; border-radius: 10px; color: #007AFF; letter-spacing: 5px;">
                        ${otp}
                    </div>
                    <p>Mã này có hiệu lực trong vòng <b>5 phút</b>. Vui lòng không cung cấp mã này cho bất kỳ ai.</p>
                </div>
            `
        };

        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.error('[OTP ERROR] EMAIL_USER or EMAIL_PASS not configured');
            return res.status(500).json({ error: 'Server cấu hình thiếu Email (Env vars missing)' });
        }

        await transporter.sendMail(mailOptions);
        res.json({ message: 'OTP sent to your email' });
    } catch (err) {
        console.error('[OTP ERROR DETAILED]', err);
        res.status(500).json({ error: `Gửi OTP thất bại: ${err.message}` });
    }
});

// Register
app.post('/register', async (req, res) => {
    const { name, email, password, otp } = req.body;
    try {
        if (!email || !password || !otp) return res.status(400).json({ error: 'Thiếu thông tin hoặc mã OTP' });

        // Kiểm tra OTP
        const [rows] = await pool.query(
            'SELECT * FROM otp_verifications WHERE email = ? AND otp = ? AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
            [email, otp]
        );

        if (rows.length === 0) {
            return res.status(400).json({ error: 'Mã OTP không chính xác hoặc đã hết hạn' });
        }

        // Nếu mã đúng -> Xóa mã đã dùng
        await pool.execute('DELETE FROM otp_verifications WHERE email = ?', [email]);

        // Tạo User
        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await pool.execute(
            'INSERT INTO user_profile (name, email, password) VALUES (?, ?, ?)',
            [name || 'New User', email, hashedPassword]
        );

        res.status(201).json({ message: 'Registered successfully', userId: result.insertId });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Email đã tồn tại' });
        }
        res.status(500).json({ error: err.message });
    }
});

// Login
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const [rows] = await pool.query('SELECT * FROM user_profile WHERE email = ?', [email]);
        if (rows.length === 0) return res.status(401).json({ error: 'Email hoặc mật khẩu không chính xác' });

        const user = rows[0];
        // For legacy users without password, you might want to handle differently
        if (!user.password) return res.status(401).json({ error: 'Tài khoản cũ chưa có mật khẩu. Vui lòng liên hệ admin.' });

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(401).json({ error: 'Email hoặc mật khẩu không chính xác' });

        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Social Login
app.post('/auth/social', async (req, res) => {
    console.log('[SOCIAL LOGIN] Request received:', req.body);
    const { provider, email, name, providerId } = req.body;
    try {
        // Find user by email
        const [rows] = await pool.query('SELECT * FROM user_profile WHERE email = ?', [email]);
        console.log('[SOCIAL LOGIN] User Search Result:', rows.length > 0 ? 'Found' : 'New User');

        let user;
        if (rows.length > 0) {
            user = rows[0];
            // Update provider info if missing (link account)
            if (!user.provider_id) {
                await pool.execute('UPDATE user_profile SET auth_provider=?, provider_id=? WHERE id=?', [provider, providerId, user.id]);
            }
        } else {
            // Create new user
            const [result] = await pool.execute(
                'INSERT INTO user_profile (name, email, auth_provider, provider_id) VALUES (?, ?, ?, ?)',
                [name, email, provider, providerId]
            );
            user = { id: result.insertId, name, email, avatar: null }; // Minimally required fields
        }

        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
        console.log('[SOCIAL LOGIN] Successful. Token generated.');
        res.json({ token, user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar } });
    } catch (err) {
        console.error('[SOCIAL LOGIN] Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Change Password
app.post('/change-password', authenticateToken, async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    try {
        if (!oldPassword || !newPassword) return res.status(400).json({ error: 'Missing fields' });

        const [rows] = await pool.query('SELECT password FROM user_profile WHERE id = ?', [req.user.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'User not found' });

        const user = rows[0];
        if (!user.password) return res.status(400).json({ error: 'Account has no password set' });

        const validPassword = await bcrypt.compare(oldPassword, user.password);
        if (!validPassword) return res.status(400).json({ error: 'Incorrect old password' });

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await pool.execute('UPDATE user_profile SET password = ? WHERE id = ?', [hashedPassword, req.user.id]);

        res.json({ message: 'Password updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- TRANSACTIONS API ---

// Get All Transactions (User Specific)
app.get('/transactions', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC', [req.user.id]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add Transaction
app.post('/transactions', authenticateToken, async (req, res) => {
    const { id, name, price, category, type, date, note, imageUri, participants, paidBy } = req.body;
    try {
        // Use ID from frontend or generate one if missing
        const transId = id ? id.toString() : Date.now().toString();

        // Convert ISO date to MySQL format (YYYY-MM-DD HH:MM:SS) in Vietnam Timezone
        const formattedDate = date
            ? new Date(date).toLocaleString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).replace('T', ' ')
            : new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).replace('T', ' ');

        await pool.execute(
            'INSERT INTO transactions (id, name, price, category, type, date, note, imageUri, participants, paidBy, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                transId,
                name,
                price,
                category,
                type || 'expense',
                formattedDate,
                note || null,
                imageUri || null,
                participants ? JSON.stringify(participants) : null,
                paidBy || null,
                req.user.id
            ]
        );
        res.json({ id: transId, ...req.body });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete Transaction
app.delete('/transactions/:id', authenticateToken, async (req, res) => {
    try {
        const [result] = await pool.execute('DELETE FROM transactions WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Not found or denied' });
        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update Transaction
app.put('/transactions/:id', authenticateToken, async (req, res) => {
    const { name, price, category, type, date, note, imageUri, participants, paidBy } = req.body;
    try {
        // Convert ISO date to MySQL format in Vietnam Timezone
        const formattedDate = date
            ? new Date(date).toLocaleString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).replace('T', ' ')
            : new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).replace('T', ' ');

        const [result] = await pool.execute(
            'UPDATE transactions SET name=?, price=?, category=?, type=?, date=?, note=?, imageUri=?, participants=?, paidBy=? WHERE id=? AND user_id=?',
            [
                name,
                price,
                category,
                type || 'expense',
                formattedDate,
                note || null,
                imageUri || null,
                participants ? JSON.stringify(participants) : null,
                paidBy || null,
                req.params.id,
                req.user.id
            ]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Not found or denied' });
        res.json({ message: 'Updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- PEOPLE API (Splitting Bill) ---

app.get('/people', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM people WHERE user_id = ?', [req.user.id]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/people', authenticateToken, async (req, res) => {
    const { name } = req.body;
    try {
        const [result] = await pool.execute('INSERT INTO people (name, user_id) VALUES (?, ?)', [name, req.user.id]);
        res.json({ id: result.insertId, name });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Rename Person
app.put('/people/:id', authenticateToken, async (req, res) => {
    const { name } = req.body;
    try {
        const [result] = await pool.execute('UPDATE people SET name=? WHERE id=? AND user_id=?', [name, req.params.id, req.user.id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Not found or denied' });
        res.json({ message: 'Updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/people/:id', authenticateToken, async (req, res) => {
    try {
        const [result] = await pool.execute('DELETE FROM people WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- USER PROFILE API ---

app.get('/profile', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM user_profile WHERE id = ?', [req.user.id]);
        if (rows.length > 0) {
            res.json(rows[0]);
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/profile', authenticateToken, async (req, res) => {
    try {
        console.log(`[PROFILE UPDATE] Request from User ID: ${req.user.id}`);
        const { name, email, avatar, gender, dob, cccd, bank_name, bank_account } = req.body;

        // Chuyển đổi dob từ DD/MM/YYYY sang YYYY-MM-DD cho MySQL
        let formattedDob = null;
        if (dob && dob.includes('/')) {
            const [day, month, year] = dob.split('/');
            formattedDob = `${year}-${month}-${day}`;
        } else if (dob && dob.includes('-')) {
            formattedDob = dob; // Đã đúng định dạng
        }

        console.log(`[PROFILE UPDATE] Data: name=${name}, email=${email}, dob=${formattedDob}`);

        await pool.execute(
            `UPDATE user_profile 
             SET name=?, email=?, avatar=?, gender=?, dob=?, cccd=?, bank_name=?, bank_account=? 
             WHERE id=?`,
            [name, email, avatar || null, gender || null, formattedDob, cccd || null, bank_name || null, bank_account || null, req.user.id]
        );

        console.log('[PROFILE UPDATE] Success');
        res.json({ message: 'Profile updated' });
    } catch (err) {
        console.error('[PROFILE UPDATE] Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// --- ATTENDANCE API ---

app.get('/attendance', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT date FROM attendance WHERE user_id = ?', [req.user.id]);
        const markedDates = rows.map(row => {
            // Using sv-SE locale with Asia/Ho_Chi_Minh timezone gives YYYY-MM-DD format correctly.
            const d = new Date(row.date);
            return d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });
        });
        res.json(markedDates);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/attendance', authenticateToken, async (req, res) => {
    try {
        // Get "Today" in Vietnam Time (UTC+7)
        const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });

        await pool.execute('INSERT IGNORE INTO attendance (user_id, date) VALUES (?, ?)', [req.user.id, today]);
        res.json({ message: 'Checked in successfully', date: today });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT} (MySQL Version)`);
});
