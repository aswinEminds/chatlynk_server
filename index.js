const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const { socketConnection } = require("./socket/socket");
const userRoute = require("./routes/userRoute");
const { dbConnect } = require("./config/config");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Pass the `io` instance to the socket setup
socketConnection(io);

//Routes
app.use("/api/users", userRoute);

//Initialization of DB connection
dbConnect();

app.get("/", (req, res) => {
  return res.json("Connected");
});

// Start the server on port 7878
server.listen(7878, () => {
  console.log("Server started successfully on port 7878");
});
