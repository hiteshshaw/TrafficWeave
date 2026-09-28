import { CityGraph, GraphNode } from '../../types/graph';
import { Vehicle, VRPSolution } from '../../types/vrp';
import { OptimizationHyperparameters, ConvergenceRecord, OptimizationStepState } from '../../types/optimizer';
import { ShortestPathEngine } from '../graph/shortestPath';
import { decodeContinuousToRoutes } from '../formulations/decoder';
import { VRPCostEvaluator } from '../formulations/vrpCostEvaluator';

/**
 * Quantum-Inspired Genetic Algorithm (QGA)
 * Uses Qubit Chromosomes [alpha_i, beta_i] = [cos(theta_i), sin(theta_i)]
 * and Quantum Rotation Gates R(Delta theta) to guide superposition collapse towards optimum.
 */
export class QGAOptimizer {
  private customerNodes: GraphNode[];
  private depotNodes: GraphNode[];
  private dimension: number;
  private params: OptimizationHyperparameters;

  private qubitAngles: number[][] = []; // [popSize][dimension] in radians [0, PI/2]
  private binaryChromosomes: number[][] = [];
  private continuousPositions: number[][] = [];
  private populationCosts: number[] = [];

  private bestAngles: number[] = [];
  private bestCost: number = Infinity;
  private bestSolution: VRPSolution | null = null;

  private currentIteration: number = 0;
  private history: ConvergenceRecord[] = [];
  private isFinished: boolean = false;

  constructor(
    graph: CityGraph,
    private vehicles: Vehicle[],
    private pathEngine: ShortestPathEngine,
    private evaluator: VRPCostEvaluator,
    params?: Partial<OptimizationHyperparameters>
  ) {
    this.customerNodes = graph.nodes.filter(n => n.type !== 'depot');
    this.depotNodes = graph.nodes.filter(n => n.type === 'depot');
    this.dimension = this.customerNodes.length;

    this.params = {
      populationSize: 40,
      maxIterations: 100,
      qubitRotationStep: 0.04 * Math.PI,
      hadamardMutationRate: 0.03,
      alphaMax: 1.0,
      alphaMin: 0.45,
      quantumAttractorStochasticity: 0.5,
      useBlochSphereEncoding: true,
      inertiaWeight: 0.7,
      cognitiveParam: 1.5,
      socialParam: 1.5,
      crossoverRate: 0.85,
      mutationRate: 0.15,
      use2OptLocalSearch: true,
      initialTemperature: 1000,
      coolingRate: 0.95,
      ...params,
    };

    this.initializePopulation();
  }

  public initializePopulation() {
    this.qubitAngles = [];
    this.binaryChromosomes = [];
    this.continuousPositions = [];
    this.populationCosts = [];
    this.bestCost = Infinity;
    this.bestSolution = null;
    this.bestAngles = [];
    this.currentIteration = 0;
    this.history = [];
    this.isFinished = false;

    const startTime = performance.now();

    // Initialize all qubits to equal superposition (|0> + |1>)/sqrt(2), i.e., theta = PI/4
    for (let i = 0; i < this.params.populationSize; i++) {
      const angles: number[] = [];
      for (let d = 0; d < this.dimension; d++) {
        angles.push(Math.PI / 4 + (Math.random() - 0.5) * 0.2);
      }
      this.qubitAngles.push(angles);
    }

    this.collapseAndEvaluate(startTime);
  }

  private collapseAndEvaluate(startTime: number) {
    this.populationCosts = [];
    this.continuousPositions = [];

    for (let i = 0; i < this.params.populationSize; i++) {
      const pos: number[] = [];
      for (let d = 0; d < this.dimension; d++) {
        // Probability of measuring state |1> is sin^2(theta)
        const theta = this.qubitAngles[i][d];
        const prob1 = Math.sin(theta) ** 2;
        // Quantum probability amplitude mapping to continuous priority space
        const measured = Math.random() < prob1 ? 0.5 + 0.5 * prob1 : 0.5 * (1 - prob1);
        pos.push(measured);
      }
      this.continuousPositions.push(pos);

      const plan = decodeContinuousToRoutes(pos, this.customerNodes, this.depotNodes, this.vehicles, this.pathEngine);
      const sol = this.evaluator.evaluateRoutes(plan, this.customerNodes.length);
      this.populationCosts.push(sol.totalCost);

      if (sol.totalCost < this.bestCost) {
        this.bestCost = sol.totalCost;
        this.bestAngles = [...this.qubitAngles[i]];
        this.bestSolution = sol;
      }
    }

    this.recordHistory(performance.now() - startTime);
  }

