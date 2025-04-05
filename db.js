const mysql = require("mysql2");

const db = mysql.createPool({
    host: "localhost",
    user: "root", // Thay bằng user của bạn
    password: "1", // Thay bằng mật khẩu của bạn
    database: "movie_test", // Thay bằng tên database của bạn
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Kiểm tra kết nối
db.getConnection((err, connection) => {
    if (err) {
        console.error("Lỗi kết nối database:", err);
    } else {
        console.log("Kết nối database thành công!");
        connection.release();
    }
});

module.exports = db;
