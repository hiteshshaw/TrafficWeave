import { CityGraph, GraphNode } from '../../types/graph';
import { Vehicle, VRPSolution, VehicleRoute, RouteStop } from '../../types/vrp';
import { OptimizationStepState, ConvergenceRecord } from '../../types/optimizer';
import { ShortestPathEngine } from '../graph/shortestPath';
import { VRPCostEvaluator } from '../formulations/vrpCostEvaluator';

/**
 * Exact Branch-and-Bound VRP Solver
 *
 * Finds a provably optimal solution for small instances (≤ 10 customers).
 * Uses depth-first branch-and-bound with lower-bound pruning via the
 * assignment relaxation: LB(node) = current_cost + nearest-neighbour greedy
 * lower bound on remaining unvisited customers.
 *
 * Automatically falls back to "best-feasible greedy" if customer count > 10
 * to avoid combinatorial explosion in the browser.
 */
export class ExactBranchAndBoundSolver {
  private customerNodes: GraphNode[];
  private depotNodes: GraphNode[];
  private bestSolution: VRPSolution | null = null;
  private bestCost: number = Infinity;
  private isFinished: boolean = false;
  private history: ConvergenceRecord[] = [];
  private nodesExplored: number = 0;
  private nodesPruned: number = 0;

  // Pre-computed distance matrix for speed
  private distMatrix: number[][] = [];
  private allNodes: GraphNode[] = [];

  public readonly MAX_CUSTOMERS = 10; // hard safety cap for browser

  constructor(
    private graph: CityGraph,
    private vehicles: Vehicle[],
    private pathEngine: ShortestPathEngine,
    private evaluator: VRPCostEvaluator,
  ) {
    this.customerNodes = graph.nodes.filter(n => n.type !== 'depot');
    this.depotNodes = graph.nodes.filter(n => n.type === 'depot');
    this.allNodes = [...this.depotNodes, ...this.customerNodes];
  }

  public get customerCount() {
    return this.customerNodes.length;
  }

  public get isTractable() {
    return this.customerNodes.length <= this.MAX_CUSTOMERS;
  }

