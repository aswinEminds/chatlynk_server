const mongoose = require("mongoose");

const RoomSchema = new mongoose.Schema({
  roomId: {
    type: String,
    unique: true,
    required: true,
  },
  participants: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
    },
  ],
  lastMessage: {
    type: String,
    default: "",
  },
  isMessagesRead: {
    type: Boolean,
    default: false,
  },
  unreadMessageCount: {
    type: Number,
    default: 0,
  },
  unreadBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const RoomModel = mongoose.model("Room", RoomSchema);

module.exports = RoomModel;
