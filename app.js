var express = require("express");
var mysql = require("mysql2");
var bodyParser = require("body-parser");
var app = express();

var controller = require(__dirname + "/apps/controllers");

var db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "1",
    database: "movie_test"
});
const cookieParser = require("cookie-parser");
db.connect(function(err) {
    if (err) throw err;
    console.log("Connected to MySQL database!");
});
app.use(cookieParser()); // 👈 Thêm middleware này vào
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import router
const authRouter = require("./apps/controllers/auth");
app.use(authRouter);
app.use("/static", express.static(__dirname + "/public"));
app.set("view engine", "ejs");
app.set("views", __dirname + "/apps/views");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(controller);
var server = app.listen(3000, function(){
   console.log("server is running");
});