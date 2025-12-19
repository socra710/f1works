import React from 'react';
import { BLOCK_SIZE, COLS, ROWS } from '../utils/constants';

const TetrisBoard = ({ canvasRef, board, currentPiece, bloodParticles }) => {
  const drawBoard = React.useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.className = 'Tetris-canvas';
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw board
    if (board && board.length > 0) {
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          const cell = board[y] && board[y][x];
          if (cell) {
            ctx.fillStyle = cell;
            ctx.fillRect(
              x * BLOCK_SIZE,
              y * BLOCK_SIZE,
              BLOCK_SIZE - 1,
              BLOCK_SIZE - 1
            );
          }
          ctx.strokeStyle = '#333';
          ctx.strokeRect(
            x * BLOCK_SIZE,
            y * BLOCK_SIZE,
            BLOCK_SIZE,
            BLOCK_SIZE
          );
        }
      }
    }

    // Draw current piece
    if (currentPiece && currentPiece.shape) {
      ctx.fillStyle = currentPiece.color;
      for (let y = 0; y < currentPiece.shape.length; y++) {
        for (let x = 0; x < currentPiece.shape[y].length; x++) {
          if (currentPiece.shape[y] && currentPiece.shape[y][x]) {
            const boardX = currentPiece.x + x;
            const boardY = currentPiece.y + y;
            if (boardY >= 0) {
              ctx.fillRect(
                boardX * BLOCK_SIZE,
                boardY * BLOCK_SIZE,
                BLOCK_SIZE - 1,
                BLOCK_SIZE - 1
              );
            }
          }
        }
      }
    }

    // 피 튀김 파티클 그리기
    const particles = bloodParticles || [];
    for (const p of particles) {
      ctx.fillStyle = `rgba(255, 0, 0, ${p.life * 0.8})`;
      ctx.shadowColor = `rgba(255, 0, 0, ${p.life * 0.6})`;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  }, [canvasRef, board, currentPiece, bloodParticles]);

  // 보드 상태가 변경될 때마다 다시 그리기
  React.useEffect(() => {
    drawBoard();
  }, [drawBoard]);

  return (
    <canvas
      ref={canvasRef}
      width={COLS * BLOCK_SIZE}
      height={ROWS * BLOCK_SIZE}
      className="tetris-board canvas-glow"
    />
  );
};

export default TetrisBoard;
