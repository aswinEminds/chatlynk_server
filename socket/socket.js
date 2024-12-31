const RoomModel = require("../models/RoomModel");

exports.socketConnection = (io) => {
  // Listen for client connections
  io.on("connection", (socket) => {
    const userId = socket.handshake.query.userId;
    console.log("A user connected:", socket.id);

    // Listen for messages from the client
    socket.on("messageFromClient", (msg) => {
      console.log("Received message from client:", msg);

      // Send the same message back to the client
      socket.emit("messageFromServer", `Server received: ${msg}`);
    });

    // Handle joining a room
    socket.on("joinRoom", async (receiverId) => {
      // Check if the room exists between userId and receiverId
      let room = await RoomModel.findOne({
        participants: { $all: [userId, receiverId] },
      });

      // If the room does not exist, create a new room
      if (!room) {
        room = await RoomModel.create({
          participants: [userId, receiverId],
          roomId: `${userId}_${receiverId}`,
        });
      }

      // Join the room
      socket.join(room.roomId);
      console.log(`Socket ${socket.id} joined room ${room.roomId}`);

      socket.currentRoomId = room.roomId; // Store the roomId on the socket
    });

    // Handle sending messages to the current room
    socket.on("message", (message) => {
      if (socket.currentRoomId) {
        socket.to(socket.currentRoomId).emit("receiveMessage", {
          message,
          senderId: userId,
        });
        console.log(`Message sent to room ${socket.currentRoomId}: ${message}`);
      } else {
        console.log("No room joined.");
      }
    });

    // Handle client disconnect
    socket.on("disconnect", () => {
      console.log("A user disconnected:", socket.id);
    });
  });
};
