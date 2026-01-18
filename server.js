const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const { Chess } = require('chess.js'); // مكتبة منطق الشطرنج

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(path.join(__dirname, 'public')));

// حالة اللعبة المشتركة
const game = new Chess();
let players = {}; // { socket.id: playerName }

io.on('connection', (socket) => {
  console.log('Player connected');

  // انضمام لاعب جديد
  socket.on('join', (playerName) => {
    players[socket.id] = playerName;
    console.log(`${playerName} joined`);
    socket.broadcast.emit('message', `انضم اللاعب: ${playerName}`);
  });

  // إرسال دعوة
  socket.on('invite', (friendName) => {
    io.emit('receiveInvite', { from: players[socket.id], to: friendName });
  });

  // رد على الدعوة
  socket.on('inviteResponse', (data) => {
    io.emit('inviteResult', data);
  });

  // استقبال حركة الشطرنج
  socket.on('move', (move) => {
    try {
      const result = game.move({
        from: move.from,
        to: move.to,
        promotion: 'q'
      });

      if (result) {
        // تحديث اللوحة لكل اللاعبين
        io.emit('move', { move, player: players[socket.id], fen: game.fen() });

        // لو اللعبة انتهت
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

  // إعادة اللعبة
  socket.on('reset', () => {
    game.reset();
    io.emit('reset', { fen: game.fen() });
  });

  // رجوع خطوة للخلف
  socket.on('undo', () => {
    game.undo();
    io.emit('undo', { fen: game.fen() });
  });

  // عند قطع الاتصال
  socket.on('disconnect', () => {
    if (players[socket.id]) {
      socket.broadcast.emit('message', `غادر اللاعب: ${players[socket.id]}`);
      delete players[socket.id];
    }
  });
});

// تشغيل السيرفر
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
