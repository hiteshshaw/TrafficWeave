import { VRPSolution, MultiObjectiveWeights, VehicleRoute } from '../../types/vrp';
import { GraphNode } from '../../types/graph';
import { DecodedRoutePlan } from './decoder';

export const DEFAULT_WEIGHTS: MultiObjectiveWeights = {
  distanceWeight: 0.30,
  timeWeight: 0.35,
  congestionWeight: 0.20,
  emissionWeight: 0.15,
  penaltyWeight: 5.0,
};

export class VRPCostEvaluator {
  private weights: MultiObjectiveWeights;

  constructor(weights: MultiObjectiveWeights = DEFAULT_WEIGHTS) {
    this.weights = { ...weights };
  }

  public setWeights(weights: Partial<MultiObjectiveWeights>) {
    this.weights = { ...this.weights, ...weights };
  }

  public getWeights(): MultiObjectiveWeights {
    return { ...this.weights };
  }

  /**
   * Calculates overall scalarized multi-objective cost and builds VRPSolution
   */
  public evaluateRoutes(
    plan: DecodedRoutePlan,
    allCustomersCount: number,
    computationTimeMs: number = 0
  ): VRPSolution {
    let totalDist = 0;
    let totalTime = 0;
    let totalEmissionG = 0;
    let totalCongestion = 0;
    let totalViolationsPenalty = 0;

    for (const r of plan.routes) {
      totalDist += r.totalDistanceKm;
      totalTime += r.totalTimeMin;
      totalEmissionG += r.totalEmissionG;
      totalCongestion += r.congestionPenalty;
      
      // Violations penalties
      totalViolationsPenalty += r.timeWindowViolations * 50;
      totalViolationsPenalty += r.capacityViolations * 2.0;
    }

    // Heavy penalty for unassigned customers
    const unassignedPenalty = plan.unassigned.length * 500;
    totalViolationsPenalty += unassignedPenalty;

    // Multi-objective scalarized objective function
    const totalCost =
      this.weights.distanceWeight * totalDist +
      this.weights.timeWeight * totalTime +
      this.weights.congestionWeight * (totalCongestion * 0.5) +
      this.weights.emissionWeight * (totalEmissionG / 1000) +
      this.weights.penaltyWeight * totalViolationsPenalty;

    const isFeasible = plan.unassigned.length === 0 && totalViolationsPenalty === 0;

    return {
      routes: plan.routes,
      totalCost: Math.round(totalCost * 100) / 100,
      totalDistanceKm: Math.round(totalDist * 100) / 100,
      totalTimeMin: Math.round(totalTime * 10) / 10,
      totalEmissionKg: Math.round((totalEmissionG / 1000) * 100) / 100,
      totalCongestionDelayMin: Math.round(totalCongestion * 10) / 10,
      isFeasible,
      unassignedCustomers: plan.unassigned,
      computationTimeMs,
      fitness: 1 / (1 + totalCost),
    };
  }
}
