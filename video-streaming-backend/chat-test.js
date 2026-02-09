const { io } = require("socket.io-client");

const socket = io("http://localhost:3000", {
  auth: {
    token:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImRlYnVnQHRlc3QuY29tIiwic3ViIjoxLCJpYXQiOjE3Njk5NjMxNzUsImV4cCI6MTc3MDU2Nzk3NX0.TKE2UmI8rXuofng075JBeb6Ua-TGQcW3M3O1QtXsHuw",
  },
});

socket.on("connect", () => {
  console.log("✅ Connected");

  socket.emit("joinStream", 1);

  setTimeout(() => {
    socket.emit("chatMessage", {
      streamId: 1,
      message: "CHAT WORKING 🔥",
    });
  }, 1000);
});

socket.on("chatMessage", (msg) => {
  console.log("💬 Received:", msg);
});
