import React from 'react';
import { BookOpen } from 'lucide-react';

export const TheoryGuide: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Overview Card */}
      <div className="glass-panel" style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <BookOpen size={24} color="var(--accent-cyan)" />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>
            Mathematical Formulations &amp; Quantum Metaheuristic Mechanics
          </h2>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          This document details the exact mathematical equations, physics models, and combinatorial mapping techniques implemented in the TrafficWeave optimization engine.
        </p>
      </div>

      {/* 1. VRP Multi-Objective Formulation */}
      <div className="glass-panel" style={{ padding: 20 }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: 10 }}>
          1. Multi-Depot Capacitated VRP with Time Windows (MD-CVRPTW)
        </h3>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          <p style={{ marginBottom: 10 }}>
            Let G = (V, E) be a dynamic directed graph where V = V_depot ∪ V_customer and E is the set of road segments.
            The composite multi-objective scalarized fitness function F(S) is:
          </p>
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', padding: '12px 16px', borderRadius: 'var(--radius-sm)', fontFamily: 'JetBrains Mono, monospace', color: 'var(--accent-cyan)', marginBottom: 12 }}>
            min F = w_1 · ∑ Distance_k + w_2 · ∑ Time_k(t) + w_3 · ∑ Congestion_k + w_4 · ∑ Emission_k + w_pen · ∑ (Violations)
          </div>
          <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <li><strong>Capacity Constraint:</strong> Total load ∑ q_i ≤ Q_k for all vehicle routes k.</li>
            <li><strong>Time Windows:</strong> Arrival time t_i ∈ [e_i, l_i]. If t_i &gt; l_i, a quadratic lateness penalty is applied.</li>
            <li><strong>Dynamic Travel Time:</strong> T_e(t) = L_e / v_e(t) where v_e(t) = v_base / Congestion(t).</li>
          </ul>
        </div>
      </div>

      {/* 2. Quantum Particle Swarm Optimization (QPSO) Physics */}
      <div className="glass-panel" style={{ padding: 20 }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--accent-sky)', marginBottom: 10 }}>
          2. Quantum-Behaved Particle Swarm Optimization (QPSO) Mechanics
        </h3>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          <p style={{ marginBottom: 10 }}>
            In classical mechanics, a particle has definite position x and velocity v. In quantum mechanics, the particle state is described by a wave function ψ(x, t) governed by the Schrödinger equation inside a 1D Delta potential well centered at local attractor p_ij:
          </p>
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', padding: '12px 16px', borderRadius: 'var(--radius-sm)', fontFamily: 'JetBrains Mono, monospace', color: 'var(--accent-sky)', marginBottom: 12 }}>
            ψ(x) = (1 / √L) · exp(-|x - p_ij| / L)
          </div>
          <p style={{ marginBottom: 10 }}>
            where characteristic length L_ij(t) = 2 α |mbest_j - x_ij(t)| and mbest is the mean best position:
          </p>
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', padding: '12px 16px', borderRadius: 'var(--radius-sm)', fontFamily: 'JetBrains Mono, monospace', color: 'var(--accent-cyan)', marginBottom: 12 }}>
            mbest_j = (1 / M) · ∑ (pbest_ij)
          </div>
          <p style={{ marginBottom: 10 }}>
            Applying Monte Carlo inverse cumulative distribution sampling yields the quantum position update:
          </p>
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', padding: '12px 16px', borderRadius: 'var(--radius-sm)', fontFamily: 'JetBrains Mono, monospace', color: '#059669', marginBottom: 12 }}>
            x_ij(t+1) = p_ij(t) ± α · |mbest_j - x_ij(t)| · ln(1 / u), where u ~ U(0, 1)
          </div>
        </div>
      </div>

      {/* 3. Bloch Sphere Representation */}
      <div className="glass-panel" style={{ padding: 20 }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--accent-emerald)', marginBottom: 10 }}>
          3. Bloch Sphere Qubit Rotation Gate Decoding
        </h3>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          <p style={{ marginBottom: 10 }}>
            To map continuous quantum states to discrete combinatorial route sequences, each customer node index is encoded as a qubit state:
          </p>
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', padding: '12px 16px', borderRadius: 'var(--radius-sm)', fontFamily: 'JetBrains Mono, monospace', color: 'var(--accent-emerald)', marginBottom: 12 }}>
            |ψ⟩ = cos(θ / 2) |0⟩ + exp(i φ) sin(θ / 2) |1⟩
          </div>
          <p>
            Quantum rotation gates R(Δθ) adjust the probability amplitudes sin²(θ_i) based on fitness gradients, guiding the swarm smoothly through combinatorial local minima without velocity explosion.
          </p>
        </div>
      </div>
    </div>
  );
};
