import { Chess } from 'chess.js';

const fen = 'rnqbbknr/pppppppp/8/8/8/8/PPPPPPPP/RNQBBKNR w KQkq - 0 1';
const chess = new Chess(fen);
console.log('Legal moves:', chess.moves());

const move = chess.move({ from: 'd2', to: 'd4' });
console.log('Move result:', move);
