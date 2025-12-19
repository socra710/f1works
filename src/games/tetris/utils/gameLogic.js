import { TETRIS_PIECES } from './tetrisPieces';
import { COLS, ROWS } from './constants';

// 보드 초기화
export const initBoard = () => {
  return Array(ROWS)
    .fill(null)
    .map(() => Array(COLS).fill(0));
};

// 랜덤 블록 생성
export const getRandomPiece = () => {
  const piece = TETRIS_PIECES[Math.floor(Math.random() * TETRIS_PIECES.length)];
  return {
    type: piece.name,
    color: piece.color,
    states: piece.states,
    rotationIndex: 0,
    shape: piece.states[0],
    x: Math.floor(COLS / 2) - 2,
    y: 0,
  };
};

// 블록 이동 가능 여부 체크
export const canMove = (piece, board, dx, dy) => {
  if (!piece || !piece.shape || !board) return false;

  const newX = piece.x + dx;
  const newY = piece.y + dy;

  for (let y = 0; y < piece.shape.length; y++) {
    for (let x = 0; x < piece.shape[y].length; x++) {
      if (piece.shape[y][x]) {
        const boardX = newX + x;
        const boardY = newY + y;

        if (
          boardX < 0 ||
          boardX >= COLS ||
          boardY >= ROWS ||
          (boardY >= 0 && board[boardY] && board[boardY][boardX])
        ) {
          return false;
        }
      }
    }
  }
  return true;
};

// SRS 벽 킥 시스템
export const getWallKickOffsets = (type, rotationIndex) => {
  if (type === 'I') {
    // I 피스 벽 킥 오프셋
    const iKickTable = [
      [
        [0, 0],
        [-2, 0],
        [1, 0],
        [-2, -1],
        [1, 2],
      ],
      [
        [0, 0],
        [-1, 0],
        [2, 0],
        [-1, 2],
        [2, -1],
      ],
      [
        [0, 0],
        [2, 0],
        [-1, 0],
        [2, 1],
        [-1, -2],
      ],
      [
        [0, 0],
        [1, 0],
        [-2, 0],
        [1, -2],
        [-2, 1],
      ],
    ];
    return iKickTable[rotationIndex];
  } else if (type === 'O') {
    return [[0, 0]];
  } else {
    // 일반 피스 벽 킥 오프셋
    const normalKickTable = [
      [
        [0, 0],
        [-1, 0],
        [-1, 1],
        [0, -2],
        [-1, -2],
      ],
      [
        [0, 0],
        [1, 0],
        [1, -1],
        [0, 2],
        [1, 2],
      ],
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, -2],
        [1, -2],
      ],
      [
        [0, 0],
        [-1, 0],
        [-1, -1],
        [0, 2],
        [-1, 2],
      ],
    ];
    return normalKickTable[rotationIndex];
  }
};

// 블록 회전
export const rotatePiece = (piece, board) => {
  if (!piece || !piece.states) return piece;

  const nextRotationIndex = (piece.rotationIndex + 1) % 4;
  const nextShape = piece.states[nextRotationIndex];
  const kickOffsets = getWallKickOffsets(piece.type, piece.rotationIndex);

  // 벽 킥 오프셋 시도
  for (const [offsetX, offsetY] of kickOffsets) {
    const testPiece = {
      ...piece,
      shape: nextShape,
      x: piece.x + offsetX,
      y: piece.y + offsetY,
    };

    if (canMove(testPiece, board, 0, 0)) {
      testPiece.rotationIndex = nextRotationIndex;
      return testPiece;
    }
  }

  // 회전 불가능
  return piece;
};

// 블록을 보드에 배치
export const placePiece = (piece, board) => {
  if (!piece || !piece.shape || !board) return board;

  const newBoard = board.map((row) => [...row]);
  for (let y = 0; y < piece.shape.length; y++) {
    for (let x = 0; x < piece.shape[y].length; x++) {
      if (piece.shape[y] && piece.shape[y][x]) {
        const boardY = piece.y + y;
        const boardX = piece.x + x;
        if (boardY >= 0 && boardY < ROWS && boardX >= 0 && boardX < COLS) {
          newBoard[boardY][boardX] = piece.color;
        }
      }
    }
  }
  return newBoard;
};

// 완성된 라인 제거
export const clearLines = (board) => {
  // 회색 블록(#808080)을 제외하고 완전히 채워진 줄만 제거
  let newBoard = board.filter((row) => {
    // 빈 칸이 있으면 유지
    if (row.some((cell) => !cell)) return true;
    // 모두 회색 블록이면 유지
    if (row.every((cell) => cell === '#808080')) return true;
    // 회색 블록이 아닌 블록으로 완전히 채워진 줄만 제거
    return false;
  });
  const linesCleared = board.length - newBoard.length;
  newBoard.unshift(
    ...Array(linesCleared)
      .fill(null)
      .map(() => Array(COLS).fill(0))
  );
  return { newBoard, linesCleared };
};

// 회색 블록 라인 추가
export const addGrayLine = (board) => {
  // 모든 행을 한 칸씩 위로 이동 (맨 위 줄은 제거됨)
  const newBoard = board.slice(1);
  // 맨 아래에 회색 블록 한 줄 추가
  const grayLine = Array(COLS).fill('#808080');
  newBoard.push(grayLine);
  return newBoard;
};
