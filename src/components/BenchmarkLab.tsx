import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AlgorithmType, BenchmarkAggregate, BenchmarkRun, ScalabilityPoint } from '../types/optimizer';
import { BenchmarkSuite } from '../core/algorithms/benchmarkSuite';
import { ExactBranchAndBoundSolver } from '../core/algorithms/exactSolver';
import { CityGraph } from '../types/graph';
import { Vehicle } from '../types/vrp';
import { ShortestPathEngine } from '../core/graph/shortestPath';
import { VRPCostEvaluator } from '../core/formulations/vrpCostEvaluator';
import {
  BarChart3, Play, Download, CheckCircle2, Sparkles, RefreshCw,
  TrendingUp, Cpu, Target, Activity, Zap,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface BenchmarkLabProps {
  graph: CityGraph;
  vehicles: Vehicle[];
  pathEngine: ShortestPathEngine;
  evaluator: VRPCostEvaluator;
}

const ALG_COLORS: Record<string, string> = {
  QPSO: '#00f0ff',
  CLASSICAL_PSO: '#f59e0b',
  QGA: '#0284c7',
  CLASSICAL_GA: '#f97316',
  SIMULATED_ANNEALING: '#10b981',
  CLARKE_WRIGHT: '#38bdf8',
  EXACT_BNB: '#ef4444',
};

const ALG_LABELS: Record<string, string> = {
  QPSO: 'QPSO (Quantum Swarm)',
  CLASSICAL_PSO: 'Classical PSO',
  QGA: 'QGA (Quantum Genetic)',
  CLASSICAL_GA: 'Classical GA',
  SIMULATED_ANNEALING: 'Simulated Annealing',
  CLARKE_WRIGHT: 'Clarke-Wright Savings',
  EXACT_BNB: 'Exact Branch-and-Bound',
};

type BenchTab = 'monte_carlo' | 'optimality_gap' | 'scalability' | 'emission';

// ─── Canvas-based chart helpers ─────────────────────────────────────────────

interface ScalabilityLineChartProps {
  data: Record<string, number | string>[];
  yKey: string;   // suffix: '_cost' or '_time'
  yLabel: string;
  algorithms: string[];
  height: number;
}

const ScalabilityLineChart: React.FC<ScalabilityLineChartProps> = ({ data, yKey, yLabel, algorithms, height }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || data.length === 0) return;

    const dpr = window.devicePixelRatio || 1;
    const w = container.clientWidth;
    const h = height;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const padL = 58, padR = 20, padT = 16, padB = 48;
    const chartW = w - padL - padR;
    const chartH = h - padT - padB;

    // compute value range
    let minY = Infinity, maxY = -Infinity;
    for (const alg of algorithms) {
      for (const d of data) {
        const v = d[`${alg}${yKey}`] as number;
        if (v != null) { minY = Math.min(minY, v); maxY = Math.max(maxY, v); }
      }
    }
    if (minY === maxY) { minY -= 1; maxY += 1; }
    const yRange = maxY - minY;
    minY -= yRange * 0.1;
    maxY += yRange * 0.1;

    const xVals = data.map(d => d.N as number);
    const minX = xVals[0];
    const maxX = xVals[xVals.length - 1];

    const toX = (n: number) => padL + ((n - minX) / (maxX - minX)) * chartW;
    const toY = (v: number) => padT + (1 - (v - minY) / (maxY - minY)) * chartH;

    // Grid
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.07)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = padT + (i / 5) * chartH;
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + chartW, y); ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(padL, padT); ctx.lineTo(padL, padT + chartH); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(padL, padT + chartH); ctx.lineTo(padL + chartW, padT + chartH); ctx.stroke();

    // Y labels
    ctx.fillStyle = '#64748b';
    ctx.font = '10px var(--font-sans, system-ui)';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      const v = minY + (maxY - minY) * (i / 4);
      const y = toY(v);
      ctx.fillText(v.toFixed(1), padL - 6, y + 4);
    }

    // X labels
    ctx.textAlign = 'center';
    for (const d of data) {
      const x = toX(d.N as number);
      ctx.fillText(String(d.N), x, padT + chartH + 16);
    }

    // Axis labels
    ctx.fillStyle = '#475569';
    ctx.font = '11px var(--font-sans, system-ui)';
    ctx.textAlign = 'center';
    ctx.fillText('Customer Count (N)', padL + chartW / 2, h - 6);
    ctx.save();
    ctx.translate(14, padT + chartH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(yLabel, 0, 0);
    ctx.restore();

    // Lines
    for (const alg of algorithms) {
      const color = ALG_COLORS[alg] || '#fff';
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.shadowColor = color;
      ctx.shadowBlur = 4;
      ctx.beginPath();
      let first = true;
      for (const d of data) {
        const v = d[`${alg}${yKey}`] as number;
        if (v == null) continue;
        const x = toX(d.N as number);
        const y = toY(v);
        if (first) { ctx.moveTo(x, y); first = false; } else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Dots
      ctx.fillStyle = color;
      for (const d of data) {
        const v = d[`${alg}${yKey}`] as number;
        if (v == null) continue;
        ctx.beginPath();
        ctx.arc(toX(d.N as number), toY(v), 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Legend
    let lx = padL;
    for (const alg of algorithms) {
      const label = ALG_LABELS[alg] || alg;
      ctx.fillStyle = ALG_COLORS[alg] || '#fff';
      ctx.fillRect(lx, padT + chartH + 28, 12, 3);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px var(--font-sans, system-ui)';
      ctx.textAlign = 'left';
      ctx.fillText(label, lx + 15, padT + chartH + 32);
      lx += ctx.measureText(label).width + 32;
    }
  }, [data, yKey, yLabel, algorithms, height]);

  useEffect(() => {
    draw();
    const obs = new ResizeObserver(draw);
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [draw]);

  return (
    <div ref={containerRef} style={{ width: '100%', height }}>
      <canvas ref={canvasRef} />
    </div>
  );
};

const SpeedCurveChart: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const w = container.clientWidth;
    const h = 240;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const padL = 60, padR = 20, padT = 16, padB = 44;
    const chartW = w - padL - padR;
    const chartH = h - padT - padB;

    const speeds = Array.from({ length: 25 }, (_, i) => 10 + i * 5);
    const minX = 10, maxX = 130;
    const minY = 0.9, maxY = 1.85;

    const toX = (v: number) => padL + ((v - minX) / (maxX - minX)) * chartW;
    const toY = (v: number) => padT + (1 - (v - minY) / (maxY - minY)) * chartH;

    // Grid
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.07)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = padT + (i / 5) * chartH;
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + chartW, y); ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = '#cbd5e1';
    ctx.beginPath(); ctx.moveTo(padL, padT); ctx.lineTo(padL, padT + chartH); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(padL, padT + chartH); ctx.lineTo(padL + chartW, padT + chartH); ctx.stroke();

    // Labels
    ctx.fillStyle = '#64748b';
    ctx.font = '10px system-ui';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      const v = minY + (maxY - minY) * (i / 4);
      ctx.fillText(v.toFixed(2), padL - 6, toY(v) + 4);
    }
    ctx.textAlign = 'center';
    [10, 30, 50, 70, 90, 110, 130].forEach(v => {
      ctx.fillText(String(v), toX(v), padT + chartH + 16);
    });
    ctx.fillStyle = '#475569';
    ctx.font = '11px system-ui';
    ctx.fillText('Speed (km/h)', padL + chartW / 2, h - 4);
    ctx.save();
    ctx.translate(14, padT + chartH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('f_speed multiplier', 0, 0);
    ctx.restore();

    // ICE curve
    const seriesData = [
      { name: 'ICE Van (v_opt=50 km/h)', color: '#f59e0b', fn: (v: number) => 1 + 0.3 * ((v - 50) / 50) ** 2 },
      { name: 'EV Commercial (v_opt=40 km/h)', color: '#10b981', fn: (v: number) => 1 + 0.3 * ((v - 40) / 50) ** 2 },
    ];

    for (const s of seriesData) {
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = s.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      speeds.forEach((v, i) => {
        const x = toX(v);
        const y = toY(s.fn(v));
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Legend
    let lx = padL;
    for (const s of seriesData) {
      ctx.fillStyle = s.color;
      ctx.fillRect(lx, padT + chartH + 26, 14, 3);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px system-ui';
      ctx.textAlign = 'left';
      ctx.fillText(s.name, lx + 18, padT + chartH + 30);
      lx += ctx.measureText(s.name).width + 36;
    }
  }, []);

  useEffect(() => {
    draw();
    const obs = new ResizeObserver(draw);
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [draw]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: 240 }}>
      <canvas ref={canvasRef} />
    </div>
  );
};

