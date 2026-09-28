import { CityGraph, GraphNode } from '../../types/graph';
import { Vehicle, VRPSolution } from '../../types/vrp';
import { OptimizationHyperparameters, ConvergenceRecord, OptimizationStepState } from '../../types/optimizer';
import { QuantumSimulationFrame, BlochCoordinate } from '../../types/quantum';
import { ShortestPathEngine } from '../graph/shortestPath';
import { decodeContinuousToRoutes } from '../formulations/decoder';
import { VRPCostEvaluator } from '../formulations/vrpCostEvaluator';

export class QPSOOptimizer {
  private graph: CityGraph;
  private vehicles: Vehicle[];
  private pathEngine: ShortestPathEngine;
  private evaluator: VRPCostEvaluator;
  private customerNodes: GraphNode[];
  private depotNodes: GraphNode[];
  private dimension: number;

  private params: OptimizationHyperparameters;
  private population: number[][] = []; // [popSize][dimension] in range [0, 1]
  private pbestPositions: number[][] = [];
  private pbestCosts: number[] = [];
  private gbestPosition: number[] = [];
  private gbestCost: number = Infinity;
  private gbestSolution: VRPSolution | null = null;
  private mbest: number[] = [];

  private currentIteration: number = 0;
  private history: ConvergenceRecord[] = [];
  private isFinished: boolean = false;

