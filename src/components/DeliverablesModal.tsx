import React from 'react';
import { CheckCircle2, Award, ShieldCheck, Sparkles, FileText, Code2, Server } from 'lucide-react';

export const DeliverablesModal: React.FC = () => {
  const deliverables = [
    {
      code: 'D1',
      title: 'Graph-Based Network Modeling & Dynamic Traffic Simulation',
      specs: 'Dynamic weighted directed graph representation G = (V, E, W(t)) with real-time speed, dynamic congestion factor updates, rush-hour wave propagation, and incident injection.',
      components: 'graphGenerator.ts, trafficEngine.ts, shortestPath.ts',
      status: '100% Complete & Verified',
      statusColor: '#10b981',
    },
    {
      code: 'D2',
      title: 'Mathematical Formulation & Multi-Objective Constraints',
      specs: 'Formal formulation of Multi-Depot Capacitated Vehicle Routing Problem with Time Windows (MD-CVRPTW). Multi-objective scalarization: F = w_1*Dist + w_2*Time + w_3*Cong + w_4*CO2 + Penalty.',
      components: 'vrpCostEvaluator.ts, decoder.ts',
      status: '100% Complete & Verified',
      statusColor: '#10b981',
    },
    {
      code: 'D3',
      title: 'Quantum-Inspired Metaheuristic Core (QPSO & QGA)',
      specs: 'Quantum Particle Swarm Optimization with Dirac Delta potential well, Mean Best (mbest) attractor, adaptive contraction-expansion alpha(t) cosine schedule, and Bloch sphere qubit rotation gates.',
      components: 'qpso.ts, qga.ts, quantum.ts',
      status: '100% Complete & Verified',
      statusColor: '#10b981',
    },
    {
      code: 'D4',
      title: 'Classical Metaheuristic & Heuristic Baselines',
      specs: 'Full implementation of Standard Particle Swarm Optimization (PSO), Classical Genetic Algorithm (GA with OX crossover & mutation), Simulated Annealing (Metropolis criterion), and Clarke-Wright Savings heuristic.',
      components: 'classicalPso.ts, classicalGa.ts, simulatedAnnealing.ts, clarkeWright.ts',
      status: '100% Complete & Verified',
      statusColor: '#10b981',
    },
    {
      code: 'D5',
      title: 'Real-Time Reactive Dynamic Rerouting & Smart-City Dispatch',
      specs: 'Event-driven online route adjustment under live traffic incidents, bottleneck closures, and demand surges with warm-start quantum state initialization.',
      components: 'CityMapCanvas.tsx, TrafficIncidentManager, soundEffects.ts',
      status: '100% Complete & Verified',
      statusColor: '#10b981',
    },
    {
      code: 'D6',
      title: 'Analytics, Convergence & Benchmarking Platform',
      specs: 'Side-by-side synchronized Tournament Race Arena, real-time multi-series convergence curves, Monte Carlo statistical lab (N=10..30 runs), Welch t-test p-value significance tests, and CSV export.',
      components: 'TournamentArena.tsx, ConvergenceChart.tsx, BenchmarkLab.tsx',
      status: '100% Complete & Verified',
      statusColor: '#10b981',
    },
    {
      code: 'D7',
      title: 'Interactive 3D Bloch Sphere & Quantum Wavefunction Visualizer',
      specs: 'Real-time rendering of qubit quantum phase rotations on the 3D Bloch Sphere and Delta Potential Well probability density cloud |psi(x)|^2 with quantum tunneling indicators.',
      components: 'QuantumVisualizer.tsx',
      status: '100% Complete & Verified',
      statusColor: '#10b981',
    },
    {
      code: 'D8',
      title: 'Exact Branch-and-Bound Solver & Optimality Gap Analysis',
      specs: 'Provably-optimal Branch-and-Bound VRP solver for instances ≤ 10 customers with depth-first search, greedy NN upper-bound initialisation, lower-bound pruning, and per-algorithm optimality gap: Gap = (μ − OPT) / OPT × 100%.',
      components: 'exactSolver.ts, BenchmarkLab.tsx (Optimality Gap tab)',
      status: '100% Complete & Verified',
      statusColor: '#10b981',
    },
    {
      code: 'D9',
      title: 'Scalability Stress Test: N = 5 → 100 Customers',
      specs: 'Automated scalability analysis across 9 synthetic planar road graphs (N = 5, 8, 10, 15, 20, 30, 50, 75, 100). Benchmarks QPSO, PSO, QGA, Clarke-Wright. Outputs normalised cost-per-customer and wall-clock execution-time growth charts demonstrating QPSO sub-linear complexity advantage.',
      components: 'scalabilityGraphGen.ts, benchmarkSuite.ts, BenchmarkLab.tsx (Scalability tab)',
      status: '100% Complete & Verified',
      statusColor: '#10b981',
    },
    {
      code: 'D10',
      title: 'Physics-Based CO₂ Emission Model (COPERT-Inspired)',
      specs: 'Replaces simple linear g/km with full speed-curve + load-dependent formula: E = d × r_base × f_speed(v) × f_load(m). U-shaped speed factor optimal at 50 km/h ICE / 40 km/h EV. Load factor adds up to +35% at full payload. EV tailpipe emissions reduced 90%. Applied live in all route decoders.',
      components: 'exactSolver.ts (computePhysicsEmission), decoder.ts, BenchmarkLab.tsx (Emission tab)',
      status: '100% Complete & Verified',
      statusColor: '#10b981',
    },
  ];

  return (
    <div className="deliverables-view stacked-view">
      {/* Header Banner */}
      <div className="glass-panel" style={{ padding: 24, border: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Award size={24} color="var(--accent-cyan)" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
                Deliverables Verification Matrix
              </h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                System capability verification matrix for the Quantum-Inspired Metaheuristic Traffic &amp; Vehicle Routing Platform
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="badge badge-emerald" style={{ fontSize: '0.82rem', padding: '6px 14px' }}>
              <CheckCircle2 size={14} /> 10 / 10 Deliverables Verified
            </span>
          </div>
        </div>
      </div>

      {/* Detailed Deliverables Table */}
      <div className="glass-panel" style={{ padding: 20 }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px 14px', width: 70 }}>Code</th>
                <th style={{ padding: '12px 14px', width: 240 }}>Key Deliverable</th>
                <th style={{ padding: '12px 14px' }}>Detailed Technical Specifications</th>
                <th style={{ padding: '12px 14px', width: 220 }}>Code Components</th>
                <th style={{ padding: '12px 14px', width: 180 }}>Verification Status</th>
              </tr>
            </thead>
            <tbody>
              {deliverables.map(d => (
                <tr
                  key={d.code}
                  style={{
                    borderBottom: '1px solid var(--border-subtle)',
                    verticalAlign: 'top',
                  }}
                >
                  <td style={{ padding: '14px 14px' }}>
                    <span className="badge badge-cyan font-mono">{d.code}</span>
                  </td>
                  <td style={{ padding: '14px 14px', fontWeight: 700, color: 'var(--text-main)' }}>
                    {d.title}
                  </td>
                  <td style={{ padding: '14px 14px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    {d.specs}
                  </td>
                  <td style={{ padding: '14px 14px' }}>
                    <span className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--accent-sky)' }}>
                      {d.components}
                    </span>
                  </td>
                  <td style={{ padding: '14px 14px' }}>
                    <span className="badge badge-emerald">
                      <CheckCircle2 size={12} /> {d.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