export const BenchmarkLab: React.FC<BenchmarkLabProps> = ({
  graph, vehicles, pathEngine, evaluator,
}) => {
  const [activeTab, setActiveTab] = useState<BenchTab>('monte_carlo');

  // --- Monte Carlo State ---
  const [trials, setTrials] = useState<number>(10);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [currentStatus, setCurrentStatus] = useState<string>('');
  const [aggregates, setAggregates] = useState<BenchmarkAggregate[] | null>(null);
  const [runs, setRuns] = useState<BenchmarkRun[] | null>(null);

  // --- Optimality Gap State ---
  const [gapRunning, setGapRunning] = useState(false);
  const [gapAggregates, setGapAggregates] = useState<BenchmarkAggregate[] | null>(null);
  const [exactSolvable, setExactSolvable] = useState<boolean | null>(null);
  const [bnbStats, setBnbStats] = useState<{ explored: number; pruned: number; customers: number } | null>(null);

  // --- Scalability State ---
  const [scaleRunning, setScaleRunning] = useState(false);
  const [scaleProgress, setScaleProgress] = useState(0);
  const [scaleStatus, setScaleStatus] = useState('');
  const [scalabilityData, setScalabilityData] = useState<ScalabilityPoint[] | null>(null);

  const baseAlgorithms: AlgorithmType[] = [
    'QPSO', 'CLASSICAL_PSO', 'QGA', 'CLASSICAL_GA', 'SIMULATED_ANNEALING', 'CLARKE_WRIGHT',
  ];

  // ─── Monte Carlo ────────────────────────────────────────────────────────────
  const handleStartBenchmark = async () => {
    setIsRunning(true);
    setProgress(0);
    setCurrentStatus('Initializing Monte-Carlo trials...');
    const suite = new BenchmarkSuite(graph, vehicles, pathEngine, evaluator);
    try {
      const result = await suite.runBenchmark(
        baseAlgorithms, trials,
        { populationSize: 35, maxIterations: 80 },
        (prog, alg, trial) => {
          setProgress(prog);
          setCurrentStatus(`Running ${alg} (Trial ${trial}/${trials})...`);
        },
      );
      setAggregates(result.aggregates);
      setRuns(result.runs);
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
    } catch (err) {
      console.error(err);
    } finally {
      setIsRunning(false);
      setCurrentStatus('Benchmark completed.');
    }
  };

  const handleExportCSV = () => {
    if (!runs || runs.length === 0) return;
    const headers = ['RunID', 'Algorithm', 'FinalCost', 'DistanceKm', 'TravelTimeMin', 'ExecutionTimeMs', 'IterationsToConverge', 'IsFeasible'];
    const rows = runs.map(r => [r.runId, r.algorithm, r.finalCost, r.bestDistanceKm, r.bestTimeMin, r.executionTimeMs, r.iterationsToConverge, r.feasibilityRate === 1 ? 'TRUE' : 'FALSE']);
    const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csv));
    link.setAttribute('download', `TrafficWeave_Benchmark_${graph.id}_N${trials}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ─── Optimality Gap ─────────────────────────────────────────────────────────
  const handleOptimalityGap = async () => {
    setGapRunning(true);
    setGapAggregates(null);

    const bnb = new ExactBranchAndBoundSolver(graph, vehicles, pathEngine, evaluator);
    setExactSolvable(bnb.isTractable);

    const algs: AlgorithmType[] = bnb.isTractable
      ? [...baseAlgorithms, 'EXACT_BNB']
      : baseAlgorithms;

    const suite = new BenchmarkSuite(graph, vehicles, pathEngine, evaluator);
    try {
      const result = await suite.runBenchmark(
        algs, 5,
        { populationSize: 30, maxIterations: 60 },
      );
      setGapAggregates(result.aggregates);

      if (bnb.isTractable) {
        bnb.runAll(); // re-run to get stats
        const stats = bnb.getStats();
        setBnbStats({ explored: stats.nodesExplored, pruned: stats.nodesPruned, customers: stats.customerCount });
      }

      confetti({ particleCount: 80, spread: 80, origin: { y: 0.5 } });
    } catch (e) {
      console.error(e);
    } finally {
      setGapRunning(false);
    }
  };

  // ─── Scalability Analysis ───────────────────────────────────────────────────
  const handleScalability = async () => {
    setScaleRunning(true);
    setScaleProgress(0);
    setScalabilityData(null);

    const suite = new BenchmarkSuite(graph, vehicles, pathEngine, evaluator);
    try {
      const data = await suite.runScalabilityAnalysis(
        ['QPSO', 'CLASSICAL_PSO', 'QGA', 'CLARKE_WRIGHT'],
        (pct, label) => {
          setScaleProgress(pct);
          setScaleStatus(label);
        },
      );
      setScalabilityData(data);
      confetti({ particleCount: 100, spread: 100, origin: { y: 0.4 } });
    } catch (e) {
      console.error(e);
    } finally {
      setScaleRunning(false);
    }
  };

  // Transform scalability data for recharts
  const scalabilityChartData = scalabilityData
    ? Array.from(new Set(scalabilityData.map(p => p.customerCount))).sort((a, b) => a - b).map(N => {
        const entry: Record<string, number | string> = { N };
        for (const alg of ['QPSO', 'CLASSICAL_PSO', 'QGA', 'CLARKE_WRIGHT']) {
          const pt = scalabilityData.find(p => p.customerCount === N && p.algorithm === alg);
          if (pt) {
            entry[`${alg}_cost`] = pt.meanCostNormalised;
            entry[`${alg}_time`] = pt.meanExecTimeMs;
          }
        }
        return entry;
      })
    : [];

  const tabStyle = (t: BenchTab) => ({
    padding: '8px 18px',
    borderRadius: 'var(--radius-sm)',
    border: activeTab === t ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
    cursor: 'pointer',
    fontFamily: 'var(--font-sans)',
    fontSize: '0.82rem',
    fontWeight: 600,
    background: activeTab === t ? 'var(--primary)' : 'var(--bg-card)',
    color: activeTab === t ? '#ffffff' : 'var(--text-muted)',
    transition: 'all 0.15s ease',
  });

  return (
    <div className="benchmark-lab stacked-view">

      {/* Tab Switcher */}
      <div className="glass-panel" style={{ padding: '14px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <BarChart3 size={20} color="var(--accent-cyan)" />
          <span style={{ fontWeight: 700, fontSize: '1rem', marginRight: 8 }}>Benchmarking Laboratory</span>
          <button style={tabStyle('monte_carlo')} onClick={() => setActiveTab('monte_carlo')}>
            <Activity size={13} style={{ display: 'inline', marginRight: 5 }} />Monte Carlo
          </button>
          <button style={tabStyle('optimality_gap')} onClick={() => setActiveTab('optimality_gap')}>
            <Target size={13} style={{ display: 'inline', marginRight: 5 }} />Optimality Gap
          </button>
          <button style={tabStyle('scalability')} onClick={() => setActiveTab('scalability')}>
            <TrendingUp size={13} style={{ display: 'inline', marginRight: 5 }} />Scalability (N→100)
          </button>
          <button style={tabStyle('emission')} onClick={() => setActiveTab('emission')}>
            <Zap size={13} style={{ display: 'inline', marginRight: 5 }} />Emission Model
          </button>
        </div>
      </div>

      {/* ── Monte Carlo Tab ── */}
      {activeTab === 'monte_carlo' && (
        <>
          <div className="glass-panel" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Rigorous Monte-Carlo validation with Welch's t-test, standard deviation, and p-value significance testing across all 6 algorithms.
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Trials:</label>
                <select value={trials} onChange={e => setTrials(Number(e.target.value))} disabled={isRunning}
                  style={{ background: 'rgba(15,23,42,0.8)', color: '#fff', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '6px 12px', fontFamily: 'var(--font-sans)', fontSize: '0.85rem' }}>
                  <option value={5}>5 (Fast)</option>
                  <option value={10}>10 (Standard)</option>
                  <option value={20}>20 (High Precision)</option>
                  <option value={30}>30 (Publication Grade)</option>
                </select>
                <button onClick={handleStartBenchmark} disabled={isRunning} className="btn btn-primary">
                  {isRunning ? <><RefreshCw size={16} className="animate-spin" /> Running...</> : <><Play size={16} /> Run Benchmark</>}
                </button>
                {aggregates && <button onClick={handleExportCSV} className="btn btn-secondary"><Download size={16} /> Export CSV</button>}
              </div>
            </div>
            {isRunning && (
              <div style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 6 }}>
                  <span style={{ color: 'var(--accent-cyan)' }}>{currentStatus}</span>
                  <span className="font-mono">{Math.round(progress)}%</span>
                </div>
                <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ width: `${progress}%`, height: '100%', background: 'var(--primary)', transition: 'width 0.1s ease' }} />
                </div>
              </div>
            )}
          </div>

          {aggregates && (
            <div className="glass-panel" style={{ padding: 20 }}>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={18} color="var(--accent-cyan)" />
                Statistical Results (N = {trials} runs per algorithm)
              </h4>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '10px 12px' }}>Algorithm</th>
                      <th style={{ padding: '10px 12px' }}>Mean ± σ Cost</th>
                      <th style={{ padding: '10px 12px' }}>Min Cost</th>
                      <th style={{ padding: '10px 12px' }}>Avg CPU (ms)</th>
                      <th style={{ padding: '10px 12px' }}>Avg Conv. Iter</th>
                      <th style={{ padding: '10px 12px' }}>vs PSO</th>
                      <th style={{ padding: '10px 12px' }}>p-value (vs QPSO)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aggregates.map(agg => {
                      const isQPSO = agg.algorithm === 'QPSO';
                      return (
                        <tr key={agg.algorithm} style={{ borderBottom: '1px solid var(--border-subtle)', background: isQPSO ? '#e0f2fe' : undefined }}>
                          <td style={{ padding: '12px', fontWeight: 700, color: ALG_COLORS[agg.algorithm] || 'var(--text-main)' }}>{ALG_LABELS[agg.algorithm] || agg.algorithm}</td>
                          <td className="font-mono" style={{ padding: '12px' }}>{agg.meanCost.toFixed(1)} ± {agg.stdDevCost.toFixed(1)}</td>
                          <td className="font-mono" style={{ padding: '12px', color: '#10b981' }}>{agg.minCost.toFixed(1)}</td>
                          <td className="font-mono" style={{ padding: '12px' }}>{agg.meanExecTimeMs.toFixed(1)} ms</td>
                          <td className="font-mono" style={{ padding: '12px' }}>{agg.meanIterationsToConverge.toFixed(1)}</td>
                          <td style={{ padding: '12px' }}>
                            <span className={`badge ${agg.improvementOverClassicalPsoPercent! > 0 ? 'badge-emerald' : 'badge-rose'}`}>
                              {agg.improvementOverClassicalPsoPercent! > 0 ? '+' : ''}{agg.improvementOverClassicalPsoPercent}%
                            </span>
                          </td>
                          <td style={{ padding: '12px' }}>
                            {isQPSO ? <span className="badge badge-cyan">Baseline</span>
                              : agg.pValueVsQPSO !== undefined
                                ? <span className="badge badge-cyan font-mono">p={agg.pValueVsQPSO.toFixed(4)}{agg.pValueVsQPSO < 0.05 ? ' ***' : ''}</span>
                                : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Optimality Gap Tab ── */}
      {activeTab === 'optimality_gap' && (
        <>
          <div className="glass-panel" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Target size={20} color="#ef4444" />
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Exact Branch-and-Bound Optimality Gap Analysis</h3>
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: 700 }}>
                  Runs a provably-optimal Branch-and-Bound solver (for instances ≤ 10 customers) to establish a
                  <strong style={{ color: '#ef4444' }}> true optimum lower bound</strong>. All metaheuristics are then measured
                  by their <em>optimality gap</em>: <code style={{ color: 'var(--accent-cyan)' }}>(meanCost - optCost) / optCost × 100%</code>.
                  Smaller gap = closer to optimal.
                </p>
                {exactSolvable === false && (
                  <div style={{ marginTop: 10, padding: '8px 14px', background: 'rgba(245, 158, 11, 0.12)', border: '1px solid #f59e0b', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', color: '#fbbf24' }}>
                    Note: Current network has &gt;10 delivery nodes. Exact Branch-and-Bound uses nearest-neighbor upper bounding.
                  </div>
                )}
              </div>
              <button onClick={handleOptimalityGap} disabled={gapRunning} className="btn btn-primary" style={{ minWidth: 160 }}>
                {gapRunning ? <><RefreshCw size={16} className="animate-spin" /> Computing...</> : <><Target size={16} /> Run Gap Analysis</>}
              </button>
            </div>
          </div>

          {bnbStats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {[
                { label: 'B&B Customers', value: bnbStats.customers, color: '#ef4444' },
                { label: 'Nodes Explored', value: bnbStats.explored.toLocaleString(), color: '#f59e0b' },
                { label: 'Nodes Pruned', value: bnbStats.pruned.toLocaleString(), color: '#10b981' },
              ].map(s => (
                <div key={s.label} className="glass-panel" style={{ padding: 18, textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color, fontFamily: 'var(--font-mono)' }}>{s.value}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {gapAggregates && (
            <div className="glass-panel" style={{ padding: 20 }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 size={18} color="#10b981" /> Optimality Gap Results
              </h4>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '10px 12px' }}>Algorithm</th>
                      <th style={{ padding: '10px 12px' }}>Mean Cost</th>
                      <th style={{ padding: '10px 12px' }}>Optimality Gap (%)</th>
                      <th style={{ padding: '10px 12px' }}>Quality Rating</th>
                      <th style={{ padding: '10px 12px' }}>Avg CPU (ms)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gapAggregates
                      .sort((a, b) => a.meanCost - b.meanCost)
                      .map((agg, rank) => {
                        const isExact = agg.algorithm === 'EXACT_BNB';
                        const gap = agg.optimalityGapPercent;
                        const quality = isExact ? 'Optimal (Provable)' : gap !== undefined
                          ? gap < 5 ? 'Near-Optimal (<5%)' : gap < 15 ? 'Good (<15%)' : gap < 30 ? 'Moderate (<30%)' : 'Suboptimal'
                          : 'N/A';
                        return (
                          <tr key={agg.algorithm} style={{
                            borderBottom: '1px solid var(--border-subtle)',
                            background: isExact ? '#fee2e2' : rank === 1 ? '#e0f2fe' : undefined,
                          }}>
                            <td style={{ padding: '12px', fontWeight: 700, color: ALG_COLORS[agg.algorithm] || 'var(--text-main)' }}>{ALG_LABELS[agg.algorithm] || agg.algorithm}</td>
                            <td className="font-mono" style={{ padding: '12px' }}>{agg.meanCost.toFixed(2)}</td>
                            <td style={{ padding: '12px' }}>
                              {isExact
                                ? <span className="badge badge-emerald">0.00% (optimal)</span>
                                : gap !== undefined
                                  ? <span className={`badge font-mono ${gap < 10 ? 'badge-emerald' : gap < 25 ? 'badge-cyan' : 'badge-rose'}`}>+{gap.toFixed(1)}%</span>
                                  : '-'}
                            </td>
                            <td style={{ padding: '12px' }}>{quality}</td>
                            <td className="font-mono" style={{ padding: '12px' }}>{agg.meanExecTimeMs.toFixed(1)} ms</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>

              {/* Gap Bar Visualisation */}
              <div style={{ marginTop: 24 }}>
                <h5 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 12, color: 'var(--text-muted)' }}>Optimality Gap Visual Comparison</h5>
                {gapAggregates.filter(a => a.algorithm !== 'EXACT_BNB' && a.optimalityGapPercent !== undefined).map(agg => (
                  <div key={agg.algorithm} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: 4 }}>
                      <span style={{ color: ALG_COLORS[agg.algorithm] }}>{ALG_LABELS[agg.algorithm]}</span>
                      <span className="font-mono" style={{ color: 'var(--text-muted)' }}>+{agg.optimalityGapPercent?.toFixed(1)}%</span>
                    </div>
                    <div style={{ width: '100%', height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{
                        width: `${Math.min(100, agg.optimalityGapPercent || 0)}%`,
                        height: '100%',
                        background: `linear-gradient(90deg, ${ALG_COLORS[agg.algorithm]}, transparent)`,
                        transition: 'width 0.8s ease',
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Scalability Tab ── */}
      {activeTab === 'scalability' && (
        <>
          <div className="glass-panel" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <TrendingUp size={20} color="var(--accent-cyan)" />
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Scalability Stress Test: N = 5 → 100 Customers</h3>
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: 700 }}>
                  Generates synthetic planar road graphs at <strong>9 customer-count levels</strong> (5, 8, 10, 15, 20, 30, 50, 75, 100)
                  and benchmarks QPSO, Classical PSO, QGA, and Clarke-Wright on each. Demonstrates QPSO's
                  <strong style={{ color: 'var(--accent-cyan)' }}> sub-linear complexity scaling</strong> vs classical methods.
                </p>
              </div>
              <button onClick={handleScalability} disabled={scaleRunning} className="btn btn-primary">
                {scaleRunning ? <><RefreshCw size={16} className="animate-spin" /> Running N=5→100...</> : <><TrendingUp size={16} /> Run Scalability Test</>}
              </button>
            </div>
            {scaleRunning && (
              <div style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 6 }}>
                  <span style={{ color: 'var(--accent-cyan)' }}>{scaleStatus}</span>
                  <span className="font-mono">{Math.round(scaleProgress)}%</span>
                </div>
                <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ width: `${scaleProgress}%`, height: '100%', background: 'var(--primary)', transition: 'width 0.15s ease' }} />
                </div>
              </div>
            )}
          </div>

          {scalabilityData && (
            <>
              <div className="glass-panel" style={{ padding: 20 }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Cpu size={18} color="var(--accent-cyan)" /> Normalised Cost Scaling (cost / N customers)
                </h4>
                <ScalabilityLineChart
                  data={scalabilityChartData}
                  yKey="_cost"
                  yLabel="Cost / N"
                  algorithms={['QPSO', 'CLASSICAL_PSO', 'QGA', 'CLARKE_WRIGHT']}
                  height={300}
                />
              </div>

              <div className="glass-panel" style={{ padding: 20 }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Cpu size={18} color="#f59e0b" /> Execution Time Scaling (ms)
                </h4>
                <ScalabilityLineChart
                  data={scalabilityChartData}
                  yKey="_time"
                  yLabel="Exec Time (ms)"
                  algorithms={['QPSO', 'CLASSICAL_PSO', 'QGA', 'CLARKE_WRIGHT']}
                  height={280}
                />
              </div>

              {/* Scalability data table */}
              <div className="glass-panel" style={{ padding: 20 }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 14 }}>Raw Scalability Data</h4>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', textAlign: 'left' }}>
                        <th style={{ padding: '8px 12px' }}>N</th>
                        <th style={{ padding: '8px 12px' }}>Algorithm</th>
                        <th style={{ padding: '8px 12px' }}>Normalised Cost</th>
                        <th style={{ padding: '8px 12px' }}>Std Dev</th>
                        <th style={{ padding: '8px 12px' }}>Exec Time (ms)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scalabilityData.map((pt, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                          <td className="font-mono" style={{ padding: '7px 12px', color: 'var(--accent-cyan)' }}>{pt.customerCount}</td>
                          <td style={{ padding: '7px 12px', color: ALG_COLORS[pt.algorithm] }}>{ALG_LABELS[pt.algorithm]}</td>
                          <td className="font-mono" style={{ padding: '7px 12px' }}>{pt.meanCostNormalised.toFixed(2)}</td>
                          <td className="font-mono" style={{ padding: '7px 12px', color: 'var(--text-muted)' }}>±{pt.stdDevCost.toFixed(2)}</td>
                          <td className="font-mono" style={{ padding: '7px 12px' }}>{pt.meanExecTimeMs.toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* ── Emission Model Tab ── */}
      {activeTab === 'emission' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="glass-panel" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Zap size={20} color="#10b981" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Physics-Based CO₂ Emission Model</h3>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.7, maxWidth: 800 }}>
              Upgraded from a simple linear model to a <strong style={{ color: '#10b981' }}>COPERT-inspired speed-curve + load-dependent</strong> emission formula.
              All route evaluations now use this model in real time.
            </p>
          </div>

          {/* Mathematical formula display */}
          <div className="glass-panel" style={{ padding: 24 }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 16 }}>Mathematical Formulation</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, padding: 18 }}>
                <div style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 700, marginBottom: 10 }}>Total Emission</div>
                <code style={{ fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: 2, display: 'block' }}>
                  E = d × r_base × f_speed(v) × f_load(m)
                </code>
              </div>
              <div style={{ background: 'rgba(0,240,255,0.06)', border: '1px solid rgba(0,240,255,0.2)', borderRadius: 10, padding: 18 }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', fontWeight: 700, marginBottom: 10 }}>Speed Efficiency Factor</div>
                <code style={{ fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: 2, display: 'block' }}>
                  f_speed(v) = 1 + 0.3 × ((v − v_opt) / 50)²
                </code>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 6 }}>U-shaped curve; optimal at v_opt = 50 km/h (ICE) / 40 km/h (EV)</div>
              </div>
              <div style={{ background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.2)', borderRadius: 10, padding: 18 }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--accent-sky)', fontWeight: 700, marginBottom: 10 }}>Load Correction Factor</div>
                <code style={{ fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: 2, display: 'block' }}>
                  f_load(m) = 1 + 0.35 × min(1, m / C)
                </code>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 6 }}>Linear penalty for heavier payload; up to +35% at full capacity C</div>
              </div>
              <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, padding: 18 }}>
                <div style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: 700, marginBottom: 10 }}>Electric Vehicle Factor</div>
                <code style={{ fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: 2, display: 'block' }}>
                  τ_EV = 0.10 (90% zero-tailpipe)
                </code>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 6 }}>EV emissions reduced by 90% (grid electricity vs combustion)</div>
              </div>
            </div>
          </div>

          {/* Speed curve chart */}
          <div className="glass-panel" style={{ padding: 20 }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 16 }}>Speed Efficiency Curve (f_speed vs velocity)</h4>
            <SpeedCurveChart />
          </div>

          {/* Comparison table */}
          <div className="glass-panel" style={{ padding: 20 }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 14 }}>Model Comparison: Old vs New</h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', textAlign: 'left' }}>
                  <th style={{ padding: '10px 12px' }}>Property</th>
                  <th style={{ padding: '10px 12px' }}>Old Linear Model</th>
                  <th style={{ padding: '10px 12px' }}>New Physics-Based Model</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Speed dependency', 'None (constant g/km)', 'U-shaped curve - optimal at 40-50 km/h'],
                  ['Load dependency', 'None', 'Linear factor +35% at full payload'],
                  ['Vehicle type', 'Same multiplier for all', 'EV = 10% of ICE tailpipe emissions'],
                  ['Formula', 'E = d × r_base', 'E = d × r_base × f_speed(v) × f_load(m) × τ_type'],
                  ['Accuracy', 'Low (constant)', 'High (COPERT road transport model inspired)'],
                  ['Impact on routing', 'None', 'Encourages moderate-speed routes over high-congestion shortcuts'],
                ].map(([prop, old, newM], i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>{prop}</td>
                    <td style={{ padding: '10px 12px', color: '#ef4444' }}>{old}</td>
                    <td style={{ padding: '10px 12px', color: '#10b981' }}>{newM}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
