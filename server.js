// الاتصال بالسيرفر عبر Socket.IO
var socket = io();

// إنشاء اللعبة واللوحة
var board = null;
var game = new Chess();
var playerName = "";

// تسجيل اسم اللاعب
function joinGame() {
  playerName = document.getElementById("playerName").value;
  if (playerName.trim() === "") {
    alert("من فضلك اكتب اسمك");
    return;
  }
  socket.emit('join', playerName);
  document.getElementById("messages").innerHTML += `<p>انت دخلت باسم: ${playerName}</p>`;
}

// إرسال دعوة لصديق
function inviteFriend() {
  let friendName = document.getElementById("friendName").value;
  if (friendName.trim() === "") {
    alert("اكتب اسم صديقك أولاً");
    return;
  }
  socket.emit("invite", friendName);
  document.getElementById("messages").innerHTML += `<p>تم إرسال دعوة إلى ${friendName}</p>`;
}

// استقبال الدعوة
socket.on("receiveInvite", (data) => {
  if (data.to === playerName) {
    let accept = confirm(`${data.from} دعاك للعبة، هل توافق؟`);
    socket.emit("inviteResponse", { from: data.from, to: playerName, accept: accept });
  }
});

// نتيجة الدعوة
socket.on("inviteResult", (data) => {
  if (data.accept) {
    document.getElementById("messages").innerHTML += `<p>${data.to} وافق على الدعوة!</p>`;
  } else {
    document.getElementById("messages").innerHTML += `<p>${data.to} رفض الدعوة.</p>`;
  }
});

// منع تحريك القطع الغلط
function onDragStart(source, piece, position, orientation) {
  if (game.game_over()) return false;
  if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
      (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
    return false;
  }
}

// تنفيذ الحركة
function onDrop(source, target) {
  var move = game.move({ from: source, to: target, promotion: 'q' });
  if (move === null) return 'snapback';
  board.position(game.fen());
  socket.emit('move', { from: source, to: target });
}

// إعادة اللعبة
function resetGame() {
  game.reset();
  board.start();
}

// رجوع خطوة للخلف
function undoMove() {
  game.undo();
  board.position(game.fen());
}

// إنشاء اللوحة
board = Chessboard('board', {
  draggable: true,
  position: 'start',
  onDragStart: onDragStart,
  onDrop: onDrop
});

// استقبال رسائل عامة
socket.on('message', (msg) => {
  document.getElementById("messages").innerHTML += `<p>${msg}</p>`;
});

// استقبال حركة من صديقك
socket.on('move', (data) => {
  game.move({ from: data.move.from, to: data.move.to, promotion: 'q' });
  board.position(game.fen());
  document.getElementById("messages").innerHTML += `<p>حركة من ${data.player}</p>`;
});
