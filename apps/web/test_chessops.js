import { Chess } from 'chessops/chess';
import { parseFen, makeFen } from 'chessops/fen';

const setup = parseFen('rnqbbknr/pppppppp/8/8/8/8/PPPPPPPP/RNQBBKNR w KQkq - 0 1').unwrap();
const pos = Chess.fromSetup(setup).unwrap();
console.log('Turn:', pos.turn);
console.log('Legal moves size:', Array.from(pos.legalMoves()).length);
