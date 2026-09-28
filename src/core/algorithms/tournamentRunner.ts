import { CityGraph } from '../../types/graph';
import { Vehicle } from '../../types/vrp';
import { AlgorithmType, OptimizationHyperparameters, OptimizationStepState } from '../../types/optimizer';
import { ShortestPathEngine } from '../graph/shortestPath';
import { VRPCostEvaluator } from '../formulations/vrpCostEvaluator';
import { QPSOOptimizer } from './qpso';
import { ClassicalPSOOptimizer } from './classicalPso';
import { QGAOptimizer } from './qga';
import { ClassicalGAOptimizer } from './classicalGa';
import { SimulatedAnnealingOptimizer } from './simulatedAnnealing';
import { ClarkeWrightSavingsOptimizer } from './clarkeWright';

export interface TournamentContender {
  id: string;
  name: string;
  algorithm: AlgorithmType;
  color: string;
  isQuantum: boolean;
  optimizer: any;
  state: OptimizationStepState;
}

export class TournamentRunner {
  private contenders: TournamentContender[] = [];
  private isRunning: boolean = false;
  private isCompleted: boolean = false;

  constructor(
    private graph: CityGraph,
    private vehicles: Vehicle[],
    private pathEngine: ShortestPathEngine,
    private evaluator: VRPCostEvaluator,
    selectedAlgorithms: AlgorithmType[] = ['QPSO', 'CLASSICAL_PSO', 'QGA', 'CLASSICAL_GA'],
    params?: Partial<OptimizationHyperparameters>
  ) {
    this.initContenders(selectedAlgorithms, params);
  }

  public initContenders(
    algorithms: AlgorithmType[],
    params?: Partial<OptimizationHyperparameters>
  ) {
    this.contenders = [];
    this.isRunning = false;
    this.isCompleted = false;

    const colorMap: Record<AlgorithmType, { name: string; color: string; isQuantum: boolean }> = {
      QPSO: { name: 'QPSO (Quantum Swarm)', color: '#0284c7', isQuantum: true },
      CLASSICAL_PSO: { name: 'Standard PSO', color: '#e11d48', isQuantum: false },
      QGA: { name: 'QGA (Quantum Genetic)', color: '#0d9488', isQuantum: true },
      CLASSICAL_GA: { name: 'Standard GA', color: '#d97706', isQuantum: false },
      SIMULATED_ANNEALING: { name: 'Simulated Annealing', color: '#ea580c', isQuantum: false },
      CLARKE_WRIGHT: { name: 'Clarke-Wright Savings', color: '#059669', isQuantum: false },
      EXACT_BNB: { name: 'Exact Branch-and-Bound', color: '#64748b', isQuantum: false },
    };

    for (const alg of algorithms) {
      let optimizer: any;
      if (alg === 'QPSO') {
        optimizer = new QPSOOptimizer(this.graph, this.vehicles, this.pathEngine, this.evaluator, params);
      } else if (alg === 'CLASSICAL_PSO') {
        optimizer = new ClassicalPSOOptimizer(this.graph, this.vehicles, this.pathEngine, this.evaluator, params);
      } else if (alg === 'QGA') {
        optimizer = new QGAOptimizer(this.graph, this.vehicles, this.pathEngine, this.evaluator, params);
      } else if (alg === 'CLASSICAL_GA') {
        optimizer = new ClassicalGAOptimizer(this.graph, this.vehicles, this.pathEngine, this.evaluator, params);
      } else if (alg === 'SIMULATED_ANNEALING') {
        optimizer = new SimulatedAnnealingOptimizer(this.graph, this.vehicles, this.pathEngine, this.evaluator, params);
      } else if (alg === 'CLARKE_WRIGHT') {
        optimizer = new ClarkeWrightSavingsOptimizer(this.graph, this.vehicles, this.pathEngine, this.evaluator);
      }

      const meta = colorMap[alg] || { name: alg, color: '#999', isQuantum: false };
      this.contenders.push({
        id: alg,
        name: meta.name,
        algorithm: alg,
        color: meta.color,
        isQuantum: meta.isQuantum,
        optimizer,
        state: optimizer.getState(),
      });
    }
  }

  public stepAll(): { contenders: TournamentContender[]; allFinished: boolean } {
    let allDone = true;

    for (const c of this.contenders) {
      if (!c.state.isFinished) {
        c.state = c.optimizer.step();
        if (!c.state.isFinished) allDone = false;
      }
    }

    this.isCompleted = allDone;
    return { contenders: this.contenders, allFinished: allDone };
  }

  public runAll(): TournamentContender[] {
    for (const c of this.contenders) {
      if (c.optimizer.runAll) {
        c.optimizer.runAll();
        c.state = c.optimizer.getState();
      }
    }
    this.isCompleted = true;
    return this.contenders;
  }

  public getContenders(): TournamentContender[] {
    return this.contenders;
  }

  public reset() {
    this.initContenders(this.contenders.map(c => c.algorithm));
  }
}
