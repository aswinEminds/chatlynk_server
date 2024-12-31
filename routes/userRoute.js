const express = require("express");
const userController = require("../controllers/UserController");

// Initialize router
const router = express.Router();

// Route for user signup
router.post("/signup", userController.signup);

// Route for user login
router.post("/login", userController.login);

router.get("/getusers", userController.getUserController);
router.post("/sendfriendrequest", userController.sendFriendRequest);
router.get("/getfriendrequests", userController.getFriendRequests);
router.post("/updatefriendrequest", userController.updateFriendRequest);

module.exports = router;
