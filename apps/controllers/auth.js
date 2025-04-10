// filepath: c:\DoAnNhomCuaSo11\apps\controllers\auth.js
const express = require("express");
const router = express.Router();
const db = require("../../db");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const SECRET_KEY = "goK!pusp6ThEdURUtRenOwUhAsWUCLheBazl!uJLPlS8EbreWLdrupIwabRAsiBu"; // Đổi thành key bảo mật của bạn
// Đăng nhập
router.post("/api/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email  ) {
            return res.status(400).json({ message: "Vui lòng nhập email." });
        }
        if (!password) {
            return res.status(400).json({ message: "Vui lòng nhập mật khẩu." });
        }
        // Kiểm tra xem email hợp lệ
        const validator = require('validator');
        if (!validator.isEmail(email)) {
            return res.status(400).json({ message: "Email không hợp lệ." });
        }

        // Kiểm tra xem email có tồn tại không
        const [users] = await db.promise().query("SELECT * FROM users WHERE email = ?", [email]);
        if (users.length === 0) {
            return res.status(400).json({ message: "Email không chính xác" });
        }
        const user = users[0];
        // Kiểm tra độ dài mật khẩu (từ 8 đến 20 ký tự)
         if (password.length < 8 || password.length > 20) {
            return res.status(400).json({ message: "Mật khẩu phải từ 8 đến 20 ký tự." });
        }
        // Kiểm tra mật khẩu
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Mật khẩu không chính xác" });
        }

        // Tạo token
        const token = jwt.sign(
            { id: user.id, role_id: user.role_id, display_name: user.display_name },
            SECRET_KEY,
            { expiresIn: "1h" }
        );
        
        res.cookie("token", token, { httpOnly: true, secure: false }); // secure: true nếu dùng HTTPS
        res.json({ token, display_name: user.display_name, role_id: user.role_id });
    } catch (error) {
        console.error("Lỗi đăng nhập:", error);
        res.status(500).json({ message: "Lỗi máy chủ" });
    }
});

// Đăng ký
router.post("/api/register", async (req, res) => {
    try {
        const { email, display_name, password, confirmPassword } = req.body;
        const role_id = 2; // Mặc định role_id là 2 (User)

        // Kiểm tra các trường có đủ không
        if (!email || !display_name || !password || !confirmPassword) {
            return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin." });
        }

        // Kiểm tra mật khẩu nhập lại
        if (password !== confirmPassword) {
            return res.status(400).json({ message: "Mật khẩu xác nhận không khớp." });
        }
         // Kiểm tra độ dài mật khẩu (từ 8 đến 20 ký tự)
         if (password.length < 8 || password.length > 20) {
            return res.status(400).json({ message: "Mật khẩu phải từ 8 đến 20 ký tự." });
        }

        // Kiểm tra xem email hợp lệ
        const validator = require('validator');
        if (!validator.isEmail(email)) {
            return res.status(400).json({ message: "Email không hợp lệ." });
        }
        
        // Kiểm tra xem email đã tồn tại chưa
        const [existingUsers] = await db.promise().query("SELECT * FROM users WHERE email = ?", [email]);
        if (existingUsers.length > 0) {
            return res.status(400).json({ message: "Email đã được sử dụng." });
        }

        // Băm mật khẩu
        const hashedPassword = await bcrypt.hash(password, 10);

        // Thêm user vào cơ sở dữ liệu
        await db.promise().query(
            "INSERT INTO users (email, display_name, password, role_id) VALUES (?, ?, ?, ?)", 
            [email, display_name, hashedPassword, role_id]
        );

        res.json({ message: "Đăng ký thành công!" });
    } catch (error) {
        console.error("Lỗi đăng ký:", error);
        res.status(500).json({ message: "Lỗi máy chủ, vui lòng thử lại sau." });
    }
});

router.post("/logout", function (req, res) {
    res.clearCookie("token"); // Xóa token trong cookies
    res.json({ message: "Đăng xuất thành công!" });
});
router.get("/check-role", (req, res) => {
    const role_id = req.cookies.role_id; // Lấy role_id từ cookie
    res.json({ role_id });
});

// Giao diện đăng nhập
router.get("/login", (req, res) => {
    res.render("login.ejs");
});

// Giao diện đăng ký
router.get("/register", (req, res) => {
    res.render("register.ejs");
});

module.exports = router;