import { GraphNode } from '../../types/graph';
import { Vehicle, VehicleRoute, RouteStop } from '../../types/vrp';
import { ShortestPathEngine } from '../graph/shortestPath';
import { computePhysicsEmission } from '../algorithms/exactSolver';

export interface DecodedRoutePlan {
  routes: VehicleRoute[];
  unassigned: string[];
}

/**
 * Decodes a continuous position vector or Bloch angles into a valid multi-vehicle VRP routing plan.
 * Uses Random-Key sorting + Capacity/Time-Window greedy packing with multi-depot assignment.
 */
export function decodeContinuousToRoutes(
  position: number[],
  customerNodes: GraphNode[],
  depotNodes: GraphNode[],
  vehicles: Vehicle[],
  pathEngine: ShortestPathEngine
): DecodedRoutePlan {
  if (customerNodes.length === 0 || vehicles.length === 0) {
    return { routes: [], unassigned: [] };
  }

  // 1. Sort customers by continuous position keys (Random-Key method)
  const customerOrder = customerNodes
    .map((cust, idx) => ({
      customer: cust,
      key: position[idx] ?? Math.random(),
    }))
    .sort((a, b) => a.key - b.key)
    .map(item => item.customer);

  const routes: VehicleRoute[] = [];
  let remainingCustomers = [...customerOrder];

  // Distribute vehicles across available depots (or nearest depot)
  for (let vIdx = 0; vIdx < vehicles.length && remainingCustomers.length > 0; vIdx++) {
    const vehicle = vehicles[vIdx];
    // Pick closest depot to vehicle starting strategy
    const primaryDepot = depotNodes[vIdx % depotNodes.length];

    let currentLoad = 0;
    let currentTimeMin = 0;
    let currentDistanceKm = 0;
    let totalCongestion = 0;
    let totalEmissionG = 0;
    let timeViolations = 0;
    let capacityViolations = 0;

    let currentNodeId = primaryDepot.id;
    const stops: RouteStop[] = [];
    const pathPolylineNodeIds: string[] = [primaryDepot.id];

    const unservedThisVehicle: GraphNode[] = [];

    for (const cust of remainingCustomers) {
      if (currentLoad + cust.demand <= vehicle.capacityKg * 1.25) { // allow soft overflow with penalty
        const path = pathEngine.findPath(currentNodeId, cust.id);
        const arrivalTime = currentTimeMin + path.travelTimeMin / vehicle.speedMultiplier;
        let waitingTime = 0;
        let penalty = 0;

        if (cust.timeWindow) {
          if (arrivalTime < cust.timeWindow.start) {
            waitingTime = cust.timeWindow.start - arrivalTime;
          } else if (arrivalTime > cust.timeWindow.end) {
            // Late arrival penalty
            const lateMin = arrivalTime - cust.timeWindow.end;
            penalty = lateMin * 2.5 * (cust.priority || 1);
            timeViolations++;
          }
        }

        const departureTime = arrivalTime + waitingTime + (cust.timeWindow?.serviceDuration || 10);
        currentLoad += cust.demand;
        if (currentLoad > vehicle.capacityKg) {
          capacityViolations += (currentLoad - vehicle.capacityKg);
        }

        currentDistanceKm += path.distanceKm;
        currentTimeMin = departureTime;
        totalCongestion += path.congestionCost;

        // Physics-based emission: speed-curve + load-dependent CO₂ model
        const avgSpeedKmh = path.travelTimeMin > 0
          ? (path.distanceKm / (path.travelTimeMin / 60))
          : 30;
        totalEmissionG += computePhysicsEmission(
          path.distanceKm,
          avgSpeedKmh,
          currentLoad,
          vehicle.emissionRateGPerKm,
          vehicle.type,
        );

        // Append detailed path
        for (let i = 1; i < path.pathNodeIds.length; i++) {
          pathPolylineNodeIds.push(path.pathNodeIds[i]);
        }

        stops.push({
          nodeId: cust.id,
          arrivalTimeMin: Math.round(arrivalTime * 10) / 10,
          departureTimeMin: Math.round(departureTime * 10) / 10,
          loadDelivered: cust.demand,
          cumulativeDistanceKm: Math.round(currentDistanceKm * 10) / 10,
          waitingTimeMin: Math.round(waitingTime * 10) / 10,
          timeWindowPenalty: Math.round(penalty * 10) / 10,
        });

        currentNodeId = cust.id;
      } else {
        unservedThisVehicle.push(cust);
      }
    }

    // Return to closest depot or home depot
    const returnPath = pathEngine.findPath(currentNodeId, primaryDepot.id);
    currentDistanceKm += returnPath.distanceKm;
    currentTimeMin += returnPath.travelTimeMin / vehicle.speedMultiplier;
    totalCongestion += returnPath.congestionCost;
    totalEmissionG += returnPath.distanceKm * vehicle.emissionRateGPerKm;

    for (let i = 1; i < returnPath.pathNodeIds.length; i++) {
      pathPolylineNodeIds.push(returnPath.pathNodeIds[i]);
    }

    if (stops.length > 0) {
      routes.push({
        vehicleId: vehicle.id,
        depotId: primaryDepot.id,
        stops,
        totalDistanceKm: Math.round(currentDistanceKm * 100) / 100,
        totalTimeMin: Math.round(currentTimeMin * 10) / 10,
        totalLoadKg: currentLoad,
        totalEmissionG: Math.round(totalEmissionG),
        congestionPenalty: Math.round(totalCongestion * 10) / 10,
        timeWindowViolations: timeViolations,
        capacityViolations,
        pathPolylineNodeIds,
      });
    }

    remainingCustomers = unservedThisVehicle;
  }

  return {
    routes,
    unassigned: remainingCustomers.map(c => c.id),
  };
}
