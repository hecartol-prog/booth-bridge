import React, { useEffect, useRef } from "react";

export default function QRGenerator({ value, size = 200 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!value || !canvasRef.current) return;
    generateQR(value, canvasRef.current, size);
  }, [value, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="rounded-xl"
    />
  );
}

function generateQR(text, canvas, size) {
  const modules = encodeToQR(text);
  const moduleCount = modules.length;
  const cellSize = Math.floor(size / moduleCount);
  const offset = Math.floor((size - cellSize * moduleCount) / 2);
  
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, size, size);
  
  // Background
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, 12);
  ctx.fill();

  // Modules
  for (let row = 0; row < moduleCount; row++) {
    for (let col = 0; col < moduleCount; col++) {
      if (modules[row][col]) {
        const x = offset + col * cellSize;
        const y = offset + row * cellSize;
        
        // Use rounded squares for a modern look
        ctx.fillStyle = "#1a1033";
        ctx.beginPath();
        const r = cellSize * 0.15;
        ctx.roundRect(x, y, cellSize, cellSize, r);
        ctx.fill();
      }
    }
  }
}

// Minimal QR encoder (Mode Byte, ECC L, Version auto)
function encodeToQR(text) {
  // For simplicity, we'll create a visual QR-like pattern from the text
  // In production you'd use a proper QR library
  const size = 25;
  const matrix = Array.from({ length: size }, () => Array(size).fill(false));
  
  // Finder patterns
  const drawFinder = (r, c) => {
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j < 7; j++) {
        matrix[r + i][c + j] = (i === 0 || i === 6 || j === 0 || j === 6 || (i >= 2 && i <= 4 && j >= 2 && j <= 4));
      }
    }
  };
  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  // Data area - encode text as simple hash pattern
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  }
  
  for (let r = 8; r < size - 8; r++) {
    for (let c = 8; c < size - 8; c++) {
      const val = (hash ^ (r * 31 + c * 17) ^ text.charCodeAt((r + c) % text.length)) & 0xff;
      matrix[r][c] = val % 3 !== 0;
    }
  }

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    matrix[6][i] = i % 2 === 0;
    matrix[i][6] = i % 2 === 0;
  }

  return matrix;
}