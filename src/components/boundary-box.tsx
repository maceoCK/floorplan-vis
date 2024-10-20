import React, { useRef, useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Boundary } from '@/app/utils';

interface BoundaryBoxProps {
  boundary: Boundary[];
  setBoundary: React.Dispatch<React.SetStateAction<Boundary[]>>;
}

export function BoundaryBox({ boundary, setBoundary }: BoundaryBoxProps) {
  const boundaryCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    drawBoundary();
  }, [boundary]);

  useEffect(() => {
    const cleanup = handleBoundaryDraw();
    return cleanup;
  }, []);

  const drawBoundary = () => {
    const canvas = boundaryCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw existing boundaries
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    boundary.forEach((rect) => {
      ctx.fillStyle = 'white';
      ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    });
  };

  const handleBoundaryDraw = () => {
    const canvas = boundaryCanvasRef.current;
    if (!canvas) return;

    let isDrawing = false;
    let startX: number, startY: number;

    const startDraw = (e: MouseEvent) => {
      isDrawing = true;
      const rect = canvas.getBoundingClientRect();
      startX = e.clientX - rect.left;
      startY = e.clientY - rect.top;
    };

    const draw = (e: MouseEvent) => {
      if (!isDrawing) return;
      const rect = canvas.getBoundingClientRect();
      const endX = e.clientX - rect.left;
      const endY = e.clientY - rect.top;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.fillRect(
        Math.min(startX, endX),
        Math.min(startY, endY),
        Math.abs(endX - startX),
        Math.abs(endY - startY)
      );
    };

    const endDraw = (e: MouseEvent) => {
      if (!isDrawing) return;
      isDrawing = false;
      const rect = canvas.getBoundingClientRect();
      const endX = e.clientX - rect.left;
      const endY = e.clientY - rect.top;

      setBoundary((prevBoundary) => [
        ...prevBoundary,
        {
          x: Math.min(startX, endX),
          y: Math.min(startY, endY),
          width: Math.abs(endX - startX),
          height: Math.abs(endY - startY)
        }
      ]);
    };

    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', endDraw);
    canvas.addEventListener('mouseout', endDraw);

    return () => {
      canvas.removeEventListener('mousedown', startDraw);
      canvas.removeEventListener('mousemove', draw);
      canvas.removeEventListener('mouseup', endDraw);
      canvas.removeEventListener('mouseout', endDraw);
    };
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-2">Boundary Drawing</h2>
      <canvas
        ref={boundaryCanvasRef}
        width={500}
        height={500}
        className="border border-gray-300"
      />
      <p className="text-sm text-gray-600 mt-2">Click and drag to draw rectangles</p>
      <Button onClick={() => setBoundary([])} className="mt-2 bg-slate-700 text-slate-100">
        Clear Boundary
      </Button>
    </div>
  );
}
