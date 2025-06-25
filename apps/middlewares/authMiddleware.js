// filepath: c:\DoAnNhomCuaSo11\apps\middlewares\authMiddleware.js
const jwt = require('jsonwebtoken');
const db = require('../../db');
const secretKey = 'goK!pusp6ThEdURUtRenOwUhAsWUCLheBazl!uJLPlS8EbreWLdrupIwabRAsiBu'; // Thay thế bằng secret key của bạn

async function authenticateToken(req, res, next) {
    const authHeader = req.headers["authorization"];
    console.log("Authorization Header:", authHeader); // Debug xem token có gửi không
    
    const token = authHeader && authHeader.split(" ")[1];
    if (!token) return res.redirect("/error");

    try {
        const decoded = jwt.verify(token, secretKey);
        console.log("Decoded Token:", decoded); // Debug token
        
        const [users] = await db.promise().query("SELECT * FROM users WHERE id = ?", [decoded.id]);
        if (users.length === 0) {
            return res.status(403).json({ message: "Invalid token." });
        }

        req.user = users[0];
        next();
    } catch (error) {
        return res.status(403).json({ message: "Invalid token." });
    }
}


function authorizeRole(role) {
    return (req, res, next) => {
        if (req.user.role_id !== role) {
            return res.status(403).json({ message: "Access denied." });
        }
        next();
    };
}

module.exports = { authenticateToken, authorizeRole };