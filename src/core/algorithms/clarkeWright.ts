import { CityGraph, GraphNode } from '../../types/graph';
import { Vehicle, VRPSolution, VehicleRoute, RouteStop } from '../../types/vrp';
import { OptimizationStepState, ConvergenceRecord } from '../../types/optimizer';
import { ShortestPathEngine } from '../graph/shortestPath';
import { VRPCostEvaluator } from '../formulations/vrpCostEvaluator';

export class ClarkeWrightSavingsOptimizer {
  private customerNodes: GraphNode[];
  private depotNodes: GraphNode[];
  private bestSolution: VRPSolution | null = null;
  private isFinished: boolean = false;
  private history: ConvergenceRecord[] = [];

  constructor(
    private graph: CityGraph,
    private vehicles: Vehicle[],
    private pathEngine: ShortestPathEngine,
    private evaluator: VRPCostEvaluator
  ) {
    this.customerNodes = graph.nodes.filter(n => n.type !== 'depot');
    this.depotNodes = graph.nodes.filter(n => n.type === 'depot');
  }

  public runAll(): VRPSolution {
    const startTime = performance.now();
    const depot = this.depotNodes[0] || this.graph.nodes[0];
    const n = this.customerNodes.length;

    // 1. Calculate savings matrix: s(i, j) = c(depot, i) + c(depot, j) - c(i, j)
    const savings: Array<{ i: GraphNode; j: GraphNode; saving: number }> = [];

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const c1 = this.customerNodes[i];
        const c2 = this.customerNodes[j];
        const d0i = this.pathEngine.findPath(depot.id, c1.id).distanceKm;
        const d0j = this.pathEngine.findPath(depot.id, c2.id).distanceKm;
        const dij = this.pathEngine.findPath(c1.id, c2.id).distanceKm;
        const s = d0i + d0j - dij;
        savings.push({ i: c1, j: c2, saving: s });
      }
    }

    savings.sort((a, b) => b.saving - a.saving);

    // Initial individual routes for each customer
    const clusters: GraphNode[][] = this.customerNodes.map(c => [c]);

    for (const { i, j } of savings) {
      const clusterI = clusters.find(cl => cl.includes(i));
      const clusterJ = clusters.find(cl => cl.includes(j));

      if (clusterI && clusterJ && clusterI !== clusterJ) {
        // Check if i is at endpoint of clusterI and j at endpoint of clusterJ
        const isEndI = clusterI[0] === i || clusterI[clusterI.length - 1] === i;
        const isEndJ = clusterJ[0] === j || clusterJ[clusterJ.length - 1] === j;

        if (isEndI && isEndJ) {
          const totalLoad = clusterI.reduce((sum, c) => sum + c.demand, 0) +
                            clusterJ.reduce((sum, c) => sum + c.demand, 0);

          // Check against maximum vehicle capacity
          const maxCap = Math.max(...this.vehicles.map(v => v.capacityKg));
          if (totalLoad <= maxCap) {
            // Merge clusters
            if (clusterI[0] === i) clusterI.reverse();
            if (clusterJ[clusterJ.length - 1] === j) clusterJ.reverse();
            const merged = [...clusterI, ...clusterJ];
            const idxI = clusters.indexOf(clusterI);
            const idxJ = clusters.indexOf(clusterJ);
            clusters.splice(Math.max(idxI, idxJ), 1);
            clusters.splice(Math.min(idxI, idxJ), 1);
            clusters.push(merged);
          }
        }
      }
    }

    // Convert clusters into vehicle routes
    const routes: VehicleRoute[] = [];
    for (let vIdx = 0; vIdx < this.vehicles.length && vIdx < clusters.length; vIdx++) {
      const vehicle = this.vehicles[vIdx];
      const cluster = clusters[vIdx];
      const stops: RouteStop[] = [];
      const polyline: string[] = [depot.id];

      let currId = depot.id;
      let curDist = 0;
      let curTime = 0;
      let curLoad = 0;
      let curCong = 0;

      for (const cust of cluster) {
        const path = this.pathEngine.findPath(currId, cust.id);
        curDist += path.distanceKm;
        curTime += path.travelTimeMin / vehicle.speedMultiplier + 10;
        curLoad += cust.demand;
        curCong += path.congestionCost;
        polyline.push(...path.pathNodeIds.slice(1));

        stops.push({
          nodeId: cust.id,
          arrivalTimeMin: curTime - 10,
          departureTimeMin: curTime,
          loadDelivered: cust.demand,
          cumulativeDistanceKm: curDist,
          waitingTimeMin: 0,
          timeWindowPenalty: 0,
        });
        currId = cust.id;
      }

      const returnPath = this.pathEngine.findPath(currId, depot.id);
      curDist += returnPath.distanceKm;
      curTime += returnPath.travelTimeMin / vehicle.speedMultiplier;
      polyline.push(...returnPath.pathNodeIds.slice(1));

      routes.push({
        vehicleId: vehicle.id,
        depotId: depot.id,
        stops,
        totalDistanceKm: Math.round(curDist * 100) / 100,
        totalTimeMin: Math.round(curTime * 10) / 10,
        totalLoadKg: curLoad,
        totalEmissionG: Math.round(curDist * vehicle.emissionRateGPerKm),
        congestionPenalty: Math.round(curCong * 10) / 10,
        timeWindowViolations: 0,
        capacityViolations: 0,
        pathPolylineNodeIds: polyline,
      });
    }

    const sol = this.evaluator.evaluateRoutes(
      { routes, unassigned: [] },
      this.customerNodes.length,
      performance.now() - startTime
    );

    this.bestSolution = sol;
    this.isFinished = true;
    this.history = [{
      iteration: 1,
      bestCost: sol.totalCost,
      meanCost: sol.totalCost,
      worstCost: sol.totalCost,
      diversityIndex: 0,
      entropy: 0,
      timestampMs: performance.now() - startTime,
    }];

    return sol;
  }

  public step(): OptimizationStepState {
    if (!this.bestSolution) {
      this.runAll();
    }
    return this.getState();
  }

  public getState(): OptimizationStepState {
    return {
      currentIteration: 1,
      maxIterations: 1,
      bestSolution: this.bestSolution,
      bestCost: this.bestSolution?.totalCost || Infinity,
      history: this.history,
      isFinished: true,
    };
  }
}
