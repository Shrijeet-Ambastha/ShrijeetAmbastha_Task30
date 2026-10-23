import React, { useState, useEffect } from 'react';
import './Chessboard.css';

// Standard Chess Symbols Matrix
const PIECE_SYMBOLS = {
  'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛', 'k': '♚', 'p': '♟',
  'R': '♖', 'N': '♘', 'B': '♗', 'Q': '♕', 'K': '♔', 'P': '♙'
};

// Initial board layout using uppercase for White and lowercase for Black
const createInitialBoard = () => [
  ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
  ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
  ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
];

const Chessboard = () => {
  const [board, setBoard] = useState(createInitialBoard);
  const [turn, setTurn] = useState('W'); // 'W' for White, 'B' for Black
  const [selectedSquare, setSelectedSquare] = useState(null); // { r, c }
  const [gameState, setGameState] = useState({ isGameOver: false, outcome: '' });

  // ----------------------------------------------------
  // CORE UTILITIES
  // ----------------------------------------------------
  const getPieceColor = (piece) => {
    if (!piece) return null;
    return piece === piece.toUpperCase() ? 'W' : 'B';
  };

  const findKing = (currentBoard, color) => {
    const targetKing = color === 'W' ? 'K' : 'k';
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (currentBoard[r][c] === targetKing) return { r, c };
      }
    }
    return null;
  };

  // ----------------------------------------------------
  // PSEUDO-LEGAL MOVES GENERATION
  // Calculates where a piece can move, ignoring if it leaves its own King in check
  // ----------------------------------------------------
  const getPseudoMoves = (r, c, currentBoard) => {
    const piece = currentBoard[r][c];
    if (!piece) return [];
    const color = getPieceColor(piece);
    const moves = [];

    const addMoveIfValid = (nr, nc) => {
      if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
        const destPiece = currentBoard[nr][nc];
        if (!destPiece || getPieceColor(destPiece) !== color) {
          moves.push({ r: nr, c: nc });
          return !destPiece; // Stop sliding if we hit an enemy piece
        }
      }
      return false; // Obstacle or boundary hit
    };

    const slide = (rowOffset, colOffset) => {
      let nr = r + rowOffset;
      let nc = c + colOffset;
      while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
        const keepGoing = addMoveIfValid(nr, nc);
        if (!keepGoing) break;
        nr += rowOffset;
        nc += colOffset;
      }
    };

    switch (piece.toUpperCase()) {
      case 'P': { // Pawn Logic
        const dir = color === 'W' ? -1 : 1;
        const startRow = color === 'W' ? 6 : 1;
        
        // 1 step forward
        if (r + dir >= 0 && r + dir < 8 && !currentBoard[r + dir][c]) {
          moves.push({ r: r + dir, c });
          // 2 steps forward from initial rank
          if (r === startRow && !currentBoard[r + 2 * dir][c]) {
            moves.push({ r: r + 2 * dir, c });
          }
        }
        // Diagonal Captures
        [-1, 1].forEach(dc => {
          const nr = r + dir, nc = c + dc;
          if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
            const target = currentBoard[nr][nc];
            if (target && getPieceColor(target) !== color) moves.push({ r: nr, c: nc });
          }
        });
        break;
      }
      case 'N': { // Knight Moves
        const offsets = [[-2,-1], [-2,1], [-1,-2], [-1,2], [1,-2], [1,2], [2,-1], [2,1]];
        offsets.forEach(([ro, co]) => addMoveIfValid(r + ro, c + co));
        break;
      }
      case 'B': // Bishop Sliding
        [[1,1], [1,-1], [-1,1], [-1,-1]].forEach(([ro, co]) => slide(ro, co));
        break;
      case 'R': // Rook Sliding
        [[1,0], [-1,0], [0,1], [0,-1]].forEach(([ro, co]) => slide(ro, co));
        break;
      case 'Q': // Queen Sliding
        [[1,0], [-1,0], [0,1], [0,-1], [1,1], [1,-1], [-1,1], [-1,-1]].forEach(([ro, co]) => slide(ro, co));
        break;
      case 'K': // King Steps
        [[1,0], [-1,0], [0,1], [0,-1], [1,1], [1,-1], [-1,1], [-1,-1]].forEach(([ro, co]) => addMoveIfValid(r + ro, c + co));
        break;
      default: break;
    }
    return moves;
  };

  // ----------------------------------------------------
  // CHECK VALIDATION
  // ----------------------------------------------------
  const isColorInCheck = (color, currentBoard) => {
    const kingPos = findKing(currentBoard, color);
    if (!kingPos) return false;

    // Check if any enemy piece can reach the King's coordinate
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = currentBoard[r][c];
        if (piece && getPieceColor(piece) !== color) {
          const enemyMoves = getPseudoMoves(r, c, currentBoard);
          if (enemyMoves.some(m => m.r === kingPos.r && m.c === kingPos.c)) {
            return true;
          }
        }
      }
    }
    return false;
  };

  // ----------------------------------------------------
  // LEGAL MOVES (Filters moves that expose King to check)
  // ----------------------------------------------------
  const getLegalMoves = (r, c, currentBoard) => {
    const piece = currentBoard[r][c];
    if (!piece || getPieceColor(piece) !== turn) return [];
    
    const pseudoMoves = getPseudoMoves(r, c, currentBoard);

    // Simulated verification framework
    return pseudoMoves.filter(move => {
      const nextBoard = currentBoard.map(row => [...row]);
      nextBoard[move.r][move.c] = nextBoard[r][c];
      nextBoard[r][c] = null;
      return !isColorInCheck(turn, nextBoard);
    });
  };

  // ----------------------------------------------------
  // GAME END SCANNER (Runs every turn shift)
  // ----------------------------------------------------
  useEffect(() => {
    let totalLegalMoves = 0;
    let totalPiecesLeft = 0;

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (board[r][c]) {
          totalPiecesLeft++;
          if (getPieceColor(board[r][c]) === turn) {
            totalLegalMoves += getLegalMoves(r, c, board).length;
          }
        }
      }
    }

    const inCheck = isColorInCheck(turn, board);

    if (totalLegalMoves === 0) {
      if (inCheck) {
        const winner = turn === 'W' ? 'Black' : 'White';
        setGameState({ isGameOver: true, outcome: `Checkmate! ${winner} wins.` });
      } else {
        setGameState({ isGameOver: true, outcome: 'Draw: Stalemate!' });
      }
    } else if (totalPiecesLeft === 2) {
      // If only the two kings remain on the entire board
      setGameState({ isGameOver: true, outcome: 'Draw: Insufficient Material!' });
    }
  }, [turn, board]);

  // ----------------------------------------------------
  // CLICK ACTIONS MANAGER
  // ----------------------------------------------------
  const handleSquareClick = (r, c) => {
    if (gameState.isGameOver) return;

    if (selectedSquare) {
      const legalMoves = getLegalMoves(selectedSquare.r, selectedSquare.c, board);
      const isLegal = legalMoves.some(m => m.r === r && m.c === c);

      if (isLegal) {
        // Execute move
        const newBoard = board.map(row => [...row]);
        newBoard[r][c] = newBoard[selectedSquare.r][selectedSquare.c];
        newBoard[selectedSquare.r][selectedSquare.c] = null;

        // Simple Auto-Pawn Promotion to Queen
        if (newBoard[r][c] === 'P' && r === 0) newBoard[r][c] = 'Q';
        if (newBoard[r][c] === 'p' && r === 7) newBoard[r][c] = 'q';

        setBoard(newBoard);
        setSelectedSquare(null);
        setTurn(turn === 'W' ? 'B' : 'W');
        return;
      }
    }

    // Handle initial piece selection
    const piece = board[r][c];
    if (piece && getPieceColor(piece) === turn) {
      setSelectedSquare({ r, c });
    } else {
      setSelectedSquare(null);
    }
  };

  // Compile active highlight vectors
  const activeLegalMoves = selectedSquare 
    ? getLegalMoves(selectedSquare.r, selectedSquare.c, board) 
    : [];

  const renderSquares = () => {
    const squares = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const isDark = (r + c) % 2 === 1;
        const piece = board[r][c];
        
        const isSelected = selectedSquare && selectedSquare.r === r && selectedSquare.c === c;
        const isTargetDot = activeLegalMoves.some(m => m.r === r && m.c === c);
        const isKingInCheck = isColorInCheck(turn, board) && piece?.toUpperCase() === 'K' && getPieceColor(piece) === turn;

        squares.push(
          <div
            key={`${r}-${c}`}
            className={`square ${isDark ? 'dark' : 'light'} ${isSelected ? 'selected' : ''} ${isKingInCheck ? 'check-alert' : ''}`}
            onClick={() => handleSquareClick(r, c)}
          >
            {isTargetDot && <div className="move-dot" />}
            {piece && <span className="piece">{PIECE_SYMBOLS[piece]}</span>}
          </div>
        );
      }
    }
    return squares;
  };

  return (
    <div className="board-container">
      <div className="status-bar">
        {gameState.isGameOver ? (
          <div className="alert-box">
            <h2>{gameState.outcome}</h2>
            <button className="reset-btn" onClick={() => { setBoard(createInitialBoard()); setTurn('W'); setGameState({ isGameOver: false, outcome: '' }); setSelectedSquare(null); }}>Reset Game</button>
          </div>
        ) : (
          <h3>Current Turn: <span className="player-badge">{turn === 'W' ? 'White' : 'Black'}</span></h3>
        )}
      </div>
      <div className="chessboard">{renderSquares()}</div>
    </div>
  );
};

export default Chessboard;
