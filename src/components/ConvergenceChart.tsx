import React, { useRef, useEffect, useState } from 'react';
import { ConvergenceRecord } from '../types/optimizer';
import { LineChart, TrendingDown, Layers, Zap } from 'lucide-react';

interface AlgorithmSeries {
  id: string;
  name: string;
  color: string;
  history: ConvergenceRecord[];
}

interface ConvergenceChartProps {
  series: AlgorithmSeries[];
  maxIterations: number;
}

export const ConvergenceChart: React.FC<ConvergenceChartProps> = ({
  series,
  maxIterations,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoveredIteration, setHoveredIteration] = useState<number | null>(null);
  const [hoverMetrics, setHoverMetrics] = useState<Array<{ name: string; color: string; cost: number }>>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const padLeft = 60;
    const padRight = 30;
    const padTop = 30;
    const padBottom = 40;

    const plotW = w - padLeft - padRight;
    const plotH = h - padTop - padBottom;

    ctx.clearRect(0, 0, w, h);

    // Find min & max costs across all series
    let minCost = Infinity;
    let maxCost = -Infinity;

    series.forEach(s => {
      s.history.forEach(hItem => {
        if (hItem.bestCost < minCost) minCost = hItem.bestCost;
        if (hItem.bestCost > maxCost) maxCost = hItem.bestCost;
      });
    });

    if (minCost === Infinity || maxCost === -Infinity || minCost === maxCost) {
      minCost = 100;
      maxCost = 800;
    } else {
      // Add padding margins
      const range = maxCost - minCost;
      minCost = Math.max(0, minCost - range * 0.08);
      maxCost = maxCost + range * 0.08;
    }

    // Grid lines (Horizontal)
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#64748b';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.textAlign = 'right';

    const yDivisions = 5;
    for (let i = 0; i <= yDivisions; i++) {
      const yVal = minCost + (maxCost - minCost) * (i / yDivisions);
      const yPos = padTop + plotH - (i / yDivisions) * plotH;

      ctx.beginPath();
      ctx.moveTo(padLeft, yPos);
      ctx.lineTo(w - padRight, yPos);
      ctx.stroke();

      ctx.fillText(yVal.toFixed(0), padLeft - 10, yPos + 3);
    }

    // Grid lines (Vertical Iterations)
    ctx.textAlign = 'center';
    const xDivisions = 5;
    for (let i = 0; i <= xDivisions; i++) {
      const iter = Math.round((maxIterations / xDivisions) * i);
      const xPos = padLeft + (i / xDivisions) * plotW;

      ctx.beginPath();
      ctx.moveTo(xPos, padTop);
      ctx.lineTo(xPos, h - padBottom);
      ctx.stroke();

      ctx.fillText(`Iter ${iter}`, xPos, h - padBottom + 18);
    }

    // Plot each algorithm series
    series.forEach(s => {
      if (s.history.length === 0) return;

      ctx.beginPath();
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 2.5;

      s.history.forEach((rec, idx) => {
        const xFrac = Math.min(1, rec.iteration / maxIterations);
        const yFrac = (rec.bestCost - minCost) / (maxCost - minCost);

        const xPos = padLeft + xFrac * plotW;
        const yPos = padTop + plotH - yFrac * plotH;

        if (idx === 0) ctx.moveTo(xPos, yPos);
        else ctx.lineTo(xPos, yPos);
      });

      ctx.stroke();

      // End point marker
      const last = s.history[s.history.length - 1];
      if (last) {
        const xFrac = Math.min(1, last.iteration / maxIterations);
        const yFrac = (last.bestCost - minCost) / (maxCost - minCost);
        const xPos = padLeft + xFrac * plotW;
        const yPos = padTop + plotH - yFrac * plotH;

        ctx.beginPath();
        ctx.arc(xPos, yPos, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = s.color;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    });

    // Hover vertical indicator line
    if (hoveredIteration !== null) {
      const hXFrac = Math.min(1, hoveredIteration / maxIterations);
      const hXPos = padLeft + hXFrac * plotW;

      ctx.beginPath();
      ctx.moveTo(hXPos, padTop);
      ctx.lineTo(hXPos, h - padBottom);
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [series, maxIterations, hoveredIteration]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const padLeft = 60;
    const padRight = 30;
    const plotW = canvas.width - padLeft - padRight;

    if (mouseX >= padLeft && mouseX <= canvas.width - padRight) {
      const frac = (mouseX - padLeft) / plotW;
      const targetIter = Math.round(frac * maxIterations);
      setHoveredIteration(targetIter);

      const metrics: Array<{ name: string; color: string; cost: number }> = [];
      series.forEach(s => {
        const point = s.history.find(h => h.iteration === targetIter) || s.history[s.history.length - 1];
        if (point) {
          metrics.push({ name: s.name, color: s.color, cost: point.bestCost });
        }
      });
      setHoverMetrics(metrics);
    } else {
      setHoveredIteration(null);
      setHoverMetrics([]);
    }
  };

  return (
    <div className="glass-panel convergence-panel">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <TrendingDown size={20} color="var(--accent-cyan)" />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Real-Time Multi-Objective Cost Convergence</h3>
        </div>

        {/* Series Legends */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          {series.map(s => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem' }}>
              <span style={{ width: 12, height: 3, background: s.color, display: 'inline-block', borderRadius: 2 }} />
              <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{s.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ position: 'relative', width: '100%', height: 300, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
        <canvas
          ref={canvasRef}
          width={800}
          height={300}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => { setHoveredIteration(null); setHoverMetrics([]); }}
          style={{ width: '100%', height: '100%', display: 'block' }}
        />

        {/* Hover Tooltip Overlay */}
        {hoveredIteration !== null && hoverMetrics.length > 0 && (
          <div className="glass-panel" style={{
            position: 'absolute',
            top: 12,
            right: 16,
            padding: '8px 12px',
            fontSize: '0.75rem',
            border: '1px solid var(--border-subtle)',
            pointerEvents: 'none',
          }}>
            <div style={{ fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: 4 }}>
              Iteration {hoveredIteration}
            </div>
            {hoverMetrics.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, color: m.color }}>
                <span>{m.name}:</span>
                <strong className="font-mono">{m.cost.toFixed(1)}</strong>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
