const User = require("../models/UserModel"); // Import the User model
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { JWT_KEY } = require("../config/config"); // JWT secret key
const FriendRequestModel = require("../models/FriendRequestModel");
const RoomModel = require("../models/RoomModel");

class UserController {
  // Sign-Up Method
  async signup(req, res) {
    console.log(req.body);
    const { name, email, password } = req.body;
    try {
      // Check if the user already exists
      const userExists = await User.findOne({ email });
      if (userExists) {
        return res.status(400).json({ message: "User already exists." });
      }

      // Hash the password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Create a new user
      const newUser = new User({
        name,
        email,
        password: hashedPassword, // Store the hashed password
      });

      await newUser.save();

      // Generate a JWT token
      const token = jwt.sign(
        { id: newUser._id, email: newUser.email },
        JWT_KEY, // Use environment variable for security
        { expiresIn: "1h" }
      );

      return res.status(201).json({
        message: "User created successfully.",
        token, // Send the token in response
        user: { id: newUser._id, name: newUser.name, email: newUser.email },
      });
    } catch (error) {
      console.error("Signup Error:", error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }

  // Login Method
  async login(req, res) {
    const { email, password } = req.body;

    try {
      // Check if the user exists
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ message: "Invalid email or password." });
      }

      // Compare the password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(400).json({ message: "Invalid email or password." });
      }

      // Generate a JWT token
      const token = jwt.sign(
        { id: user._id, email: user.email },
        JWT_KEY, // Use environment variable for security
        { expiresIn: "1h" }
      );

      return res.status(200).json({
        message: "Login successful.",
        token, // Send the token in response
        user: { id: user._id, name: user.name, email: user.email },
      });
    } catch (error) {
      console.error("Login Error:", error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }

  // Search users
  async getUserController(req, res) {
    try {
      const { searchText, userId } = req.query;

      if (!searchText || !userId) {
        return res
          .status(400)
          .json({ message: "searchText and userId are required." });
      }

      // Search for users by name or email containing the search text
      const users = await User.find({
        $or: [{ name: { $regex: searchText, $options: "i" } }], // Match search text with name
        _id: { $ne: userId }, // Exclude the current user
      }).select("name email profilePic");

      const all = await User.find({});
      console.log(all);
      // Fetch friend requests where the user is either the sender or receiver
      const friendRequests = await FriendRequestModel.find({
        $or: [
          { sender: userId }, // Fetch requests where the user is the sender
          { receiver: userId }, // Fetch requests where the user is the receiver
        ],
      });

      // Map friend requests to a lookup table
      const friendRequestMap = {};
      friendRequests.forEach((request) => {
        const otherUserId =
          request.sender.toString() === userId.toString()
            ? request.receiver
            : request.sender; // Determine the other user based on sender/receiver
        if (otherUserId) {
          friendRequestMap[otherUserId.toString()] = request; // Add request to map
        }
      });

      // Attach friend request history to the user list
      const usersWithRequestHistory = users.map((user) => ({
        ...user.toObject(),
        friendRequest: friendRequestMap[user._id.toString()] || {}, // Include full JSON of request or empty object
      }));

      res.json(usersWithRequestHistory);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error." });
    }
  }

  //send request.
  async sendFriendRequest(req, res) {
    try {
      const { senderId, receiverId } = req.body;

      // Validate sender and receiver IDs
      if (!senderId || !receiverId) {
        return res
          .status(400)
          .json({ message: "Both senderId and receiverId are required." });
      }

      // Prevent self-requests
      if (senderId === receiverId) {
        return res
          .status(400)
          .json({ message: "You cannot send a friend request to yourself." });
      }

      // Check if the receiver exists
      const receiver = await User.findById(receiverId);
      if (!receiver) {
        return res.status(404).json({ message: "Receiver does not exist." });
      }

      // Check if a request already exists between the users
      const existingRequest = await FriendRequestModel.findOne({
        $or: [
          { sender: senderId, receiver: receiverId }, // sender to receiver
          { sender: receiverId, receiver: senderId }, // receiver to sender (in case of reversed request)
        ],
      });

      if (existingRequest) {
        return res
          .status(400)
          .json({ message: "Friend request already exists." });
      }

      // Create a new friend request
      const newRequest = new FriendRequestModel({
        sender: senderId,
        receiver: receiverId,
        status: "pending",
      });

      await newRequest.save();

      res.status(201).json({
        message: "Friend request sent successfully.",
        friendRequest: newRequest,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error." });
    }
  }

  // Get all friend requests
  async getFriendRequests(req, res) {
    try {
      const { userId } = req.query;
      console.log(userId);

      // Validate userId
      if (!userId) {
        return res
          .status(400)
          .json({ message: "User ID is required to fetch friend requests." });
      }

      const friendRequests = await FriendRequestModel.find({
        $and: [{ sender: userId }, { status: "pending" }],
      })
        .populate([
          { path: "sender", select: "name email profilePic" },
          { path: "receiver", select: "name email profilePic" },
        ])
        .sort({ updatedAt: -1 });

      // Return the friend requests
      return res.status(200).json({
        message: "Friend requests fetched successfully.",
        friendRequests,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Internal server error." });
    }
  }

  // Update accept FriendRequest
  async updateFriendRequest(req, res) {
    try {
      const { docId, status } = req.body;

      // Validate input
      if (!docId || !status) {
        return res
          .status(400)
          .json({ message: "docId and status are required." });
      }

      // Find and update the friend request
      const updatedRequest = await FriendRequestModel.findByIdAndUpdate(
        docId,
        { status }, // Update the status field
        { new: true } // Return the updated document
      );

      if (!updatedRequest) {
        return res.status(404).json({ message: "Friend request not found." });
      }

      return res.status(200).json({
        message: "Friend request updated successfully.",
        friendRequest: updatedRequest,
      });
    } catch (error) {
      console.error("Error updating friend request:", error);
      return res.status(500).json({ message: "Internal server error." });
    }
  }
}

const user_controller = new UserController();
module.exports = user_controller;
