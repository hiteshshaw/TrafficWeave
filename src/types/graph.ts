export interface GeoPoint {
  x: number;
  y: number;
  lat?: number;
  lng?: number;
  name?: string;
}

export type NodeType = 'depot' | 'customer' | 'intersection' | 'charging_station' | 'hospital';

export interface GraphNode {
  id: string;
  name: string;
  x: number; // 0 to 1000 coordinate space for schematic view
  y: number;
  lat: number; // Real GPS Latitude
  lng: number; // Real GPS Longitude
  type: NodeType;
  demand: number; // For customers (e.g., packages / payload weight in kg)
  timeWindow?: {
    start: number; // time in minutes from t=0
    end: number;
    serviceDuration: number; // minutes
  };
  priority?: number; // 1 to 5
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  lengthKm: number;
  baseSpeedKmh: number;
  currentSpeedKmh: number;
  congestionFactor: number; // 1.0 (free flow) to 5.0 (severe gridlock)
  isClosed?: boolean;
  incidentType?: 'none' | 'accident' | 'construction' | 'flooding' | 'vip_corridor' | 'traffic_surge';
  capacityVehiclesPerHour: number;
  currentFlow: number;
  geoPoints?: Array<[number, number]>; // detailed GPS [lat, lng] polyline points for real roads
}

export interface CityGraph {
  id: string;
  name: string;
  country: string;
  center: [number, number]; // [lat, lng]
  zoom: number;
  description: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  adjacency: Map<string, Array<{ targetId: string; edge: GraphEdge }>>;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
}

export interface TrafficIncident {
  id: string;
  edgeId: string;
  type: 'accident' | 'construction' | 'flooding' | 'traffic_surge';
  severity: number; // 1.0 to 10.0
  createdAt: number;
  durationSeconds: number;
  description: string;
}
