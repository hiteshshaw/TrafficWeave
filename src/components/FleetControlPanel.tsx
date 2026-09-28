import React from 'react';
import { Vehicle, MultiObjectiveWeights } from '../types/vrp';
import { AlgorithmType } from '../types/optimizer';
import { Sliders, Truck, Gauge, Play, FastForward, RotateCcw } from 'lucide-react';

interface FleetControlPanelProps {
  vehicles: Vehicle[];
  weights: MultiObjectiveWeights;
  onUpdateWeights: (weights: Partial<MultiObjectiveWeights>) => void;
  selectedAlgorithm: AlgorithmType;
  onSelectAlgorithm: (alg: AlgorithmType) => void;
  onRunSingle: () => void;
  onStepSingle: () => void;
  onReset: () => void;
  isOptimizing: boolean;
  currentIteration: number;
  maxIterations: number;
}

export const FleetControlPanel: React.FC<FleetControlPanelProps> = ({
  vehicles,
  weights,
  onUpdateWeights,
  selectedAlgorithm,
  onSelectAlgorithm,
  onRunSingle,
  onStepSingle,
  onReset,
  isOptimizing,
}) => {
  return (
    <div className="fleet-control-panel">
      {/* Algorithm Selection & Optimization Trigger */}
      <div className="glass-panel control-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Gauge size={16} color="var(--primary)" />
            <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>Active Optimizer Engine</h4>
          </div>
          <span className="badge badge-cyan" style={{ fontSize: '0.68rem' }}>Select & Run</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
          {[
            { id: 'QPSO', name: 'QPSO (Quantum Swarm)', badge: 'Quantum', badgeType: 'cyan' },
            { id: 'CLASSICAL_PSO', name: 'Standard Classical PSO', badge: 'Classical', badgeType: 'purple' },
            { id: 'QGA', name: 'QGA (Quantum Genetic)', badge: 'Quantum', badgeType: 'cyan' },
            { id: 'CLASSICAL_GA', name: 'Classical Genetic Algorithm', badge: 'Classical', badgeType: 'purple' },
            { id: 'CLARKE_WRIGHT', name: 'Clarke-Wright Savings', badge: 'Heuristic', badgeType: 'emerald' },
          ].map(alg => {
            const isSelected = selectedAlgorithm === alg.id;
            return (
              <label
                key={alg.id}
                onClick={() => onSelectAlgorithm(alg.id as AlgorithmType)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 11px',
                  borderRadius: 'var(--radius-sm)',
                  background: isSelected ? '#eff6ff' : 'var(--bg-card)',
                  border: isSelected ? '1px solid #3b82f6' : '1px solid var(--border-subtle)',
                  boxShadow: isSelected ? '0 1px 2px rgba(59, 130, 246, 0.1)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="radio"
                    name="solver-select"
                    checked={isSelected}
                    onChange={() => onSelectAlgorithm(alg.id as AlgorithmType)}
                    style={{ accentColor: '#2563eb' }}
                  />
                  <span style={{ fontSize: '0.825rem', fontWeight: isSelected ? 600 : 500, color: isSelected ? '#1d4ed8' : 'var(--text-main)' }}>
                    {alg.name}
                  </span>
                </div>
                <span className={`badge badge-${alg.badgeType}`} style={{ fontSize: '0.65rem' }}>
                  {alg.badge}
                </span>
              </label>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={onRunSingle}
            disabled={isOptimizing}
            className="btn btn-primary"
            style={{ flex: 2, padding: '8px 12px', fontSize: '0.825rem' }}
          >
            <FastForward size={14} /> Optimize Routes
          </button>
          <button
            onClick={onStepSingle}
            disabled={isOptimizing}
            className="btn btn-secondary"
            style={{ flex: 1, padding: '8px 10px', fontSize: '0.825rem' }}
          >
            <Play size={14} /> Step
          </button>
          <button
            onClick={onReset}
            className="btn btn-secondary"
            title="Reset Solver"
            style={{ padding: '8px 10px' }}
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* Multi-Objective Weighting Sliders */}
      <div className="glass-panel control-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sliders size={16} color="var(--primary)" />
            <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>Multi-Objective Weights</h4>
          </div>
          <span className="badge badge-purple" style={{ fontSize: '0.68rem' }}>Cost Objective</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: '0.8rem' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ color: 'var(--text-muted)' }}>Travel Time Weight (w_t):</span>
              <span className="badge badge-cyan font-mono">{weights.timeWeight.toFixed(2)}</span>
            </div>
            <input
              type="range"
              className="range-control range-control-time"
              min="0"
              max="1"
              step="0.05"
              value={weights.timeWeight}
              aria-label="Travel time weight"
              onChange={e => onUpdateWeights({ timeWeight: Number(e.target.value) })}
              style={{ '--range-progress': `${weights.timeWeight * 100}%` } as React.CSSProperties}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ color: 'var(--text-muted)' }}>Distance Minimization (w_d):</span>
              <span className="badge badge-cyan font-mono">{weights.distanceWeight.toFixed(2)}</span>
            </div>
            <input
              type="range"
              className="range-control range-control-distance"
              min="0"
              max="1"
              step="0.05"
              value={weights.distanceWeight}
              aria-label="Distance minimization weight"
              onChange={e => onUpdateWeights({ distanceWeight: Number(e.target.value) })}
              style={{ '--range-progress': `${weights.distanceWeight * 100}%` } as React.CSSProperties}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ color: 'var(--text-muted)' }}>Congestion Avoidance (w_c):</span>
              <span className="badge badge-amber font-mono">{weights.congestionWeight.toFixed(2)}</span>
            </div>
            <input
              type="range"
              className="range-control range-control-congestion"
              min="0"
              max="1"
              step="0.05"
              value={weights.congestionWeight}
              aria-label="Congestion avoidance weight"
              onChange={e => onUpdateWeights({ congestionWeight: Number(e.target.value) })}
              style={{ '--range-progress': `${weights.congestionWeight * 100}%` } as React.CSSProperties}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ color: 'var(--text-muted)' }}>CO₂ Emission Penalty (w_e):</span>
              <span className="badge badge-emerald font-mono">{weights.emissionWeight.toFixed(2)}</span>
            </div>
            <input
              type="range"
              className="range-control range-control-emission"
              min="0"
              max="1"
              step="0.05"
              value={weights.emissionWeight}
              aria-label="CO₂ emission penalty weight"
              onChange={e => onUpdateWeights({ emissionWeight: Number(e.target.value) })}
              style={{ '--range-progress': `${weights.emissionWeight * 100}%` } as React.CSSProperties}
            />
          </div>
        </div>
      </div>

      {/* Fleet Dispatch List */}
      <div className="glass-panel control-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Truck size={16} color="var(--accent-emerald)" />
            <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>Active Fleet ({vehicles.length} Units)</h4>
          </div>
          <span className="badge badge-emerald">Ready</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {vehicles.map(v => (
            <div
              key={v.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 10px',
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.8rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: v.color, border: '1px solid #cbd5e1' }} />
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{v.name}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Cap: {v.capacityKg} kg | {v.type}</div>
                </div>
              </div>
              <div className="font-mono badge badge-cyan" style={{ fontSize: '0.72rem' }}>
                {v.speedMultiplier}x Spd
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
