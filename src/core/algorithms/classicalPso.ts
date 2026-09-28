import { CityGraph, GraphNode } from '../../types/graph';
import { Vehicle, VRPSolution } from '../../types/vrp';
import { OptimizationHyperparameters, ConvergenceRecord, OptimizationStepState } from '../../types/optimizer';
import { ShortestPathEngine } from '../graph/shortestPath';
import { decodeContinuousToRoutes } from '../formulations/decoder';
import { VRPCostEvaluator } from '../formulations/vrpCostEvaluator';

export class ClassicalPSOOptimizer {
  private customerNodes: GraphNode[];
  private depotNodes: GraphNode[];
  private dimension: number;
  private params: OptimizationHyperparameters;

  private population: number[][] = [];
  private velocities: number[][] = [];
  private pbestPositions: number[][] = [];
  private pbestCosts: number[] = [];
  private gbestPosition: number[] = [];
  private gbestCost: number = Infinity;
  private gbestSolution: VRPSolution | null = null;

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
      inertiaWeight: 0.729,
      cognitiveParam: 1.494,
      socialParam: 1.494,
      alphaMax: 1.0,
      alphaMin: 0.45,
      quantumAttractorStochasticity: 0.5,
      useBlochSphereEncoding: false,
      qubitRotationStep: 0.05,
      hadamardMutationRate: 0.02,
      crossoverRate: 0.85,
      mutationRate: 0.15,
      use2OptLocalSearch: false,
      initialTemperature: 1000,
      coolingRate: 0.95,
      ...params,
    };

    this.initializePopulation();
  }

  public initializePopulation() {
    this.population = [];
    this.velocities = [];
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
      const pos: number[] = [];
      const vel: number[] = [];
      for (let d = 0; d < this.dimension; d++) {
        pos.push(Math.random());
        vel.push((Math.random() - 0.5) * 0.2);
      }
      this.population.push(pos);
      this.velocities.push(vel);
      this.pbestPositions.push([...pos]);

      const plan = decodeContinuousToRoutes(pos, this.customerNodes, this.depotNodes, this.vehicles, this.pathEngine);
      const sol = this.evaluator.evaluateRoutes(plan, this.customerNodes.length);
      this.pbestCosts.push(sol.totalCost);

      if (sol.totalCost < this.gbestCost) {
        this.gbestCost = sol.totalCost;
        this.gbestPosition = [...pos];
        this.gbestSolution = sol;
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

    // Standard PSO Velocity & Position updates
    const w = this.params.inertiaWeight;
    const c1 = this.params.cognitiveParam;
    const c2 = this.params.socialParam;

    for (let i = 0; i < this.params.populationSize; i++) {
      for (let d = 0; d < this.dimension; d++) {
        const r1 = Math.random();
        const r2 = Math.random();
        
        // Classical velocity vector
        let newVel = w * this.velocities[i][d] +
                     c1 * r1 * (this.pbestPositions[i][d] - this.population[i][d]) +
                     c2 * r2 * (this.gbestPosition[d] - this.population[i][d]);

        // Velocity clamping
        const maxV = 0.3;
        newVel = Math.max(-maxV, Math.min(maxV, newVel));
        this.velocities[i][d] = newVel;

        // Position update
        let newPos = this.population[i][d] + newVel;
        if (newPos < 0) { newPos = 0; this.velocities[i][d] *= -0.5; }
        if (newPos > 1) { newPos = 1; this.velocities[i][d] *= -0.5; }
        this.population[i][d] = newPos;
      }

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

    let diversity = 0;
    const center = new Array(this.dimension).fill(0);
    for (let d = 0; d < this.dimension; d++) {
      for (let i = 0; i < this.population.length; i++) center[d] += this.population[i][d];
      center[d] /= this.population.length;
    }
    for (let i = 0; i < this.population.length; i++) {
      let dSum = 0;
      for (let d = 0; d < this.dimension; d++) {
        dSum += (this.population[i][d] - center[d]) ** 2;
      }
      diversity += Math.sqrt(dSum);
    }
    diversity /= this.population.length;

    this.history.push({
      iteration: this.currentIteration,
      bestCost: Math.round(this.gbestCost * 100) / 100,
      meanCost: Math.round(mean * 100) / 100,
      worstCost: Math.round(worst * 100) / 100,
      diversityIndex: Math.round(diversity * 1000) / 1000,
      entropy: Math.round(Math.log(diversity + 1.01) * 100) / 100,
      timestampMs: timeElapsedMs,
    });
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
    };
  }
}
