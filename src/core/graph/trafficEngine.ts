import { CityGraph, GraphEdge, TrafficIncident } from '../../types/graph';

export class TrafficSimulationEngine {
  private graph: CityGraph;
  private incidents: Map<string, TrafficIncident> = new Map();
  private timeStepMinutes: number = 0;
  private rushHourPeak: number = 60; // peak at t=60 min

  constructor(graph: CityGraph) {
    this.graph = graph;
  }

  public setGraph(graph: CityGraph) {
    this.graph = graph;
    this.incidents.clear();
  }

  public addIncident(incident: TrafficIncident) {
    this.incidents.set(incident.id, incident);
    this.updateEdgeForIncident(incident, true);
  }

  public removeIncident(incidentId: string) {
    const incident = this.incidents.get(incidentId);
    if (incident) {
      this.updateEdgeForIncident(incident, false);
      this.incidents.delete(incidentId);
    }
  }

  public clearAllIncidents() {
    this.incidents.forEach(inc => this.updateEdgeForIncident(inc, false));
    this.incidents.clear();
  }

  public getIncidents(): TrafficIncident[] {
    return Array.from(this.incidents.values());
  }

  private updateEdgeForIncident(incident: TrafficIncident, apply: boolean) {
    const edge = this.graph.edges.find(e => e.id === incident.edgeId);
    if (!edge) return;

    if (apply) {
      edge.incidentType = incident.type;
      if (incident.type === 'accident' || incident.type === 'flooding' || incident.severity >= 7.0) {
        edge.congestionFactor = 5.0;
        edge.isClosed = true;
        edge.currentSpeedKmh = 0;
      } else {
        edge.congestionFactor = Math.min(4.5, edge.congestionFactor + incident.severity * 0.3);
        edge.currentSpeedKmh = Math.max(5, Math.round(edge.baseSpeedKmh / edge.congestionFactor));
      }
    } else {
      edge.incidentType = 'none';
      edge.isClosed = false;
      edge.congestionFactor = 1.0;
      edge.currentSpeedKmh = edge.baseSpeedKmh;
    }
  }

  public step(deltaSeconds: number = 1.0, rushHourIntensity: number = 1.0): { updatedEdges: GraphEdge[]; timeMin: number } {
    this.timeStepMinutes += deltaSeconds / 60;
    
    // Rush hour wave formula: Gaussian peak around rushHourPeak
    const dt = (this.timeStepMinutes % 180) - this.rushHourPeak;
    const wave = Math.exp(-(dt * dt) / (2 * 25 * 25)) * rushHourIntensity;

    const updatedEdges: GraphEdge[] = [];

    for (const edge of this.graph.edges) {
      if (edge.isClosed) continue;

      // Base stochastic jitter
      const noise = (Math.random() - 0.5) * 0.05;
      
      // Congestion tendency towards baseline + rush hour wave
      const targetCongestion = 1.0 + (edge.congestionFactor - 1.0) * 0.98 + wave * 0.8 + noise;
      edge.congestionFactor = Math.max(1.0, Math.min(4.8, edge.congestionFactor * 0.95 + targetCongestion * 0.05));
      edge.currentSpeedKmh = Math.max(10, Math.round(edge.baseSpeedKmh / edge.congestionFactor));
      edge.currentFlow = Math.round(edge.capacityVehiclesPerHour * (edge.congestionFactor / 4.8) * 0.85);

      updatedEdges.push(edge);
    }

    return { updatedEdges, timeMin: this.timeStepMinutes };
  }

  public getDynamicEdgeWeight(edge: GraphEdge, alphaCongestion: number = 1.0): { timeMinutes: number; effectiveDistKm: number } {
    if (edge.isClosed) {
      return { timeMinutes: 999999, effectiveDistKm: 999999 };
    }
    const speed = Math.max(8, edge.currentSpeedKmh);
    const timeHours = edge.lengthKm / speed;
    const timeMinutes = timeHours * 60 * (1 + (edge.congestionFactor - 1.0) * alphaCongestion);
    return { timeMinutes, effectiveDistKm: edge.lengthKm * edge.congestionFactor };
  }
}
