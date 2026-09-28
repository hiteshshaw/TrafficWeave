import { CityGraph } from '../../types/graph';
import { Vehicle } from '../../types/vrp';
import { AlgorithmType, BenchmarkRun, BenchmarkAggregate, OptimizationHyperparameters, ScalabilityPoint } from '../../types/optimizer';
import { ShortestPathEngine } from '../graph/shortestPath';
import { VRPCostEvaluator } from '../formulations/vrpCostEvaluator';
import { QPSOOptimizer } from './qpso';
import { ClassicalPSOOptimizer } from './classicalPso';
import { QGAOptimizer } from './qga';
import { ClassicalGAOptimizer } from './classicalGa';
import { SimulatedAnnealingOptimizer } from './simulatedAnnealing';
import { ClarkeWrightSavingsOptimizer } from './clarkeWright';
import { ExactBranchAndBoundSolver } from './exactSolver';
import { generateScalabilityTestGraph } from '../graph/scalabilityGraphGen';

export class BenchmarkSuite {
  constructor(
    private graph: CityGraph,
    private vehicles: Vehicle[],
    private pathEngine: ShortestPathEngine,
    private evaluator: VRPCostEvaluator
  ) {}

  private makeOptimizer(alg: AlgorithmType, graph: CityGraph, vehicles: Vehicle[], pathEngine: ShortestPathEngine, evaluator: VRPCostEvaluator, hyperparams?: Partial<OptimizationHyperparameters>): any {
    if (alg === 'QPSO') return new QPSOOptimizer(graph, vehicles, pathEngine, evaluator, hyperparams);
    if (alg === 'CLASSICAL_PSO') return new ClassicalPSOOptimizer(graph, vehicles, pathEngine, evaluator, hyperparams);
    if (alg === 'QGA') return new QGAOptimizer(graph, vehicles, pathEngine, evaluator, hyperparams);
    if (alg === 'CLASSICAL_GA') return new ClassicalGAOptimizer(graph, vehicles, pathEngine, evaluator, hyperparams);
    if (alg === 'SIMULATED_ANNEALING') return new SimulatedAnnealingOptimizer(graph, vehicles, pathEngine, evaluator, hyperparams);
    if (alg === 'EXACT_BNB') return new ExactBranchAndBoundSolver(graph, vehicles, pathEngine, evaluator);
    return new ClarkeWrightSavingsOptimizer(graph, vehicles, pathEngine, evaluator);
  }