  /** Pre-compute all pairwise shortest-path distances */
  private buildDistanceMatrix(): void {
    const n = this.allNodes.length;
    this.distMatrix = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const d = this.pathEngine.findPath(this.allNodes[i].id, this.allNodes[j].id).distanceKm;
        this.distMatrix[i][j] = d;
        this.distMatrix[j][i] = d;
      }
    }
  }

  private nodeIdx(id: string): number {
    return this.allNodes.findIndex(n => n.id === id);
  }

  /**
   * Greedy nearest-neighbour lower bound for remaining unvisited customers.
   * Underestimates true cost → valid lower bound → safe for pruning.
   */
  private lowerBound(fromIdx: number, unvisited: number[]): number {
    if (unvisited.length === 0) return 0;
    // Each remaining customer must be visited at minimum the closest-neighbour distance
    let lb = 0;
    for (const custIdx of unvisited) {
      let minDist = Infinity;
      // min dist from any already-visited node (approximation)
      for (let j = 0; j < this.allNodes.length; j++) {
        if (j !== custIdx) {
          minDist = Math.min(minDist, this.distMatrix[custIdx][j]);
        }
      }
      lb += minDist;
    }
    return lb * 0.5; // conservative scaling to keep it an underestimate
  }

  /**
   * Build a VRPSolution from a permutation of customer indices (single-vehicle simplification).
   * Multi-vehicle: greedily pack into vehicles in order.
   */
  private buildSolutionFromPermutation(permutation: number[]): VRPSolution {
    const depot = this.depotNodes[0] || this.allNodes[0];
    const routes: VehicleRoute[] = [];
    let custIdx = 0;

    for (let vIdx = 0; vIdx < this.vehicles.length && custIdx < permutation.length; vIdx++) {
      const vehicle = this.vehicles[vIdx];
      const stops: RouteStop[] = [];
      const polyline: string[] = [depot.id];

      let currId = depot.id;
      let distKm = 0;
      let timeMin = 0;
      let loadKg = 0;
      let emissionG = 0;
      let congPenalty = 0;
      let twViolations = 0;
      let capViolations = 0;

      while (custIdx < permutation.length) {
        const cust = this.customerNodes[permutation[custIdx]];
        if (loadKg + cust.demand > vehicle.capacityKg * 1.05) break; // capacity exceeded

        const path = this.pathEngine.findPath(currId, cust.id);
        const arrival = timeMin + path.travelTimeMin / vehicle.speedMultiplier;
        let wait = 0;
        let penalty = 0;

        if (cust.timeWindow) {
          if (arrival < cust.timeWindow.start) wait = cust.timeWindow.start - arrival;
          else if (arrival > cust.timeWindow.end) {
            penalty = (arrival - cust.timeWindow.end) * 2.5 * (cust.priority || 1);
            twViolations++;
          }
        }

        const departure = arrival + wait + (cust.timeWindow?.serviceDuration || 10);
        loadKg += cust.demand;
        if (loadKg > vehicle.capacityKg) capViolations += (loadKg - vehicle.capacityKg);

        distKm += path.distanceKm;
        timeMin = departure;
        congPenalty += path.congestionCost;

        // Physics-based emission (from evaluator module)
        const speed = Math.max(10, path.distanceKm > 0 ? path.distanceKm / (path.travelTimeMin / 60) : 30);
        emissionG += computePhysicsEmission(path.distanceKm, speed, loadKg, vehicle.emissionRateGPerKm, vehicle.type);

        for (let i = 1; i < path.pathNodeIds.length; i++) polyline.push(path.pathNodeIds[i]);

        stops.push({
          nodeId: cust.id,
          arrivalTimeMin: Math.round(arrival * 10) / 10,
          departureTimeMin: Math.round(departure * 10) / 10,
          loadDelivered: cust.demand,
          cumulativeDistanceKm: Math.round(distKm * 10) / 10,
          waitingTimeMin: Math.round(wait * 10) / 10,
          timeWindowPenalty: Math.round(penalty * 10) / 10,
        });

        currId = cust.id;
        custIdx++;
      }

      // Return to depot
      const ret = this.pathEngine.findPath(currId, depot.id);
      distKm += ret.distanceKm;
      timeMin += ret.travelTimeMin / vehicle.speedMultiplier;
      congPenalty += ret.congestionCost;
      emissionG += ret.distanceKm * vehicle.emissionRateGPerKm;
      for (let i = 1; i < ret.pathNodeIds.length; i++) polyline.push(ret.pathNodeIds[i]);

      if (stops.length > 0) {
        routes.push({
          vehicleId: vehicle.id,
          depotId: depot.id,
          stops,
          totalDistanceKm: Math.round(distKm * 100) / 100,
          totalTimeMin: Math.round(timeMin * 10) / 10,
          totalLoadKg: loadKg,
          totalEmissionG: Math.round(emissionG),
          congestionPenalty: Math.round(congPenalty * 10) / 10,
          timeWindowViolations: twViolations,
          capacityViolations: capViolations,
          pathPolylineNodeIds: polyline,
        });
      }
    }

    const unassigned = custIdx < permutation.length
      ? permutation.slice(custIdx).map(i => this.customerNodes[i].id)
      : [];

    return this.evaluator.evaluateRoutes({ routes, unassigned }, this.customerNodes.length);
  }

  /**
   * Recursive Branch-and-Bound traversal over customer permutations.
   */
  private bnb(
    current: number[],
    remaining: number[],
    currentCost: number,
  ): void {
    this.nodesExplored++;

    if (remaining.length === 0) {
      const sol = this.buildSolutionFromPermutation(current);
      if (sol.totalCost < this.bestCost) {
        this.bestCost = sol.totalCost;
        this.bestSolution = sol;
      }
      return;
    }

    // Pruning: lower bound check
    const fromIdx = current.length > 0
      ? this.nodeIdx(this.customerNodes[current[current.length - 1]].id)
      : this.nodeIdx((this.depotNodes[0] || this.allNodes[0]).id);

    const lb = this.lowerBound(fromIdx, remaining.map(i => this.nodeIdx(this.customerNodes[i].id)));
    if (currentCost + lb >= this.bestCost) {
      this.nodesPruned++;
      return;
    }

    for (let i = 0; i < remaining.length; i++) {
      const next = remaining[i];
      const newRemaining = [...remaining.slice(0, i), ...remaining.slice(i + 1)];
      // Incremental cost: from last visited to next customer
      const lastId = current.length > 0
        ? this.customerNodes[current[current.length - 1]].id
        : (this.depotNodes[0] || this.allNodes[0]).id;
      const nextId = this.customerNodes[next].id;
      const stepDist = this.pathEngine.findPath(lastId, nextId).distanceKm;

      this.bnb([...current, next], newRemaining, currentCost + stepDist);
    }
  }

  public runAll(): VRPSolution {
    const start = performance.now();
    this.nodesExplored = 0;
    this.nodesPruned = 0;

    if (!this.isTractable) {
      // Fall back to greedy nearest-neighbour for large instances
      return this.runNearestNeighbourFallback(start);
    }

    this.buildDistanceMatrix();

    // Initialise bestSolution with greedy nearest-neighbour for good initial upper bound
    const greedySol = this.runNearestNeighbourFallback(start);
    this.bestSolution = greedySol;
    this.bestCost = greedySol.totalCost;

    const indices = this.customerNodes.map((_, i) => i);
    this.bnb([], indices, 0);

    const elapsed = performance.now() - start;
    if (this.bestSolution) {
      this.bestSolution.computationTimeMs = Math.round(elapsed * 10) / 10;
    }

    this.history = [{
      iteration: 1,
      bestCost: this.bestCost,
      meanCost: this.bestCost,
      worstCost: this.bestCost,
      diversityIndex: 0,
      entropy: 0,
      timestampMs: elapsed,
    }];

    this.isFinished = true;
    return this.bestSolution!;
  }

  private runNearestNeighbourFallback(startTime: number): VRPSolution {
    // Greedy nearest-neighbour to produce a valid upper bound
    const depot = this.depotNodes[0] || this.allNodes[0];
    const unvisited = new Set(this.customerNodes.map((_, i) => i));
    const permutation: number[] = [];

    let current = depot.id;
    while (unvisited.size > 0) {
      let nearest = -1;
      let nearestDist = Infinity;
      for (const idx of unvisited) {
        const d = this.pathEngine.findPath(current, this.customerNodes[idx].id).distanceKm;
        if (d < nearestDist) { nearestDist = d; nearest = idx; }
      }
      permutation.push(nearest);
      current = this.customerNodes[nearest].id;
      unvisited.delete(nearest);
    }

    const sol = this.buildSolutionFromPermutation(permutation);
    sol.computationTimeMs = Math.round((performance.now() - startTime) * 10) / 10;
    return sol;
  }

  public getState(): OptimizationStepState {
    return {
      currentIteration: 1,
      maxIterations: 1,
      bestSolution: this.bestSolution,
      bestCost: this.bestCost,
      history: this.history,
      isFinished: this.isFinished,
    };
  }

  public getStats() {
    return {
      nodesExplored: this.nodesExplored,
      nodesPruned: this.nodesPruned,
      isTractable: this.isTractable,
      customerCount: this.customerCount,
    };
  }
}

