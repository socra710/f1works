import React from 'react';
import {
  PREVIEW_BLOCK_SIZE,
  PREVIEW_CANVAS_WIDTH,
  PREVIEW_CANVAS_HEIGHT,
} from '../utils/constants';

const NextPiecePreview = ({ canvasRef, nextPiece, colorMap = {} }) => {
  const drawNextPiece = React.useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !nextPiece || !nextPiece.shape) return;

    const ctx = canvas.getContext('2d');
    const previewBlockSize = PREVIEW_BLOCK_SIZE;

    // 배경 초기화
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 블록의 실제 크기 계산
    const shape = nextPiece.shape;
    let minX = 4,
      maxX = 0,
      minY = 4,
      maxY = 0;
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y] && shape[y][x]) {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
      }
    }

    const pieceWidth = (maxX - minX + 1) * previewBlockSize;
    const pieceHeight = (maxY - minY + 1) * previewBlockSize;
    const offsetX = (canvas.width - pieceWidth) / 2 - minX * previewBlockSize;
    const offsetY = (canvas.height - pieceHeight) / 2 - minY * previewBlockSize;

    // 블록 그리기
    ctx.fillStyle = colorMap[nextPiece.color] || nextPiece.color;
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y] && shape[y][x]) {
          ctx.fillRect(
            offsetX + x * previewBlockSize,
            offsetY + y * previewBlockSize,
            previewBlockSize - 1,
            previewBlockSize - 1
          );
        }
      }
    }
  }, [canvasRef, nextPiece]);

  React.useEffect(() => {
    if (nextPiece) {
      drawNextPiece();
    }
  }, [nextPiece, drawNextPiece]);

  return (
    <div className="next-piece-preview">
      <div className="preview-label">다음 블록</div>
      <canvas
        ref={canvasRef}
        width={PREVIEW_CANVAS_WIDTH}
        height={PREVIEW_CANVAS_HEIGHT}
        className="next-piece-canvas"
      />
    </div>
  );
};

export default NextPiecePreview;