  public async runBenchmark(
    algorithms: AlgorithmType[],
    trialsPerAlgorithm: number = 10,
    hyperparams?: Partial<OptimizationHyperparameters>,
    onProgress?: (progress: number, currentAlg: string, trial: number) => void
  ): Promise<{ runs: BenchmarkRun[]; aggregates: BenchmarkAggregate[] }> {
    const runs: BenchmarkRun[] = [];
    let completed = 0;
    const totalRuns = algorithms.length * trialsPerAlgorithm;

    // Run EXACT_BNB once (deterministic - no need for multiple trials)
    let exactOptimalCost: number | undefined = undefined;
    if (algorithms.includes('EXACT_BNB')) {
      const exactSolver = new ExactBranchAndBoundSolver(this.graph, this.vehicles, this.pathEngine, this.evaluator);
      if (exactSolver.isTractable) {
        const exactSol = exactSolver.runAll();
        exactOptimalCost = exactSol.totalCost;
      }
    }

    for (const alg of algorithms) {
      // EXACT_BNB: single run, push as-is
      if (alg === 'EXACT_BNB') {
        if (exactOptimalCost !== undefined) {
          const exactSolver = new ExactBranchAndBoundSolver(this.graph, this.vehicles, this.pathEngine, this.evaluator);
          const solution = exactSolver.runAll();
          for (let trial = 0; trial < trialsPerAlgorithm; trial++) {
            runs.push({
              runId: completed + 1,
              algorithm: alg,
              finalCost: solution.totalCost,
              bestDistanceKm: solution.totalDistanceKm,
              bestTimeMin: solution.totalTimeMin,
              executionTimeMs: solution.computationTimeMs,
              iterationsToConverge: 1,
              feasibilityRate: solution.isFeasible ? 1 : 0,
              solution,
            });
            completed++;
          }
        }
        if (onProgress) onProgress((completed / totalRuns) * 100, alg, trialsPerAlgorithm);
        continue;
      }

      for (let trial = 0; trial < trialsPerAlgorithm; trial++) {
        if (onProgress) {
          onProgress((completed / totalRuns) * 100, alg, trial + 1);
        }
        // Yield to event loop
        await new Promise(r => setTimeout(r, 5));

        const runStart = performance.now();
        const optimizer = this.makeOptimizer(alg, this.graph, this.vehicles, this.pathEngine, this.evaluator, hyperparams);

        const solution = optimizer.runAll();
        const state = optimizer.getState();
        const duration = performance.now() - runStart;

        // Find iteration where cost first reached within 2% of final cost
        let convIter = state.history.length;
        const targetCost = state.bestCost * 1.02;
        for (const h of state.history) {
          if (h.bestCost <= targetCost) {
            convIter = h.iteration;
            break;
          }
        }

        runs.push({
          runId: completed + 1,
          algorithm: alg,
          finalCost: state.bestCost,
          bestDistanceKm: solution.totalDistanceKm,
          bestTimeMin: solution.totalTimeMin,
          executionTimeMs: Math.round(duration * 10) / 10,
          iterationsToConverge: convIter,
          feasibilityRate: solution.isFeasible ? 1 : 0,
          solution,
        });

        completed++;
      }
    }

    if (onProgress) onProgress(100, 'Complete', trialsPerAlgorithm);

    const aggregates = this.computeAggregates(algorithms, runs, exactOptimalCost);
    return { runs, aggregates };
  }

  private computeAggregates(
    algorithms: AlgorithmType[],
    runs: BenchmarkRun[],
    exactOptimalCost?: number,
  ): BenchmarkAggregate[] {
    const qpsoRuns = runs.filter(r => r.algorithm === 'QPSO').map(r => r.finalCost);
    const psoRuns = runs.filter(r => r.algorithm === 'CLASSICAL_PSO').map(r => r.finalCost);
    const meanPso = psoRuns.length > 0 ? psoRuns.reduce((a, b) => a + b, 0) / psoRuns.length : 1;

    return algorithms.map(alg => {
      const algRuns = runs.filter(r => r.algorithm === alg);
      const costs = algRuns.map(r => r.finalCost);
      const times = algRuns.map(r => r.executionTimeMs);
      const iters = algRuns.map(r => r.iterationsToConverge);

      const meanCost = costs.reduce((a, b) => a + b, 0) / costs.length;
      const variance = costs.reduce((sum, c) => sum + (c - meanCost) ** 2, 0) / Math.max(1, costs.length - 1);
      const stdDevCost = Math.sqrt(variance);

      const meanExecTimeMs = times.reduce((a, b) => a + b, 0) / times.length;
      const meanIterationsToConverge = iters.reduce((a, b) => a + b, 0) / iters.length;

      // Welch's t-test p-value vs QPSO
      let pValue: number | undefined = undefined;
      if (alg !== 'QPSO' && alg !== 'EXACT_BNB' && qpsoRuns.length > 1 && costs.length > 1) {
        pValue = this.calculateTTestPValue(qpsoRuns, costs);
      }

      const improvementOverClassicalPsoPercent =
        meanPso > 0 ? Math.round(((meanPso - meanCost) / meanPso) * 1000) / 10 : 0;

      // Optimality gap vs exact BnB optimal
      let optimalityGapPercent: number | undefined = undefined;
      if (exactOptimalCost !== undefined && exactOptimalCost > 0 && alg !== 'EXACT_BNB') {
        optimalityGapPercent = Math.round(((meanCost - exactOptimalCost) / exactOptimalCost) * 1000) / 10;
      }

      return {
        algorithm: alg,
        runsCount: algRuns.length,
        meanCost: Math.round(meanCost * 100) / 100,
        stdDevCost: Math.round(stdDevCost * 100) / 100,
        minCost: Math.round(Math.min(...costs) * 100) / 100,
        maxCost: Math.round(Math.max(...costs) * 100) / 100,
        meanExecTimeMs: Math.round(meanExecTimeMs * 10) / 10,
        meanIterationsToConverge: Math.round(meanIterationsToConverge * 10) / 10,
        pValueVsQPSO: pValue !== undefined ? Math.round(pValue * 10000) / 10000 : undefined,
        improvementOverClassicalPsoPercent,
        optimalityGapPercent,
      };
    });
  }

