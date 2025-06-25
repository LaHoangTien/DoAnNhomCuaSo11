const jwt = require("jsonwebtoken");

const SECRET_KEY = "goK!pusp6ThEdURUtRenOwUhAsWUCLheBazl!uJLPlS8EbreWLdrupIwabRAsiBu"; // Đổi thành key bảo mật của bạn

function authenticate(req, res, next) {
    const token = req.cookies.token; // Lấy token từ Cookie

    if (!token) {
        return res.status(401).json({ message: "No token provided." });
    }

    jwt.verify(token, "goK!pusp6ThEdURUtRenOwUhAsWUCLheBazl!uJLPlS8EbreWLdrupIwabRAsiBu", (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: "Failed to authenticate token." });
        }

        req.user = decoded;

        
        res.locals.token = token; 
        res.locals.user = decoded;

        next();
    });
}
function authorizeAdmin(req, res, next) {
    if (req.user.role_id !== 1) {
        return res.redirect("/error");
    }
    next();
}

module.exports = { authenticate, authorizeAdmin };