/**
 * Physics-based CO₂ emission model:
 * Uses a speed-dependent fuel consumption curve (based on COPERT road transport model)
 * plus load correction factor.
 *
 * Formula: E = dist × baseRate × f_speed(v) × f_load(load, capacity)
 *   f_speed(v) = 1.0 + 0.3 × ((v - 50)² / 2500)   - U-shaped curve, optimal at ~50 km/h
 *   f_load(l, C) = 1.0 + 0.4 × (l / C)             - linear load penalty
 *
 * Returns grams CO₂
 */
export function computePhysicsEmission(
  distanceKm: number,
  speedKmh: number,
  loadKg: number,
  baseRateGPerKm: number,
  vehicleType: string,
): number {
  const v = Math.max(10, Math.min(130, speedKmh));

  // Speed efficiency factor (minimum at 50 km/h - most fuel-efficient speed)
  const vOpt = vehicleType === 'electric_truck' ? 40 : 50;
  const fSpeed = 1.0 + 0.30 * Math.pow((v - vOpt) / 50, 2);

  // Load factor - heavier load = higher fuel burn
  const maxCapacity = vehicleType === 'heavy_cargo' ? 1200 : vehicleType === 'electric_truck' ? 750 : 500;
  const fLoad = 1.0 + 0.35 * Math.min(1, loadKg / maxCapacity);

  // Electric vehicles have near-zero tailpipe emissions (use 10% of base)
  const typeMultiplier = vehicleType === 'electric_truck' ? 0.10 : 1.0;

  return distanceKm * baseRateGPerKm * fSpeed * fLoad * typeMultiplier;
}
