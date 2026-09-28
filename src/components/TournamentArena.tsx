import React from 'react';
import { TournamentContender } from '../core/algorithms/tournamentRunner';
import { Zap, Trophy, Play, Pause, StepForward, RotateCcw, FastForward } from 'lucide-react';

interface TournamentArenaProps {
  contenders: TournamentContender[];
  isPlaying: boolean;
  onTogglePlay: () => void;
  onStep: () => void;
  onRunAll: () => void;
  onReset: () => void;
  currentIteration: number;
  maxIterations: number;
}

export const TournamentArena: React.FC<TournamentArenaProps> = ({
  contenders,
  isPlaying,
  onTogglePlay,
  onStep,
  onRunAll,
  onReset,
  currentIteration,
  maxIterations,
}) => {
  // Determine leader / winner
  let bestCost = Infinity;
  let winnerId = '';
  contenders.forEach(c => {
    if (c.state.bestCost < bestCost) {
      bestCost = c.state.bestCost;
      winnerId = c.id;
    }
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Tournament Controls Bar */}
      <div className="glass-panel" style={{
        padding: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 38,
            height: 38,
            borderRadius: 'var(--radius-sm)',
            background: 'var(--primary-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid var(--primary-border)',
          }}>
            <Zap size={20} color="var(--primary)" />
          </div>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>Metaheuristic Algorithm Arena</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Parallel synchronized optimization on identical graph topology and fleet constraints
            </p>
          </div>
        </div>

        {/* Progress and Playback Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="badge badge-cyan font-mono" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
            Iteration {currentIteration} / {maxIterations}
          </div>

          <button onClick={onTogglePlay} className={`btn ${isPlaying ? 'btn-danger' : 'btn-primary'}`} style={{ padding: '7px 14px' }}>
            {isPlaying ? <><Pause size={15} /> Pause Race</> : <><Play size={15} /> Start Race</>}
          </button>

          <button onClick={onStep} disabled={isPlaying} className="btn btn-secondary" title="Advance 1 Iteration" style={{ padding: '7px 12px' }}>
            <StepForward size={15} /> Step
          </button>

          <button onClick={onRunAll} disabled={isPlaying} className="btn btn-quantum" title="Solve to 100% Convergence" style={{ padding: '7px 12px' }}>
            <FastForward size={15} /> Solve All
          </button>

          <button onClick={onReset} className="btn btn-secondary" title="Reset Tournament" style={{ padding: '7px 10px' }}>
            <RotateCcw size={15} />
          </button>
        </div>
      </div>

      {/* Contender Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 16,
      }}>
        {contenders.map(c => {
          const isWinner = c.id === winnerId && currentIteration > 0;
          const sol = c.state.bestSolution;
          const progressPercent = Math.min(100, Math.round((c.state.currentIteration / maxIterations) * 100));

          return (
            <div
              key={c.id}
              className="glass-panel"
              style={{
                padding: 16,
                position: 'relative',
                overflow: 'hidden',
                borderTop: `3px solid ${c.color}`,
                boxShadow: isWinner ? '0 4px 12px rgba(217, 119, 6, 0.15)' : 'var(--shadow-card)',
              }}
            >
              {/* Winner Ribbon */}
              {isWinner && (
                <div style={{
                  position: 'absolute',
                  top: 10,
                  right: 10,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  background: '#fffbeb',
                  border: '1px solid #fde68a',
                  color: '#b45309',
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                }}>
                  <Trophy size={13} /> Current Leader
                </div>
              )}

              {/* Title & Badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: c.color }} />
                <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)' }}>{c.name}</h4>
              </div>

              {/* Progress Bar */}
              <div style={{
                width: '100%',
                height: 5,
                background: 'var(--bg-muted)',
                borderRadius: 3,
                marginBottom: 14,
                overflow: 'hidden',
              }}>
                <div style={{
                  width: `${progressPercent}%`,
                  height: '100%',
                  background: c.color,
                  transition: 'width 0.2s linear',
                }} />
              </div>

              {/* Metrics Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                <div style={{ background: 'var(--bg-secondary)', padding: '7px 9px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Multi-Obj Cost</div>
                  <div className="font-mono" style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    {c.state.bestCost === Infinity ? 'N/A' : c.state.bestCost.toFixed(1)}
                  </div>
                </div>

                <div style={{ background: 'var(--bg-secondary)', padding: '7px 9px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Total Distance</div>
                  <div className="font-mono" style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    {sol ? `${sol.totalDistanceKm.toFixed(1)} km` : 'N/A'}
                  </div>
                </div>

                <div style={{ background: 'var(--bg-secondary)', padding: '7px 9px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Travel Time</div>
                  <div className="font-mono" style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                    {sol ? `${sol.totalTimeMin.toFixed(0)} min` : 'N/A'}
                  </div>
                </div>

                <div style={{ background: 'var(--bg-secondary)', padding: '7px 9px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>CO₂ Emissions</div>
                  <div className="font-mono" style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                    {sol ? `${sol.totalEmissionKg.toFixed(1)} kg` : 'N/A'}
                  </div>
                </div>
              </div>

              {/* Status footer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                <span className={`badge ${c.isQuantum ? 'badge-cyan' : 'badge-purple'}`} style={{ fontSize: '0.65rem' }}>
                  {c.isQuantum ? 'Quantum-Behaved' : 'Classical Heuristic'}
                </span>
                <span style={{ fontWeight: 500, color: c.state.isFinished ? '#15803d' : 'var(--text-dim)' }}>
                  {c.state.isFinished ? '✓ Converged' : 'Optimizing...'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
