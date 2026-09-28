import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ActiveTab, MapViewMode, Header } from './components/Header';
import { RealLeafletMap } from './components/RealLeafletMap';
import { CityMapCanvas } from './components/CityMapCanvas';
import { QuantumVisualizer } from './components/QuantumVisualizer';
import { ConvergenceChart } from './components/ConvergenceChart';
import { TournamentArena } from './components/TournamentArena';
import { BenchmarkLab } from './components/BenchmarkLab';
import { FleetControlPanel } from './components/FleetControlPanel';
import { DeliverablesModal } from './components/DeliverablesModal';
import { TheoryGuide } from './components/TheoryGuide';
import { QuantumInnovationsLab } from './components/QuantumInnovationsLab';

import { PRESET_MAPS } from './core/graph/graphGenerator';
import { CityGraph, TrafficIncident } from './types/graph';
import { Vehicle, MultiObjectiveWeights, VRPSolution } from './types/vrp';
import { AlgorithmType, OptimizationStepState } from './types/optimizer';

import { TrafficSimulationEngine } from './core/graph/trafficEngine';
import { ShortestPathEngine } from './core/graph/shortestPath';
import { VRPCostEvaluator, DEFAULT_WEIGHTS } from './core/formulations/vrpCostEvaluator';

import { QPSOOptimizer } from './core/algorithms/qpso';
import { ClassicalPSOOptimizer } from './core/algorithms/classicalPso';
import { QGAOptimizer } from './core/algorithms/qga';
import { ClassicalGAOptimizer } from './core/algorithms/classicalGa';
import { SimulatedAnnealingOptimizer } from './core/algorithms/simulatedAnnealing';
import { ClarkeWrightSavingsOptimizer } from './core/algorithms/clarkeWright';
import { TournamentRunner } from './core/algorithms/tournamentRunner';
import { sounds } from './core/audio/soundEffects';

