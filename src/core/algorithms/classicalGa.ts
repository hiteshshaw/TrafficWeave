import { CityGraph, GraphNode } from '../../types/graph';
import { Vehicle, VRPSolution } from '../../types/vrp';
import { OptimizationHyperparameters, ConvergenceRecord, OptimizationStepState } from '../../types/optimizer';
import { ShortestPathEngine } from '../graph/shortestPath';
import { decodeContinuousToRoutes } from '../formulations/decoder';
import { VRPCostEvaluator } from '../formulations/vrpCostEvaluator';

export class ClassicalGAOptimizer {
  private customerNodes: GraphNode[];
  private depotNodes: GraphNode[];
  private dimension: number;
  private params: OptimizationHyperparameters;

  private population: number[][] = [];
  private fitnessValues: number[] = [];
  private costs: number[] = [];
  private bestIndividual: number[] = [];
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
      crossoverRate: 0.85,
      mutationRate: 0.18,
      use2OptLocalSearch: true,
      alphaMax: 1.0,
      alphaMin: 0.45,
      quantumAttractorStochasticity: 0.5,
      useBlochSphereEncoding: false,
      inertiaWeight: 0.7,
      cognitiveParam: 1.5,
      socialParam: 1.5,
      qubitRotationStep: 0.05,
      hadamardMutationRate: 0.02,
      initialTemperature: 1000,
      coolingRate: 0.95,
      ...params,
    };

    this.initializePopulation();
  }

  public initializePopulation() {
    this.population = [];
    this.fitnessValues = [];
    this.costs = [];
    this.bestCost = Infinity;
    this.bestSolution = null;
    this.bestIndividual = [];
    this.currentIteration = 0;
    this.history = [];
    this.isFinished = false;

    const startTime = performance.now();

    for (let i = 0; i < this.params.populationSize; i++) {
      const ind: number[] = [];
      for (let d = 0; d < this.dimension; d++) {
        ind.push(Math.random());
      }
      this.population.push(ind);
    }

    this.evaluatePopulation(startTime);
  }

  private evaluatePopulation(startTime: number) {
    this.costs = [];
    this.fitnessValues = [];

    for (let i = 0; i < this.population.length; i++) {
      const plan = decodeContinuousToRoutes(this.population[i], this.customerNodes, this.depotNodes, this.vehicles, this.pathEngine);
      const sol = this.evaluator.evaluateRoutes(plan, this.customerNodes.length);
      this.costs.push(sol.totalCost);
      this.fitnessValues.push(1 / (sol.totalCost + 1));

      if (sol.totalCost < this.bestCost) {
        this.bestCost = sol.totalCost;
        this.bestIndividual = [...this.population[i]];
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

    const newPop: number[][] = [];
    // Elitism: keep best
    newPop.push([...this.bestIndividual]);

    // Tournament selection & crossover
    while (newPop.length < this.params.populationSize) {
      const p1 = this.tournamentSelect();
      const p2 = this.tournamentSelect();

      let c1 = [...p1];
      let c2 = [...p2];

      if (Math.random() < this.params.crossoverRate) {
        // Uniform / Arithmetic crossover
        const alpha = Math.random();
        for (let d = 0; d < this.dimension; d++) {
          c1[d] = alpha * p1[d] + (1 - alpha) * p2[d];
          c2[d] = (1 - alpha) * p1[d] + alpha * p2[d];
        }
      }

      // Mutation
      this.mutate(c1);
      this.mutate(c2);

      newPop.push(c1);
      if (newPop.length < this.params.populationSize) {
        newPop.push(c2);
      }
    }

    this.population = newPop;
    this.evaluatePopulation(startTime);

    if (this.currentIteration >= this.params.maxIterations) {
      this.isFinished = true;
    }

    return this.getState();
  }

  private tournamentSelect(k: number = 3): number[] {
    let bestIdx = Math.floor(Math.random() * this.population.length);
    for (let i = 1; i < k; i++) {
      const idx = Math.floor(Math.random() * this.population.length);
      if (this.costs[idx] < this.costs[bestIdx]) {
        bestIdx = idx;
      }
    }
    return this.population[bestIdx];
  }

  private mutate(ind: number[]) {
    for (let d = 0; d < this.dimension; d++) {
      if (Math.random() < this.params.mutationRate) {
        ind[d] = Math.random();
      }
    }
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
    const costs = this.costs;
    const mean = costs.reduce((a, b) => a + b, 0) / (costs.length || 1);
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
      bestCost: Math.round(this.bestCost * 100) / 100,
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
      bestSolution: this.bestSolution,
      bestCost: this.bestCost,
      history: [...this.history],
      isFinished: this.isFinished,
      particlePositions: this.population,
    };
  }
}
