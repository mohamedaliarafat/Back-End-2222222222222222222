// config/socket.js
const socketIO = require('socket.io');

const configureSocket = (server) => {
  const io = socketIO(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const userSockets = new Map(); // تخزين اتصالات المستخدمين

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // انضمام المستخدم لغرفته
    socket.on("joinUser", (userId) => {
      userSockets.set(userId, socket.id);
      socket.join(userId);
      console.log(`User ${userId} joined with socket ${socket.id}`);
    });

    // انضمام للمحادثة
    socket.on("joinChat", (chatId) => {
      socket.join(chatId);
      console.log(`Socket ${socket.id} joined chat ${chatId}`);
    });

    // انضمام لغرفة المكالمة
    socket.on("joinCallRoom", (roomId) => {
      socket.join(roomId);
      console.log(`Socket ${socket.id} joined call room ${roomId}`);
    });

    // إرسال رسالة
    socket.on("sendMessage", async (data) => {
      try {
        // إرسال الرسالة لجميع المشاركين في المحادثة
        socket.to(data.chatId).emit("newMessage", data);
        
        // إرسال إشعار للمستقبل إذا لم يكن متصل
        const receiverSocketId = userSockets.get(data.receiverId);
        if (!receiverSocketId) {
          socket.emit("messageNotification", data);
        }
      } catch (error) {
        console.error('Error sending message via socket:', error);
      }
    });

    // إدارة المكالمات
    socket.on("callUser", (data) => {
      socket.to(data.receiverId).emit("incomingCall", data);
    });

    socket.on("acceptCall", (data) => {
      socket.to(data.callerId).emit("callAccepted", data);
    });

    socket.on("rejectCall", (data) => {
      socket.to(data.callerId).emit("callRejected", data);
    });

    socket.on("endCall", (data) => {
      socket.to(data.roomId).emit("callEnded", data);
    });

    // إشارات WebRTC
    socket.on("webrtc-signal", (data) => {
      socket.to(data.to).emit("webrtc-signal", data);
    });

    // تحديث حالة الاتصال
    socket.on("disconnect", () => {
      // إزالة المستخدم من الخريطة
      for (let [userId, socketId] of userSockets.entries()) {
        if (socketId === socket.id) {
          userSockets.delete(userId);
          console.log(`User ${userId} disconnected`);
          break;
        }
      }
    });
  });

  return io;
};

module.exports = { configureSocket };