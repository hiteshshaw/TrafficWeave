import React, { useRef, useEffect } from 'react';
import { QuantumSimulationFrame, BlochCoordinate } from '../types/quantum';
import { Atom, Zap } from 'lucide-react';

interface QuantumVisualizerProps {
  quantumFrame: QuantumSimulationFrame | null;
  alphaCoeff: number;
}

export const QuantumVisualizer: React.FC<QuantumVisualizerProps> = ({
  quantumFrame,
  alphaCoeff,
}) => {
  const blochCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const deltaWellCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const tickRef = useRef<number>(0);

  // 1. Render Bloch Sphere
  useEffect(() => {
    let animId: number;
    const renderBloch = () => {
      tickRef.current += 1;
      const canvas = blochCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;
      const radius = 100;

      ctx.clearRect(0, 0, w, h);

      // Sphere background & aura
      const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, radius);
      grad.addColorStop(0, 'rgba(56, 189, 248, 0.12)');
      grad.addColorStop(0.8, 'rgba(2, 132, 199, 0.06)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();

      // Outer wireframe circles
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();

      // Equator ellipse
      ctx.beginPath();
      ctx.ellipse(cx, cy, radius, radius * 0.35, 0, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
      ctx.stroke();

      // Z-Axis (Vertical |0> to |1>)
      ctx.beginPath();
      ctx.moveTo(cx, cy - radius - 15);
      ctx.lineTo(cx, cy + radius + 15);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Labels |0> and |1>
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 12px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('|0⟩ (Depot Focus)', cx, cy - radius - 20);
      ctx.fillStyle = '#10b981';
      ctx.fillText('|1⟩ (Route Expansion)', cx, cy + radius + 26);

      // Draw quantum particle state vectors on Bloch sphere
      if (quantumFrame && quantumFrame.particles) {
        quantumFrame.particles.forEach((p, pIdx) => {
          const state = p.blochStates[0];
          if (!state) return;

          // Project 3D sphere coordinates to 2D
          const rotationAngle = tickRef.current * 0.01;
          const rx = state.x * Math.cos(rotationAngle) - state.y * Math.sin(rotationAngle);
          const ry = state.x * Math.sin(rotationAngle) + state.y * Math.cos(rotationAngle);
          const rz = state.z;

          const px = cx + rx * radius;
          const py = cy - rz * radius + ry * radius * 0.25;

          // State vector line
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(px, py);
          ctx.strokeStyle = `rgba(0, 240, 255, ${0.3 + pIdx * 0.04})`;
          ctx.lineWidth = 1.2;
          ctx.stroke();

          // Qubit node point
          ctx.beginPath();
          ctx.arc(px, py, 4, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = '#00f0ff';
          ctx.shadowBlur = 8;
          ctx.fill();
          ctx.shadowBlur = 0;
        });
      }

      animId = requestAnimationFrame(renderBloch);
    };

    renderBloch();
    return () => cancelAnimationFrame(animId);
  }, [quantumFrame]);

  // 2. Render Quantum Delta Potential Well & Wavefunction |psi(x)|^2
  useEffect(() => {
    let animId: number;
    const renderDeltaWell = () => {
      const canvas = deltaWellCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Center attractor x = p_ij (middle of canvas)
      const cx = w / 2;
      const baseY = h * 0.85;

      // Draw potential well baseline
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(20, baseY);
      ctx.lineTo(w - 20, baseY);
      ctx.stroke();

      // Draw Dirac Delta Well spike in center V(x) = -gamma * delta(x - p)
      ctx.beginPath();
      ctx.moveTo(cx, baseY);
      ctx.lineTo(cx, baseY - 120);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#38bdf8';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Attractor p_ij [mbest]', cx, baseY - 128);

      // Characteristic length L = 2 * alpha * |mbest - x|
      const alpha = alphaCoeff || 0.75;
      const charLength = Math.max(15, alpha * 65);

      // Plot wave function probability density |psi(x)|^2 = (1 / L) * exp(-2 * |x - p| / L)
      ctx.beginPath();
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2;

      const numPoints = 120;
      for (let i = 0; i <= numPoints; i++) {
        const xScreen = 30 + (i / numPoints) * (w - 60);
        const distFromCenter = Math.abs(xScreen - cx);
        const probDensity = Math.exp((-2 * distFromCenter) / charLength);
        const yScreen = baseY - probDensity * 90;

        if (i === 0) ctx.moveTo(xScreen, yScreen);
        else ctx.lineTo(xScreen, yScreen);
      }
      ctx.stroke();

      // Fill area under wavefunction curve
      ctx.lineTo(w - 30, baseY);
      ctx.lineTo(30, baseY);
      ctx.closePath();
      const fillGrad = ctx.createLinearGradient(0, baseY - 90, 0, baseY);
      fillGrad.addColorStop(0, 'rgba(2, 132, 199, 0.2)');
      fillGrad.addColorStop(1, 'rgba(2, 132, 199, 0.01)');
      ctx.fillStyle = fillGrad;
      ctx.fill();

      // Draw quantum particle positions sampled via inverse cumulative distribution
      if (quantumFrame && quantumFrame.particles) {
        quantumFrame.particles.forEach((p) => {
          const val = p.currentPos[0] || 0.5;
          const px = 30 + val * (w - 60);
          const dist = Math.abs(px - cx);
          const py = baseY - Math.exp((-2 * dist) / charLength) * 90;

          ctx.beginPath();
          ctx.arc(px, py, 4, 0, Math.PI * 2);
          ctx.fillStyle = '#ef4444';
          ctx.fill();
        });
      }

      animId = requestAnimationFrame(renderDeltaWell);
    };

    renderDeltaWell();
    return () => cancelAnimationFrame(animId);
  }, [quantumFrame, alphaCoeff]);

  return (
    <div className="quantum-visualizer">
      {/* Bloch Sphere Panel */}
      <div className="glass-panel" style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Atom size={20} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Bloch Sphere Phase Encoding</h3>
          </div>
          <span className="badge badge-cyan">Qubit |ψ⟩ Space</span>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 16 }}>
          Each route permutation gene is mapped to polar angle θ and phase φ on the Bloch sphere, enabling smooth quantum rotation across discrete combinatorial space.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: 10 }}>
          <canvas ref={blochCanvasRef} width={360} height={300} style={{ width: '100%', maxWidth: 360, height: 300 }} />
        </div>
      </div>

      {/* Delta Potential Well Panel */}
      <div className="glass-panel" style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Zap size={20} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Quantum Delta Potential Well</h3>
          </div>
          <span className="badge badge-cyan">α(t) = {alphaCoeff.toFixed(3)}</span>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 16 }}>
          Wavefunction |ψ(x)|² = (1/L) exp(-2|x - p|/L). As contraction-expansion coefficient α(t) decreases, quantum probability collapses from global tunneling to local exploitation.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: 10 }}>
          <canvas ref={deltaWellCanvasRef} width={380} height={300} style={{ width: '100%', maxWidth: 380, height: 300 }} />
        </div>
      </div>
    </div>
  );
};
