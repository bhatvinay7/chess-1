import { Chess } from 'chess.js';

// King on b1, Rook on a1. Queenside castling (O-O-O) means King -> c1, Rook -> d1.
// In shakmaty, the move is represented as King capturing its own Rook: b1a1.
// Let's see what happens.
const fen = 'rnqbbknr/pppppppp/8/8/8/8/PPPPPPPP/RNQBBKNR w KQkq - 0 1';
const chess = new Chess(fen);
try {
  chess.move('O-O-O'); // or chess.move({from: 'b1', to: 'c1'}) or chess.move({from: 'b1', to: 'a1'})
  console.log('Success!', chess.fen());
} catch(e) {
  console.log('O-O-O failed:', e.message);
}

try {
  chess.move({ from: 'b1', to: 'a1' });
  console.log('Success b1a1!', chess.fen());
} catch(e) {
  console.log('b1a1 failed:', e.message);
}

