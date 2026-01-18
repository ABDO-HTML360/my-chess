const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
  console.log('Player connected');

  // حفظ اسم اللاعب
  socket.on('join', (playerName) => {
    socket.playerName = playerName;
    console.log(`${playerName} joined`);
    socket.broadcast.emit('message', `انضم اللاعب: ${playerName}`);
  });

  // إرسال دعوة
  socket.on('invite', (friendName) => {
    io.emit('receiveInvite', { from: socket.playerName, to: friendName });
  });

  // رد على الدعوة
  socket.on('inviteResponse', (data) => {
    io.emit('inviteResult', data);
  });

  // استقبال حركة الشطرنج
  socket.on('move', (move) => {
    socket.broadcast.emit('move', { move, player: socket.playerName });
  });

  socket.on('disconnect', () => {
    if (socket.playerName) {
      socket.broadcast.emit('message', `غادر اللاعب: ${socket.playerName}`);
    }
  });
});

server.listen(3000, () => {
  console.log('Server running on port 3000');
});