const INITIAL_VEHICLES: Vehicle[] = [
  { id: 'v1', name: 'Quantum Dispatch Van 01', type: 'van', capacityKg: 500, currentLoadKg: 0, speedMultiplier: 1.1, emissionRateGPerKm: 120, color: '#0284c7' },
  { id: 'v2', name: 'Eco-Electric Carrier 02', type: 'electric_truck', capacityKg: 750, currentLoadKg: 0, speedMultiplier: 1.0, emissionRateGPerKm: 40, color: '#059669' },
  { id: 'v3', name: 'Heavy Freight Hauler 03', type: 'heavy_cargo', capacityKg: 1200, currentLoadKg: 0, speedMultiplier: 0.85, emissionRateGPerKm: 230, color: '#d97706' },
  { id: 'v4', name: 'Rapid Logistics Courier 04', type: 'van', capacityKg: 450, currentLoadKg: 0, speedMultiplier: 1.25, emissionRateGPerKm: 110, color: '#7c3aed' },
];

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('simulation');
  const [mapViewMode, setMapViewMode] = useState<MapViewMode>('real_gis');
  const [selectedCityId, setSelectedCityId] = useState<string>('mumbai_real');
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Graph and Simulation Engines
  const [graph, setGraph] = useState<CityGraph>(() => PRESET_MAPS['mumbai_real']());
  const [vehicles, setVehicles] = useState<Vehicle[]>(INITIAL_VEHICLES);
  const [weights, setWeights] = useState<MultiObjectiveWeights>(DEFAULT_WEIGHTS);
  const [simulationTimeMin, setSimulationTimeMin] = useState<number>(0);
  const [incidents, setIncidents] = useState<TrafficIncident[]>([]);

  const trafficEngineRef = useRef<TrafficSimulationEngine>(new TrafficSimulationEngine(graph));
  const pathEngineRef = useRef<ShortestPathEngine>(new ShortestPathEngine(graph));
  const evaluatorRef = useRef<VRPCostEvaluator>(new VRPCostEvaluator(weights));

  // Single Solver State
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<AlgorithmType>('QPSO');
  const [activeOptimizer, setActiveOptimizer] = useState<any>(null);
  const [currentSolution, setCurrentSolution] = useState<VRPSolution | null>(null);
  const [comparisonSolution, setComparisonSolution] = useState<VRPSolution | null>(null);
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);
  const [currentIteration, setCurrentIteration] = useState<number>(0);
  const [optimizerHistory, setOptimizerHistory] = useState<any[]>([]);

  // Tournament Arena State
  const [tournamentRunner, setTournamentRunner] = useState<TournamentRunner>(() => {
    return new TournamentRunner(graph, vehicles, pathEngineRef.current, evaluatorRef.current);
  });
  const [isTournamentPlaying, setIsTournamentPlaying] = useState<boolean>(false);
  const [tournamentIteration, setTournamentIteration] = useState<number>(0);
  const [tournamentContenders, setTournamentContenders] = useState(tournamentRunner.getContenders());

  // Update engines when city changes
  const handleCityChange = (cityId: string) => {
    setSelectedCityId(cityId);
    const generator = PRESET_MAPS[cityId] || PRESET_MAPS['mumbai_real'];
    const newGraph = generator();
    setGraph(newGraph);
    setIncidents([]);

    trafficEngineRef.current.setGraph(newGraph);
    pathEngineRef.current.setGraph(newGraph);

    // Re-init solvers
    initSingleSolver(selectedAlgorithm, newGraph, weights);
    const newRunner = new TournamentRunner(newGraph, vehicles, pathEngineRef.current, evaluatorRef.current);
    setTournamentRunner(newRunner);
    setTournamentContenders(newRunner.getContenders());
    setTournamentIteration(0);
    setIsTournamentPlaying(false);
  };

  // Initialize single solver
  const initSingleSolver = (alg: AlgorithmType, currentG: CityGraph = graph, currentW: MultiObjectiveWeights = weights) => {
    evaluatorRef.current.setWeights(currentW);
    let opt: any;
    if (alg === 'QPSO') {
      opt = new QPSOOptimizer(currentG, vehicles, pathEngineRef.current, evaluatorRef.current);
    } else if (alg === 'CLASSICAL_PSO') {
      opt = new ClassicalPSOOptimizer(currentG, vehicles, pathEngineRef.current, evaluatorRef.current);
    } else if (alg === 'QGA') {
      opt = new QGAOptimizer(currentG, vehicles, pathEngineRef.current, evaluatorRef.current);
    } else if (alg === 'CLASSICAL_GA') {
      opt = new ClassicalGAOptimizer(currentG, vehicles, pathEngineRef.current, evaluatorRef.current);
    } else if (alg === 'SIMULATED_ANNEALING') {
      opt = new SimulatedAnnealingOptimizer(currentG, vehicles, pathEngineRef.current, evaluatorRef.current);
    } else {
      opt = new ClarkeWrightSavingsOptimizer(currentG, vehicles, pathEngineRef.current, evaluatorRef.current);
    }

    setActiveOptimizer(opt);
    const state: OptimizationStepState = opt.getState();
    setCurrentSolution(state.bestSolution);
    setCurrentIteration(state.currentIteration);
    setOptimizerHistory(state.history);

    // Pre-calculate baseline classical PSO solution for comparison overlays
    const baselinePso = new ClassicalPSOOptimizer(currentG, vehicles, pathEngineRef.current, evaluatorRef.current);
    const baseSol = baselinePso.runAll();
    setComparisonSolution(baseSol);
  };

  // Initial mount setup
  useEffect(() => {
    initSingleSolver('QPSO');
  }, []);

  // Traffic Simulation Loop (runs in background)
  useEffect(() => {
    const interval = setInterval(() => {
      const { timeMin } = trafficEngineRef.current.step(1.5, 1.2);
      setSimulationTimeMin(timeMin);
      pathEngineRef.current.invalidateCache();
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Tournament Player Loop
  useEffect(() => {
    let animTimer: any;
    if (isTournamentPlaying) {
      animTimer = setInterval(() => {
        const { contenders, allFinished } = tournamentRunner.stepAll();
        setTournamentContenders([...contenders]);
        setTournamentIteration(prev => prev + 1);

        if (allFinished) {
          setIsTournamentPlaying(false);
          sounds.playConvergenceChime();
        } else {
          if (Math.random() < 0.3) sounds.playQuantumPulse(480);
        }
      }, 70);
    }
    return () => clearInterval(animTimer);
  }, [isTournamentPlaying, tournamentRunner]);

  // Single Solver Controls
  const handleRunSingle = () => {
    if (!activeOptimizer) return;
    setIsOptimizing(true);
    sounds.playQuantumPulse(600);

    setTimeout(() => {
      const sol = activeOptimizer.runAll();
      const state = activeOptimizer.getState();
      setCurrentSolution(sol);
      setCurrentIteration(state.currentIteration);
      setOptimizerHistory(state.history);
      setIsOptimizing(false);
      sounds.playConvergenceChime();
    }, 50);
  };

  const handleStepSingle = () => {
    if (!activeOptimizer) return;
    const state = activeOptimizer.step();
    setCurrentSolution(state.bestSolution);
    setCurrentIteration(state.currentIteration);
    setOptimizerHistory([...state.history]);
    sounds.playQuantumPulse(450);
  };

  const handleResetSingle = () => {
    initSingleSolver(selectedAlgorithm);
  };

  const handleUpdateWeights = (newWeights: Partial<MultiObjectiveWeights>) => {
    const updated = { ...weights, ...newWeights };
    setWeights(updated);
    evaluatorRef.current.setWeights(updated);
    initSingleSolver(selectedAlgorithm, graph, updated);
  };

  // Incident Handlers
  const handleAddIncident = (edgeId: string, type: 'accident' | 'construction' | 'traffic_surge') => {
    const newInc: TrafficIncident = {
      id: `inc_${Date.now()}`,
      edgeId,
      type,
      severity: type === 'accident' ? 8.5 : 5.0,
      createdAt: Date.now(),
      durationSeconds: 120,
      description: type === 'accident' ? 'Road Blocked (Collision Incident)' : 'Heavy Traffic Congestion Surge',
    };
    trafficEngineRef.current.addIncident(newInc);
    setIncidents(trafficEngineRef.current.getIncidents());
    sounds.playIncidentAlert();

    // Invalidate path cache and trigger dynamic graph update
    pathEngineRef.current.invalidateCache();
    setGraph({ ...graph });

    // Trigger instant reactive quantum re-optimization to steer vehicles around the roadblock
    let opt: any;
    if (selectedAlgorithm === 'QPSO') {
      opt = new QPSOOptimizer(graph, vehicles, pathEngineRef.current, evaluatorRef.current);
    } else if (selectedAlgorithm === 'CLASSICAL_PSO') {
      opt = new ClassicalPSOOptimizer(graph, vehicles, pathEngineRef.current, evaluatorRef.current);
    } else if (selectedAlgorithm === 'QGA') {
      opt = new QGAOptimizer(graph, vehicles, pathEngineRef.current, evaluatorRef.current);
    } else if (selectedAlgorithm === 'CLASSICAL_GA') {
      opt = new ClassicalGAOptimizer(graph, vehicles, pathEngineRef.current, evaluatorRef.current);
    } else if (selectedAlgorithm === 'SIMULATED_ANNEALING') {
      opt = new SimulatedAnnealingOptimizer(graph, vehicles, pathEngineRef.current, evaluatorRef.current);
    } else {
      opt = new ClarkeWrightSavingsOptimizer(graph, vehicles, pathEngineRef.current, evaluatorRef.current);
    }

    const newSol = opt.runAll();
    const state = opt.getState();
    setActiveOptimizer(opt);
    setCurrentSolution(newSol);
    setCurrentIteration(state.currentIteration);
    setOptimizerHistory(state.history);

    // Update baseline comparison
    const baselinePso = new ClassicalPSOOptimizer(graph, vehicles, pathEngineRef.current, evaluatorRef.current);
    const baseSol = baselinePso.runAll();
    setComparisonSolution(baseSol);
  };

  const handleRemoveIncident = (id: string) => {
    trafficEngineRef.current.removeIncident(id);
    setIncidents(trafficEngineRef.current.getIncidents());
    pathEngineRef.current.invalidateCache();
    setGraph({ ...graph });

    // Re-optimize upon road reopening
    let opt: any;
    if (selectedAlgorithm === 'QPSO') {
      opt = new QPSOOptimizer(graph, vehicles, pathEngineRef.current, evaluatorRef.current);
    } else if (selectedAlgorithm === 'CLASSICAL_PSO') {
      opt = new ClassicalPSOOptimizer(graph, vehicles, pathEngineRef.current, evaluatorRef.current);
    } else if (selectedAlgorithm === 'QGA') {
      opt = new QGAOptimizer(graph, vehicles, pathEngineRef.current, evaluatorRef.current);
    } else if (selectedAlgorithm === 'CLASSICAL_GA') {
      opt = new ClassicalGAOptimizer(graph, vehicles, pathEngineRef.current, evaluatorRef.current);
    } else if (selectedAlgorithm === 'SIMULATED_ANNEALING') {
      opt = new SimulatedAnnealingOptimizer(graph, vehicles, pathEngineRef.current, evaluatorRef.current);
    } else {
      opt = new ClarkeWrightSavingsOptimizer(graph, vehicles, pathEngineRef.current, evaluatorRef.current);
    }

    const newSol = opt.runAll();
    const state = opt.getState();
    setActiveOptimizer(opt);
    setCurrentSolution(newSol);
    setCurrentIteration(state.currentIteration);
    setOptimizerHistory(state.history);
  };

  // Tournament controls
  const handleToggleTournamentPlay = () => {
    setIsTournamentPlaying(!isTournamentPlaying);
  };

  const handleTournamentStep = () => {
    const { contenders } = tournamentRunner.stepAll();
    setTournamentContenders([...contenders]);
    setTournamentIteration(prev => prev + 1);
    sounds.playQuantumPulse(450);
  };

  const handleTournamentRunAll = () => {
    const contenders = tournamentRunner.runAll();
    setTournamentContenders([...contenders]);
    setTournamentIteration(100);
    setIsTournamentPlaying(false);
    sounds.playConvergenceChime();
  };

  const handleTournamentReset = () => {
    tournamentRunner.reset();
    setTournamentContenders(tournamentRunner.getContenders());
    setTournamentIteration(0);
    setIsTournamentPlaying(false);
  };

  const handleResetAll = () => {
    handleCityChange(selectedCityId);
  };

  // Quantum Frame for Visualizer
  const quantumFrame = useMemo(() => {
    if (activeOptimizer && activeOptimizer.getQuantumFrame) {
      return activeOptimizer.getQuantumFrame();
    }
    return null;
  }, [activeOptimizer, currentIteration]);

  return (
    <div className="app-shell">
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        selectedCityId={selectedCityId}
        onCityChange={handleCityChange}
        mapViewMode={mapViewMode}
        onMapViewModeChange={setMapViewMode}
        isMuted={isMuted}
        onToggleMute={() => {
          sounds.setMuted(!isMuted);
          setIsMuted(!isMuted);
        }}
        onResetAll={handleResetAll}
      />

      <main className="dashboard-main">
        {/* TAB 1: DYNAMIC SIMULATOR (REAL GIS MAP OR SCHEMATIC) */}
        {activeTab === 'simulation' && (
          <div className="simulation-page">
            <div className="simulation-overview">
              <div className="simulation-overview-copy">
                <span className="simulation-eyebrow">LIVE OPERATIONS</span>
                <h2>Route simulation</h2>
                <p>Monitor city traffic and optimize fleet dispatch.</p>
              </div>
              <div className="simulation-overview-status">
                <span className={`live-status${isOptimizing ? ' live-status-optimizing' : ''}`}>
                  <span className="live-status-dot" aria-hidden="true" />
                  {isOptimizing ? 'Optimizing routes' : 'Traffic model live'}
                </span>
                <span className="overview-detail">
                  <span className="overview-detail-label">Simulation</span>
                  <strong>T+{Math.floor(simulationTimeMin)} min</strong>
                </span>
                <span className="overview-detail">
                  <span className="overview-detail-label">Optimizer</span>
                  <strong>{selectedAlgorithm}</strong>
                </span>
              </div>
            </div>

            <div className="simulation-layout">
              <div className="simulation-map-column">
                {mapViewMode === 'real_gis' ? (
                  <RealLeafletMap
                    graph={graph}
                    solution={currentSolution}
                    comparisonSolution={comparisonSolution}
                    comparisonName="Standard Classical PSO"
                    showComparison={true}
                    incidents={incidents}
                    onAddIncident={handleAddIncident}
                    simulationTimeMin={simulationTimeMin}
                  />
                ) : (
                  <CityMapCanvas
                    graph={graph}
                    solution={currentSolution}
                    comparisonSolution={comparisonSolution}
                    comparisonName="Standard Classical PSO"
                    showComparison={true}
                    incidents={incidents}
                    onAddIncident={handleAddIncident}
                    onRemoveIncident={handleRemoveIncident}
                    simulationTimeMin={simulationTimeMin}
                  />
                )}

                <ConvergenceChart
                  series={[
                    {
                      id: selectedAlgorithm,
                      name: `${selectedAlgorithm} (Active)`,
                      color: selectedAlgorithm === 'QPSO' ? '#0284c7' : '#ef4444',
                      history: optimizerHistory,
                    },
                  ]}
                  maxIterations={100}
                />
              </div>

              <aside className="control-sidebar" aria-label="Routing controls">
                <FleetControlPanel
                  vehicles={vehicles}
                  weights={weights}
                  onUpdateWeights={handleUpdateWeights}
                  selectedAlgorithm={selectedAlgorithm}
                  onSelectAlgorithm={alg => {
                    setSelectedAlgorithm(alg);
                    initSingleSolver(alg);
                  }}
                  onRunSingle={handleRunSingle}
                  onStepSingle={handleStepSingle}
                  onReset={handleResetSingle}
                  isOptimizing={isOptimizing}
                  currentIteration={currentIteration}
                  maxIterations={100}
                />
              </aside>
            </div>
          </div>
        )}

        {/* TAB 2: ALGORITHM TOURNAMENT RACE */}
        {activeTab === 'tournament' && (
          <div className="stacked-view">
            <TournamentArena
              contenders={tournamentContenders}
              isPlaying={isTournamentPlaying}
              onTogglePlay={handleToggleTournamentPlay}
              onStep={handleTournamentStep}
              onRunAll={handleTournamentRunAll}
              onReset={handleTournamentReset}
              currentIteration={tournamentIteration}
              maxIterations={100}
            />

            <ConvergenceChart
              series={tournamentContenders.map(c => ({
                id: c.id,
                name: c.name,
                color: c.color,
                history: c.state.history,
              }))}
              maxIterations={100}
            />
          </div>
        )}

        {/* TAB 3: INNOVATION STUDIO & QUBO BRIDGE */}
        {activeTab === 'innovations' && (
          <QuantumInnovationsLab
            graph={graph}
            solution={currentSolution}
          />
        )}

        {/* TAB 4: STATISTICAL BENCHMARK LAB */}
        {activeTab === 'benchmark' && (
          <BenchmarkLab
            graph={graph}
            vehicles={vehicles}
            pathEngine={pathEngineRef.current}
            evaluator={evaluatorRef.current}
          />
        )}

        {/* TAB 4: QUANTUM PHYSICS VISUALIZER */}
        {activeTab === 'quantum' && (
          <QuantumVisualizer
            quantumFrame={quantumFrame}
            alphaCoeff={quantumFrame?.alpha || 0.7}
          />
        )}

        {/* TAB 5: DELIVERABLES MATRIX (100% SPEC VERIFICATION) */}
        {activeTab === 'deliverables' && (
          <DeliverablesModal />
        )}

        {/* TAB 6: MATHEMATICAL FORMULATIONS & THEORY */}
        {activeTab === 'theory' && (
          <TheoryGuide />
        )}
      </main>
    </div>
  );
};

export default App;
