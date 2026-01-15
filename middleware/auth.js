const jwt = require('jsonwebtoken');
const JWT_SECRET = 'secret_key_change_me_later'; // TODO: match index.js

const authenticateToken = (req, res, next) => {
    // console.log(`[AUTH] Checking token for ${req.url}`);
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    console.log(`[AUTH] Header: ${authHeader} | Token: ${token}`);

    if (!token) {
        console.log(`[AUTH FAIL] No token provided for ${req.url}`);
        return res.sendStatus(401);
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.log(`[AUTH FAIL] Verify error: ${err.message}`);
            return res.sendStatus(403);
        }
        req.user = user;
        next();
    });
};

module.exports = authenticateToken;
