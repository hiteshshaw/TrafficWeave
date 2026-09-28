/**
 * Synthetic Scalability Graph Generator
 *
 * Generates randomised city graphs with exactly N customer nodes + 1 depot,
 * connected by a random planar road network with realistic speed/congestion.
 * Used exclusively for scalability benchmarking (N = 5 → 100 customers).
 */

import { CityGraph, GraphNode, GraphEdge } from '../../types/graph';
import { Vehicle } from '../../types/vrp';
import { ShortestPathEngine } from './shortestPath';
import { VRPCostEvaluator } from '../formulations/vrpCostEvaluator';
import { buildAdjacencyMap } from './graphGenerator';

export function generateScalabilityTestGraph(
  numCustomers: number,
  baseEvaluator: VRPCostEvaluator,
): {
  graph: CityGraph;
  vehicles: Vehicle[];
  pathEngine: ShortestPathEngine;
  evaluator: VRPCostEvaluator;
} {
  // Seeded-ish pseudo-random using numCustomers as seed influence
  const rng = () => Math.random();

  const nodes: GraphNode[] = [];

  // Single central depot
  nodes.push({
    id: 'sc_depot_0',
    name: 'Central Depot',
    x: 500,
    y: 500,
    lat: 37.0 + rng() * 0.01,
    lng: -122.0 + rng() * 0.01,
    type: 'depot',
    demand: 0,
  });

  // Customer nodes scattered in a ~500km² bounding box
  for (let i = 0; i < numCustomers; i++) {
    const angle = (i / numCustomers) * 2 * Math.PI + rng() * 0.5;
    const r = 0.05 + rng() * 0.35; // 0-350km radius
    const lat = 37.0 + r * Math.sin(angle);
    const lng = -122.0 + r * Math.cos(angle);

    nodes.push({
      id: `sc_cust_${i}`,
      name: `Customer ${i + 1}`,
      x: 500 + r * 400 * Math.cos(angle),
      y: 500 + r * 400 * Math.sin(angle),
      lat,
      lng,
      type: i % 8 === 0 ? 'hospital' : 'customer',
      demand: 50 + Math.floor(rng() * 200),
      priority: i % 8 === 0 ? 5 : undefined,
      timeWindow: {
        start: 20 + Math.floor(rng() * 40),
        end: 100 + Math.floor(rng() * 60),
        serviceDuration: 8 + Math.floor(rng() * 12),
      },
    });
  }

  // Build edges: Delaunay-like connectivity using nearest-neighbour k-NN (k=3)
  const edges: GraphEdge[] = [];
  const edgeSet = new Set<string>();

  // Ensure connectivity: first build a spanning chain through all nodes
  for (let i = 0; i < nodes.length - 1; i++) {
    addEdge(nodes[i], nodes[i + 1], edges, edgeSet, rng);
  }
  // Also connect last back to depot to ensure return path
  addEdge(nodes[nodes.length - 1], nodes[0], edges, edgeSet, rng);

  // Add extra random edges for redundancy (k-NN style, k=2)
  for (let i = 1; i < nodes.length; i++) {
    // Find 2 closest nodes
    const dists = nodes
      .map((n, j) => ({ j, d: haversine2D(nodes[i], n) }))
      .filter(x => x.j !== i)
      .sort((a, b) => a.d - b.d)
      .slice(0, Math.min(3, nodes.length - 1));

    for (const { j } of dists) {
      addEdge(nodes[i], nodes[j], edges, edgeSet, rng);
    }
  }

  const graph: CityGraph = {
    id: `scalability_N${numCustomers}`,
    name: `Synthetic Scalability Graph N=${numCustomers}`,
    country: 'Synthetic',
    center: [37.0, -122.0],
    zoom: 10,
    description: `Auto-generated ${numCustomers}-customer VRP benchmark graph for scalability analysis.`,
    nodes,
    edges,
    adjacency: buildAdjacencyMap(edges),
    bounds: { minX: 50, maxX: 950, minY: 50, maxY: 950 },
  };

  const pathEngine = new ShortestPathEngine(graph);
  const evaluator = new VRPCostEvaluator(baseEvaluator.getWeights());

  // Scale vehicles proportionally to customer count
  const numVehicles = Math.max(1, Math.min(6, Math.ceil(numCustomers / 15)));
  const vehicles: Vehicle[] = Array.from({ length: numVehicles }, (_, i) => ({
    id: `sc_v${i}`,
    name: `Vehicle ${i + 1}`,
    type: i % 3 === 1 ? 'electric_truck' : i % 3 === 2 ? 'heavy_cargo' : 'van',
    capacityKg: i % 3 === 2 ? 1200 : i % 3 === 1 ? 750 : 500,
    currentLoadKg: 0,
    speedMultiplier: i % 3 === 2 ? 0.85 : i % 3 === 1 ? 1.0 : 1.1,
    emissionRateGPerKm: i % 3 === 2 ? 230 : i % 3 === 1 ? 40 : 120,
    color: ['#00f0ff', '#a855f7', '#10b981', '#f59e0b', '#ef4444', '#3b82f6'][i % 6],
  }));

  return { graph, vehicles, pathEngine, evaluator };
}

function haversine2D(a: GraphNode, b: GraphNode): number {
  const dx = a.lat - b.lat;
  const dy = a.lng - b.lng;
  return Math.sqrt(dx * dx + dy * dy);
}

function addEdge(
  a: GraphNode,
  b: GraphNode,
  edges: GraphEdge[],
  edgeSet: Set<string>,
  rng: () => number,
): void {
  const key = [a.id, b.id].sort().join('|');
  if (edgeSet.has(key)) return;
  edgeSet.add(key);

  const latDiff = Math.abs(a.lat - b.lat);
  const lngDiff = Math.abs(a.lng - b.lng);
  const distKm = Math.max(0.5, Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111);
  const baseSpeed = 40 + Math.floor(rng() * 50); // 40-90 km/h
  const congestion = 1.0 + rng() * 2.0;

  edges.push({
    id: `sc_edge_${a.id}_${b.id}`,
    source: a.id,
    target: b.id,
    lengthKm: Math.round(distKm * 10) / 10,
    baseSpeedKmh: baseSpeed,
    currentSpeedKmh: Math.max(10, Math.round(baseSpeed / congestion)),
    congestionFactor: Math.round(congestion * 10) / 10,
    capacityVehiclesPerHour: 1200 + Math.floor(rng() * 800),
    currentFlow: Math.floor(rng() * 800),
    geoPoints: [[a.lat, a.lng], [b.lat, b.lng]],
  });
}
