export interface Vehicle {
  id: string;
  name: string;
  type: 'van' | 'electric_truck' | 'heavy_cargo' | 'drone' | 'emergency';
  capacityKg: number;
  currentLoadKg: number;
  speedMultiplier: number;
  emissionRateGPerKm: number; // g CO2/km
  batteryKwh?: number;
  maxBatteryKwh?: number;
  color: string;
}

export interface RouteStop {
  nodeId: string;
  arrivalTimeMin: number;
  departureTimeMin: number;
  loadDelivered: number;
  cumulativeDistanceKm: number;
  waitingTimeMin: number;
  timeWindowPenalty: number;
}

export interface VehicleRoute {
  vehicleId: string;
  depotId: string;
  stops: RouteStop[];
  totalDistanceKm: number;
  totalTimeMin: number;
  totalLoadKg: number;
  totalEmissionG: number;
  congestionPenalty: number;
  timeWindowViolations: number;
  capacityViolations: number;
  pathPolylineNodeIds: string[]; // detailed node-by-node path through road network
}

export interface MultiObjectiveWeights {
  distanceWeight: number; // w_dist
  timeWeight: number;     // w_time
  congestionWeight: number; // w_cong
  emissionWeight: number; // w_emit
  penaltyWeight: number;  // w_pen
}

export interface VRPSolution {
  routes: VehicleRoute[];
  totalCost: number;
  totalDistanceKm: number;
  totalTimeMin: number;
  totalEmissionKg: number;
  totalCongestionDelayMin: number;
  isFeasible: boolean;
  unassignedCustomers: string[];
  computationTimeMs: number;
  fitness: number;
}
