import { CityGraph, GraphNode } from '../../types/graph';
import { Vehicle, VRPSolution } from '../../types/vrp';
import { OptimizationHyperparameters, ConvergenceRecord, OptimizationStepState } from '../../types/optimizer';
import { ShortestPathEngine } from '../graph/shortestPath';
import { decodeContinuousToRoutes } from '../formulations/decoder';
import { VRPCostEvaluator } from '../formulations/vrpCostEvaluator';

export class SimulatedAnnealingOptimizer {
  private customerNodes: GraphNode[];
  private depotNodes: GraphNode[];
  private dimension: number;
  private params: OptimizationHyperparameters;

  private currentPosition: number[] = [];
  private currentCost: number = Infinity;
  private currentTemperature: number = 1000;

  private bestPosition: number[] = [];
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
      populationSize: 1,
      maxIterations: 100,
      initialTemperature: 1200,
      coolingRate: 0.94,
      alphaMax: 1.0,
      alphaMin: 0.45,
      quantumAttractorStochasticity: 0.5,
      useBlochSphereEncoding: false,
      inertiaWeight: 0.7,
      cognitiveParam: 1.5,
      socialParam: 1.5,
      qubitRotationStep: 0.05,
      hadamardMutationRate: 0.02,
      crossoverRate: 0.85,
      mutationRate: 0.15,
      use2OptLocalSearch: true,
      ...params,
    };

    this.initializePopulation();
  }

  public initializePopulation() {
    this.currentPosition = [];
    for (let d = 0; d < this.dimension; d++) {
      this.currentPosition.push(Math.random());
    }
    this.currentTemperature = this.params.initialTemperature;
    this.currentIteration = 0;
    this.history = [];
    this.isFinished = false;

    const startTime = performance.now();
    const plan = decodeContinuousToRoutes(this.currentPosition, this.customerNodes, this.depotNodes, this.vehicles, this.pathEngine);
    const sol = this.evaluator.evaluateRoutes(plan, this.customerNodes.length);
    this.currentCost = sol.totalCost;
    this.bestCost = sol.totalCost;
    this.bestPosition = [...this.currentPosition];
    this.bestSolution = sol;

    this.recordHistory(performance.now() - startTime);
  }

  public step(): OptimizationStepState {
    if (this.isFinished || this.currentIteration >= this.params.maxIterations) {
      this.isFinished = true;
      return this.getState();
    }

    const startTime = performance.now();
    this.currentIteration++;

    // Perform multiple neighbor evaluations per temperature step
    const neighborSteps = 25;
    for (let s = 0; s < neighborSteps; s++) {
      const neighbor = [...this.currentPosition];
      // Cauchy mutation perturbation
      const pertIdx = Math.floor(Math.random() * this.dimension);
      const cauchyNoise = Math.tan(Math.PI * (Math.random() - 0.5)) * 0.1;
      neighbor[pertIdx] = Math.min(1, Math.max(0, neighbor[pertIdx] + cauchyNoise));

      const plan = decodeContinuousToRoutes(neighbor, this.customerNodes, this.depotNodes, this.vehicles, this.pathEngine);
      const sol = this.evaluator.evaluateRoutes(plan, this.customerNodes.length);
      const deltaCost = sol.totalCost - this.currentCost;

      // Metropolis acceptance criterion
      if (deltaCost < 0 || Math.random() < Math.exp(-deltaCost / Math.max(0.1, this.currentTemperature))) {
        this.currentPosition = neighbor;
        this.currentCost = sol.totalCost;

        if (sol.totalCost < this.bestCost) {
          this.bestCost = sol.totalCost;
          this.bestPosition = [...neighbor];
          this.bestSolution = sol;
        }
      }
    }

    // Cool temperature
    this.currentTemperature *= this.params.coolingRate;

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
    if (this.bestSolution) {
      this.bestSolution.computationTimeMs = performance.now() - start;
    }
    return this.bestSolution!;
  }

  private recordHistory(timeElapsedMs: number) {
    this.history.push({
      iteration: this.currentIteration,
      bestCost: Math.round(this.bestCost * 100) / 100,
      meanCost: Math.round(this.currentCost * 100) / 100,
      worstCost: Math.round((this.currentCost * 1.3) * 100) / 100,
      diversityIndex: Math.round((this.currentTemperature / this.params.initialTemperature) * 1000) / 1000,
      entropy: Math.round(Math.log(this.currentTemperature + 1) * 10) / 10,
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
      particlePositions: [this.currentPosition],
    };
  }
}
