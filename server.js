const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const { Chess } = require('chess.js');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(path.join(__dirname, 'public')));

const game = new Chess();
let players = {}; // { socket.id: { name, id } }

io.on('connection', (socket) => {
  console.log('Player connected');

  // انضمام لاعب جديد
  socket.on('join', (playerName) => {
    players[socket.id] = { name: playerName, id: socket.id };
    socket.emit('yourId', socket.id); // نبعث الـ ID للاعب نفسه
    console.log(`${playerName} joined with ID ${socket.id}`);
    socket.broadcast.emit('message', `انضم اللاعب: ${playerName}`);
  });

  // إرسال دعوة باستخدام الـ ID
  socket.on('inviteById', (friendId) => {
    if (players[friendId]) {
      io.to(friendId).emit('receiveInvite', { from: players[socket.id].name, fromId: socket.id });
    } else {
      socket.emit('message', 'الـ ID غير موجود');
    }
  });

  // رد على الدعوة
  socket.on('inviteResponse', (data) => {
    io.to(data.fromId).emit('inviteResult', data);
  });

  // استقبال حركة الشطرنج
  socket.on('move', (move) => {
    try {
      const result = game.move({ from: move.from, to: move.to, promotion: 'q' });
      if (result) {
        io.emit('move', { move, player: players[socket.id].name, fen: game.fen() });
        if (game.game_over()) {
          io.emit('message', `اللعبة انتهت!`);
        }
      } else {
        socket.emit('message', 'حركة غير صحيحة!');
      }
    } catch (err) {
      socket.emit('message', 'خطأ في تنفيذ الحركة');
    }
  });

  socket.on('reset', () => {
    game.reset();
    io.emit('reset', { fen: game.fen() });
  });

  socket.on('undo', () => {
    game.undo();
    io.emit('undo', { fen: game.fen() });
  });

  socket.on('disconnect', () => {
    if (players[socket.id]) {
      socket.broadcast.emit('message', `غادر اللاعب: ${players[socket.id].name}`);
      delete players[socket.id];
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