  constructor(
    graph: CityGraph,
    vehicles: Vehicle[],
    pathEngine: ShortestPathEngine,
    evaluator: VRPCostEvaluator,
    params?: Partial<OptimizationHyperparameters>
  ) {
    this.graph = graph;
    this.vehicles = vehicles;
    this.pathEngine = pathEngine;
    this.evaluator = evaluator;
    this.customerNodes = graph.nodes.filter(n => n.type !== 'depot');
    this.depotNodes = graph.nodes.filter(n => n.type === 'depot');
    this.dimension = this.customerNodes.length;

    this.params = {
      populationSize: 40,
      maxIterations: 100,
      alphaMax: 1.0,
      alphaMin: 0.45,
      quantumAttractorStochasticity: 0.5,
      useBlochSphereEncoding: true,
      inertiaWeight: 0.7,
      cognitiveParam: 1.5,
      socialParam: 1.5,
      qubitRotationStep: 0.05 * Math.PI,
      hadamardMutationRate: 0.02,
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
    this.population = [];
    this.pbestPositions = [];
    this.pbestCosts = [];
    this.gbestCost = Infinity;
    this.gbestSolution = null;
    this.gbestPosition = [];
    this.currentIteration = 0;
    this.history = [];
    this.isFinished = false;

    const startTime = performance.now();

    for (let i = 0; i < this.params.populationSize; i++) {
      const particle: number[] = [];
      for (let d = 0; d < this.dimension; d++) {
        particle.push(Math.random());
      }
      this.population.push(particle);
      this.pbestPositions.push([...particle]);

      const plan = decodeContinuousToRoutes(particle, this.customerNodes, this.depotNodes, this.vehicles, this.pathEngine);
      const sol = this.evaluator.evaluateRoutes(plan, this.customerNodes.length);
      this.pbestCosts.push(sol.totalCost);

      if (sol.totalCost < this.gbestCost) {
        this.gbestCost = sol.totalCost;
        this.gbestPosition = [...particle];
        this.gbestSolution = sol;
      }
    }

    this.updateMbest();
    this.recordHistory(performance.now() - startTime);
  }

  /**
   * Calculates Mean Best Position (mbest) across all personal bests
   * mbest_d = (1 / M) * sum_{i=1}^M pbest_{i, d}
   */
  private updateMbest() {
    const M = this.params.populationSize;
    this.mbest = new Array(this.dimension).fill(0);
    for (let d = 0; d < this.dimension; d++) {
      let sum = 0;
      for (let i = 0; i < M; i++) {
        sum += this.pbestPositions[i][d];
      }
      this.mbest[d] = sum / M;
    }
  }

  /**
   * Advances the QPSO algorithm by 1 iteration
   */
  public step(): OptimizationStepState {
    if (this.isFinished || this.currentIteration >= this.params.maxIterations) {
      this.isFinished = true;
      return this.getState();
    }

    const startTime = performance.now();
    this.currentIteration++;

    // Dynamic Contraction-Expansion coefficient alpha(t)
    // Non-linear cosine cooling schedule gives superior exploration in early phase and high precision exploitation at convergence
    const progress = this.currentIteration / this.params.maxIterations;
    const alpha = this.params.alphaMin + 0.5 * (this.params.alphaMax - this.params.alphaMin) * (1 + Math.cos(Math.PI * progress));

    const M = this.params.populationSize;

    for (let i = 0; i < M; i++) {
      for (let d = 0; d < this.dimension; d++) {
        // Stochastic local attractor p_{i,d}
        const phi = Math.random();
        const p = phi * this.pbestPositions[i][d] + (1 - phi) * this.gbestPosition[d];

        // Quantum wave-function Delta Potential Well state
        // L = 2 * alpha * |mbest_d - x_{i,d}|
        const u = Math.max(1e-7, Math.random());
        const sign = Math.random() < 0.5 ? 1 : -1;
        const deltaOffset = alpha * Math.abs(this.mbest[d] - this.population[i][d]) * Math.log(1 / u);

        let newPos = p + sign * deltaOffset;

        // Boundary constraint with periodic quantum reflection
        if (newPos < 0) newPos = Math.abs(newPos) % 1;
        if (newPos > 1) newPos = 1 - (newPos % 1);

        this.population[i][d] = Math.min(1, Math.max(0, newPos));
      }

      // Evaluate new position
      const plan = decodeContinuousToRoutes(this.population[i], this.customerNodes, this.depotNodes, this.vehicles, this.pathEngine);
      const sol = this.evaluator.evaluateRoutes(plan, this.customerNodes.length, performance.now() - startTime);

      if (sol.totalCost < this.pbestCosts[i]) {
        this.pbestCosts[i] = sol.totalCost;
        this.pbestPositions[i] = [...this.population[i]];

        if (sol.totalCost < this.gbestCost) {
          this.gbestCost = sol.totalCost;
          this.gbestPosition = [...this.population[i]];
          this.gbestSolution = sol;
        }
      }
    }

    this.updateMbest();
    this.recordHistory(performance.now() - startTime);

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
    if (this.gbestSolution) {
      this.gbestSolution.computationTimeMs = performance.now() - start;
    }
    return this.gbestSolution!;
  }

  private recordHistory(timeElapsedMs: number) {
    const costs = this.pbestCosts;
    const mean = costs.reduce((a, b) => a + b, 0) / costs.length;
    const worst = Math.max(...costs);

    // Compute swarm diversity index
    let diversity = 0;
    for (let i = 0; i < this.population.length; i++) {
      let dist = 0;
      for (let d = 0; d < this.dimension; d++) {
        const diff = this.population[i][d] - this.mbest[d];
        dist += diff * diff;
      }
      diversity += Math.sqrt(dist);
    }
    diversity /= this.population.length;

    this.history.push({
      iteration: this.currentIteration,
      bestCost: Math.round(this.gbestCost * 100) / 100,
      meanCost: Math.round(mean * 100) / 100,
      worstCost: Math.round(worst * 100) / 100,
      diversityIndex: Math.round(diversity * 1000) / 1000,
      quantumPotentialEnergy: Math.round((1 - this.currentIteration / this.params.maxIterations) * 100) / 100,
      entropy: Math.round(Math.log(diversity + 1.01) * 100) / 100,
      timestampMs: timeElapsedMs,
    });
  }

  public getQuantumFrame(): QuantumSimulationFrame {
    const alpha = this.params.alphaMin + 0.5 * (this.params.alphaMax - this.params.alphaMin) * (1 + Math.cos(Math.PI * (this.currentIteration / this.params.maxIterations)));

    const particles = this.population.slice(0, 15).map((pos, idx) => {
      const blochStates: BlochCoordinate[] = pos.slice(0, 5).map(val => {
        const theta = val * Math.PI; // Polar angle
        const phi = (val * 2 * Math.PI) % (2 * Math.PI); // Azimuthal
        return {
          theta,
          phi,
          x: Math.sin(theta) * Math.cos(phi),
          y: Math.sin(theta) * Math.sin(phi),
          z: Math.cos(theta),
          probability0: Math.cos(theta / 2) ** 2,
          probability1: Math.sin(theta / 2) ** 2,
        };
      });

      const deltaLength = 2 * alpha * Math.abs((this.mbest[0] || 0.5) - (pos[0] || 0.5));

      return {
        id: idx,
        currentPos: pos,
        pbestPos: this.pbestPositions[idx] || pos,
        attractorPos: this.gbestPosition,
        deltaLength,
        blochStates,
      };
    });

    return {
      iteration: this.currentIteration,
      particles,
      mbest: this.mbest,
      alpha,
      quantumEntropy: this.history[this.history.length - 1]?.entropy || 0.5,
    };
  }

  public getState(): OptimizationStepState {
    return {
      currentIteration: this.currentIteration,
      maxIterations: this.params.maxIterations,
      bestSolution: this.gbestSolution,
      bestCost: this.gbestCost,
      history: [...this.history],
      isFinished: this.isFinished,
      particlePositions: this.population,
      mbest: this.mbest,
    };
  }
}
