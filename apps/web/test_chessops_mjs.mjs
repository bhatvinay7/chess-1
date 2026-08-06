import { parsePgn } from 'chessops/pgn';
import { parseFen, makeFen, INITIAL_FEN } from 'chessops/fen';
import { Chess } from 'chessops/chess';

const pgn = `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2024.01.01"]
[Round "-"]
[White "Player1"]
[Black "Player2"]
[Result "*"]

1. e4 e5 2. f4 f5 *`;

const parsed = parsePgn(pgn);
const gameNode = parsed[0];
const setupFen = gameNode.headers.get("FEN") ?? INITIAL_FEN;
const setup = parseFen(setupFen).unwrap();
let pos = Chess.fromSetup(setup).unwrap();
console.log(makeFen(pos.toSetup()));
