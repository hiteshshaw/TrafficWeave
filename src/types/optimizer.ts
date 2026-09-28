import { VRPSolution, MultiObjectiveWeights } from './vrp';
import { CityGraph } from './graph';

export type AlgorithmType =
  | 'QPSO'               // Quantum-Behaved Particle Swarm Optimization
  | 'CLASSICAL_PSO'      // Standard PSO (Inertia + Cognitive + Social)
  | 'QGA'                // Quantum-Inspired Genetic Algorithm (Qubits + Rotation Gates)
  | 'CLASSICAL_GA'       // Standard GA (Order Crossover + Swap Mutation)
  | 'SIMULATED_ANNEALING'// Simulated Annealing with Cauchy cooling
  | 'CLARKE_WRIGHT'      // Classical Clarke-Wright Savings Heuristic
  | 'EXACT_BNB';         // Exact Branch-and-Bound (optimal, small instances only)

export interface OptimizationHyperparameters {
  // Common
  populationSize: number;
  maxIterations: number;
  
  // QPSO specific
  alphaMax: number; // Initial contraction-expansion coefficient (e.g., 1.0)
  alphaMin: number; // Final alpha (e.g., 0.5)
  quantumAttractorStochasticity: number; // phi weight
  useBlochSphereEncoding: boolean;

  // Classical PSO
  inertiaWeight: number; // w
  cognitiveParam: number; // c1
  socialParam: number;    // c2
  
  // QGA
  qubitRotationStep: number; // Delta theta (e.g. 0.05 * PI)
  hadamardMutationRate: number;
  
  // Classical GA
  crossoverRate: number;
  mutationRate: number;
  use2OptLocalSearch: boolean;

  // SA
  initialTemperature: number;
  coolingRate: number;
}

export interface ConvergenceRecord {
  iteration: number;
  bestCost: number;
  meanCost: number;
  worstCost: number;
  diversityIndex: number;
  quantumPotentialEnergy?: number;
  entropy?: number;
  timestampMs: number;
}

export interface OptimizationStepState {
  currentIteration: number;
  maxIterations: number;
  bestSolution: VRPSolution | null;
  bestCost: number;
  history: ConvergenceRecord[];
  isFinished: boolean;
  particlePositions?: number[][];
  mbest?: number[];
  quantumProbabilities?: number[];
}

export interface BenchmarkRun {
  runId: number;
  algorithm: AlgorithmType;
  finalCost: number;
  bestDistanceKm: number;
  bestTimeMin: number;
  executionTimeMs: number;
  iterationsToConverge: number;
  feasibilityRate: number;
  solution: VRPSolution;
}

export interface BenchmarkAggregate {
  algorithm: AlgorithmType;
  runsCount: number;
  meanCost: number;
  stdDevCost: number;
  minCost: number;
  maxCost: number;
  meanExecTimeMs: number;
  meanIterationsToConverge: number;
  pValueVsQPSO?: number;
  improvementOverClassicalPsoPercent?: number;
  /** Optimality gap: (meanCost - optimalCost) / optimalCost * 100 */
  optimalityGapPercent?: number;
}

/** Single data point in scalability analysis */
export interface ScalabilityPoint {
  customerCount: number;
  algorithm: AlgorithmType;
  meanCostNormalised: number; // cost / customerCount for fair comparison
  meanExecTimeMs: number;
  stdDevCost: number;
}
