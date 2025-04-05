var express = require("express");
var router = express.Router();
var db = require("../../db");
var adminRouter = require("./admin");
var apiRouter = require("./api");
var homeRouter = require("./homecontroller");

router.use(adminRouter);
router.use(apiRouter);
router.use(homeRouter);

router.get("/", function(req,res){
    res.render("home/index.ejs");
});



module.exports = router;