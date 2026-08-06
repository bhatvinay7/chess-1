import { Chess } from 'chess.js';

try {
  const fen = 'rnqbbknr/pppppppp/8/8/8/8/PPPPPPPP/RNQBBKNR w KQkq - 0 1';
  const chess = new Chess(fen);
  console.log('Success!', chess.fen());
} catch(e) {
  console.log('Error parsing fen:', e.message);
}