  /**
   * Scalability Analysis: run QPSO, CLASSICAL_PSO, and CLARKE_WRIGHT across
   * synthetic graphs of N = 5, 8, 10, 15, 20, 30, 50, 75, 100 customers.
   * For each N, runs 3 trials and records mean cost and execution time.
   */
  public async runScalabilityAnalysis(
    algorithms: AlgorithmType[] = ['QPSO', 'CLASSICAL_PSO', 'QGA', 'CLARKE_WRIGHT'],
    onProgress?: (pct: number, label: string) => void,
  ): Promise<ScalabilityPoint[]> {
    const customerCounts = [5, 8, 10, 15, 20, 30, 50, 75, 100];
    const trialsPerN = 3;
    const results: ScalabilityPoint[] = [];
    const total = customerCounts.length * algorithms.length * trialsPerN;
    let done = 0;

    for (const N of customerCounts) {
      const { graph, vehicles, pathEngine, evaluator } = generateScalabilityTestGraph(N, this.evaluator);

      for (const alg of algorithms) {
        const costs: number[] = [];
        const times: number[] = [];

        for (let t = 0; t < trialsPerN; t++) {
          await new Promise(r => setTimeout(r, 2));
          if (onProgress) onProgress((done / total) * 100, `N=${N} ${alg} trial ${t + 1}`);

          const t0 = performance.now();
          const opt = this.makeOptimizer(alg, graph, vehicles, pathEngine, evaluator, {
            populationSize: 25,
            maxIterations: 50,
          });
          const sol = opt.runAll();
          const elapsed = performance.now() - t0;

          costs.push(sol.totalCost);
          times.push(elapsed);
          done++;
        }

        const meanCost = costs.reduce((a, b) => a + b, 0) / costs.length;
        const meanTime = times.reduce((a, b) => a + b, 0) / times.length;
        const variance = costs.reduce((s, c) => s + (c - meanCost) ** 2, 0) / Math.max(1, costs.length - 1);

        results.push({
          customerCount: N,
          algorithm: alg,
          meanCostNormalised: Math.round((meanCost / N) * 100) / 100,
          meanExecTimeMs: Math.round(meanTime * 10) / 10,
          stdDevCost: Math.round(Math.sqrt(variance) * 100) / 100,
        });
      }
    }

    if (onProgress) onProgress(100, 'Done');
    return results;
  }

  /**
   * Approximate two-tailed Welch's t-test p-value calculation
   */
  private calculateTTestPValue(sample1: number[], sample2: number[]): number {
    const n1 = sample1.length;
    const n2 = sample2.length;
    const m1 = sample1.reduce((a, b) => a + b, 0) / n1;
    const m2 = sample2.reduce((a, b) => a + b, 0) / n2;

    const s1 = sample1.reduce((sum, x) => sum + (x - m1) ** 2, 0) / (n1 - 1);
    const s2 = sample2.reduce((sum, x) => sum + (x - m2) ** 2, 0) / (n2 - 1);

    const se = Math.sqrt(s1 / n1 + s2 / n2);
    if (se === 0) return 1.0;
    const t = Math.abs(m1 - m2) / se;

    // Approximate p-value from t-statistic using normal distribution tail approximation
    const pApprox = 2 * (1 - this.approximateCdf(t));
    return Math.max(0.0001, Math.min(1.0, pApprox));
  }

  private approximateCdf(x: number): number {
    // Error function approximation
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989423 * Math.exp((-x * x) / 2);
    const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return x >= 0 ? 1 - prob : prob;
  }
}
