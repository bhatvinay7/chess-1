const { Chess } = require('chess.js');
try {
  const chess = new Chess('nrkbqrbn/pppppppp/8/8/8/8/PPPPPPPP/NRKBQRBN w KQkq - 0 1');
  console.log("Success:", chess.fen());
} catch(e) {
  console.log("Error:", e.message);
}
