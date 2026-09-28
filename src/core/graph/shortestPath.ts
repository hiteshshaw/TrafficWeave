import { CityGraph, GraphNode } from '../../types/graph';

export interface PathResult {
  sourceId: string;
  targetId: string;
  distanceKm: number;
  travelTimeMin: number;
  pathNodeIds: string[];
  congestionCost: number;
}

export class ShortestPathEngine {
  private graph: CityGraph;
  private pathCache: Map<string, PathResult> = new Map();

  constructor(graph: CityGraph) {
    this.graph = graph;
  }

  public invalidateCache() {
    this.pathCache.clear();
  }

  public setGraph(graph: CityGraph) {
    this.graph = graph;
    this.pathCache.clear();
  }

  /**
   * Computes shortest path using Dijkstra's algorithm with dynamic congestion weights
   */
  public findPath(sourceId: string, targetId: string, timeWeight: number = 0.6, distWeight: number = 0.4): PathResult {
    if (sourceId === targetId) {
      return {
        sourceId,
        targetId,
        distanceKm: 0,
        travelTimeMin: 0,
        pathNodeIds: [sourceId],
        congestionCost: 0,
      };
    }

    const cacheKey = `${sourceId}_${targetId}_${timeWeight.toFixed(1)}_${distWeight.toFixed(1)}`;
    if (this.pathCache.has(cacheKey)) {
      return this.pathCache.get(cacheKey)!;
    }

    const distances = new Map<string, number>();
    const prev = new Map<string, { node: string; dist: number; time: number; cong: number }>();
    const visited = new Set<string>();

    for (const node of this.graph.nodes) {
      distances.set(node.id, Infinity);
    }
    distances.set(sourceId, 0);

    const queue: Array<{ id: string; cost: number }> = [{ id: sourceId, cost: 0 }];

    while (queue.length > 0) {
      queue.sort((a, b) => a.cost - b.cost);
      const { id: u, cost: currentCost } = queue.shift()!;

      if (visited.has(u)) continue;
      visited.add(u);

      if (u === targetId) break;

      const neighbors = this.graph.adjacency.get(u) || [];
      for (const { targetId: v, edge } of neighbors) {
        if (visited.has(v) || edge.isClosed) continue;

        const edgeTimeMin = (edge.lengthKm / Math.max(5, edge.currentSpeedKmh)) * 60;
        const edgeCongestionCost = edge.congestionFactor * edge.lengthKm;
        
        // Multi-objective composite cost
        const edgeCost = timeWeight * edgeTimeMin + distWeight * edge.lengthKm + 0.2 * edgeCongestionCost;
        const newCost = currentCost + edgeCost;

        if (newCost < (distances.get(v) ?? Infinity)) {
          distances.set(v, newCost);
          prev.set(v, {
            node: u,
            dist: edge.lengthKm,
            time: edgeTimeMin,
            cong: edgeCongestionCost,
          });
          queue.push({ id: v, cost: newCost });
        }
      }
    }

    // Reconstruct path
    const pathNodeIds: string[] = [];
    let curr = targetId;
    let totalDist = 0;
    let totalTime = 0;
    let totalCong = 0;

    if (!prev.has(targetId) && sourceId !== targetId) {
      // Fallback: direct Euclidean line if disconnected
      const n1 = this.graph.nodes.find(n => n.id === sourceId)!;
      const n2 = this.graph.nodes.find(n => n.id === targetId)!;
      const dx = n1.x - n2.x;
      const dy = n1.y - n2.y;
      const fallbackDist = Math.sqrt(dx * dx + dy * dy) * 0.025;
      const result: PathResult = {
        sourceId,
        targetId,
        distanceKm: fallbackDist,
        travelTimeMin: (fallbackDist / 30) * 60,
        pathNodeIds: [sourceId, targetId],
        congestionCost: fallbackDist * 1.5,
      };
      this.pathCache.set(cacheKey, result);
      return result;
    }

    pathNodeIds.push(curr);
    while (prev.has(curr)) {
      const step = prev.get(curr)!;
      totalDist += step.dist;
      totalTime += step.time;
      totalCong += step.cong;
      curr = step.node;
      pathNodeIds.unshift(curr);
    }

    const result: PathResult = {
      sourceId,
      targetId,
      distanceKm: Math.round(totalDist * 100) / 100,
      travelTimeMin: Math.round(totalTime * 10) / 10,
      pathNodeIds,
      congestionCost: Math.round(totalCong * 10) / 10,
    };

    this.pathCache.set(cacheKey, result);
    return result;
  }

  /**
   * Precomputes full Distance & Travel Time Matrices between all nodes
   */
  public computeAllPairsMatrix(): {
    nodes: GraphNode[];
    distanceMatrix: number[][];
    timeMatrix: number[][];
    nodeIndexMap: Map<string, number>;
  } {
    const nodes = this.graph.nodes;
    const nodeIndexMap = new Map<string, number>();
    nodes.forEach((n, idx) => nodeIndexMap.set(n.id, idx));

    const n = nodes.length;
    const distanceMatrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
    const timeMatrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          distanceMatrix[i][j] = 0;
          timeMatrix[i][j] = 0;
        } else {
          const path = this.findPath(nodes[i].id, nodes[j].id);
          distanceMatrix[i][j] = path.distanceKm;
          timeMatrix[i][j] = path.travelTimeMin;
        }
      }
    }

    return { nodes, distanceMatrix, timeMatrix, nodeIndexMap };
  }
}