  public step(): OptimizationStepState {
    if (this.isFinished || this.currentIteration >= this.params.maxIterations) {
      this.isFinished = true;
      return this.getState();
    }

    const startTime = performance.now();
    this.currentIteration++;

    const deltaTheta = this.params.qubitRotationStep * (1 - this.currentIteration / this.params.maxIterations * 0.7);

    // Quantum Rotation Gate R(Delta theta) application
    for (let i = 0; i < this.params.populationSize; i++) {
      for (let d = 0; d < this.dimension; d++) {
        const currentAngle = this.qubitAngles[i][d];
        const targetAngle = this.bestAngles[d] || (Math.PI / 4);

        // Direction of rotation sign s(theta)
        let direction = 0;
        if (currentAngle < targetAngle) direction = 1;
        else if (currentAngle > targetAngle) direction = -1;

        // Apply Quantum Gate: theta' = theta + s(theta) * Delta theta
        let newAngle = currentAngle + direction * deltaTheta * (0.8 + 0.4 * Math.random());

        // Quantum Hadamard / Mutation pulse
        if (Math.random() < this.params.hadamardMutationRate) {
          newAngle = Math.PI / 2 - newAngle; // Phase flip
        }

        // Clamp angle to [0.01, PI/2 - 0.01] to avoid irreversible collapse
        newAngle = Math.max(0.02, Math.min(Math.PI / 2 - 0.02, newAngle));
        this.qubitAngles[i][d] = newAngle;
      }
    }

    this.collapseAndEvaluate(startTime);

    if (this.currentIteration >= this.params.maxIterations) {
      this.isFinished = true;
    }

    return this.getState();
  }

  public runAll(): VRPSolution {
    const start = performance.now();
    while (!this.isFinished) {
      this.step();
    }
    if (this.bestSolution) {
      this.bestSolution.computationTimeMs = performance.now() - start;
    }
    return this.bestSolution!;
  }

  private recordHistory(timeElapsedMs: number) {
    const costs = this.populationCosts;
    const mean = costs.reduce((a, b) => a + b, 0) / (costs.length || 1);
    const worst = Math.max(...costs);

    // Compute Quantum superposition entropy
    let entropy = 0;
    for (let i = 0; i < this.qubitAngles.length; i++) {
      for (let d = 0; d < this.dimension; d++) {
        const p1 = Math.sin(this.qubitAngles[i][d]) ** 2;
        const p0 = Math.cos(this.qubitAngles[i][d]) ** 2;
        if (p1 > 1e-6) entropy -= p1 * Math.log2(p1);
        if (p0 > 1e-6) entropy -= p0 * Math.log2(p0);
      }
    }
    entropy /= (this.qubitAngles.length * this.dimension);

    this.history.push({
      iteration: this.currentIteration,
      bestCost: Math.round(this.bestCost * 100) / 100,
      meanCost: Math.round(mean * 100) / 100,
      worstCost: Math.round(worst * 100) / 100,
      diversityIndex: Math.round(entropy * 1000) / 1000,
      entropy: Math.round(entropy * 100) / 100,
      timestampMs: timeElapsedMs,
    });
  }

  public getState(): OptimizationStepState {
    return {
      currentIteration: this.currentIteration,
      maxIterations: this.params.maxIterations,
      bestSolution: this.bestSolution,
      bestCost: this.bestCost,
      history: [...this.history],
      isFinished: this.isFinished,
      particlePositions: this.continuousPositions,
    };
  }
}
