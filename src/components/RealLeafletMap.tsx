import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { CityGraph, GraphNode, TrafficIncident } from '../types/graph';
import { VRPSolution } from '../types/vrp';
import { ShortestPathEngine, PathResult } from '../core/graph/shortestPath';
import {
  Layers,
  MapPin,
  AlertTriangle,
  Navigation,
  Zap,
  Ambulance,
  Play,
  Pause,
  RotateCcw,
  ArrowRightLeft,
  Compass,
  Car,
  Clock,
  Flame,
  CheckCircle,
} from 'lucide-react';
import { sounds } from '../core/audio/soundEffects';

interface RealLeafletMapProps {
  graph: CityGraph;
  solution: VRPSolution | null;
  comparisonSolution?: VRPSolution | null;
  comparisonName?: string;
  showComparison?: boolean;
  incidents: TrafficIncident[];
  onAddIncident: (edgeId: string, type: 'accident' | 'construction' | 'traffic_surge') => void;
  onRemoveIncident?: (incidentId: string) => void;
  onClearAllIncidents?: () => void;
  simulationTimeMin: number;
}

// Tile Layer definitions - Free open tile providers
const TILE_LAYERS = {
  osm: {
    name: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
  dark: {
    name: 'Stadia Dark Matter',
    url: 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a>',
    maxZoom: 20,
  },
  satellite: {
    name: 'Esri Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
    maxZoom: 18,
  },
  topo: {
    name: 'Esri Topo',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
    maxZoom: 18,
  },
};

// Map Viewport Recenter Controller
function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [center, zoom, map]);
  return null;
}

// Marker Icon Creators
function createCustomMarkerIcon(node: GraphNode, isStart: boolean = false, isEnd: boolean = false) {
  let iconHtml = '';
  let size = 26;

  if (isStart) {
    iconHtml = `
      <div style="
        width: 30px;
        height: 30px;
        background: #16a34a;
        border: 2px solid #ffffff;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 0 12px rgba(22, 163, 74, 0.6);
        color: #ffffff;
        font-weight: 800;
        font-size: 11px;
      ">A</div>
    `;
    size = 32;
  } else if (isEnd) {
    iconHtml = `
      <div style="
        width: 30px;
        height: 30px;
        background: #dc2626;
        border: 2px solid #ffffff;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 0 12px rgba(220, 38, 38, 0.6);
        color: #ffffff;
        font-weight: 800;
        font-size: 11px;
      ">B</div>
    `;
    size = 32;
  } else if (node.type === 'depot') {
    iconHtml = `
      <div style="
        width: 26px;
        height: 26px;
        background: #2563eb;
        border: 2px solid #ffffff;
        border-radius: 4px;
        transform: rotate(45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
      ">
        <div style="transform: rotate(-45deg); font-weight: 700; font-size: 8px; color: #ffffff;">DEP</div>
      </div>
    `;
    size = 30;
  } else if (node.type === 'hospital') {
    iconHtml = `
      <div style="
        width: 28px;
        height: 28px;
        background: #059669;
        border: 2px solid #ffffff;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
        font-weight: 800;
        font-size: 14px;
        color: #ffffff;
      ">+</div>
    `;
    size = 30;
  } else {
    iconHtml = `
      <div style="
        width: 18px;
        height: 18px;
        background: #475569;
        border: 1.5px solid #ffffff;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      "></div>
    `;
    size = 20;
  }

  return L.divIcon({
    html: iconHtml,
    className: 'custom-leaflet-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function createVehiclePinIcon(color: string = '#2563eb', label: string = '🚗') {
  return L.divIcon({
    html: `
      <div style="
        width: 32px;
        height: 32px;
        background: #ffffff;
        border: 2px solid ${color};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 3px 8px rgba(0, 0, 0, 0.3);
        font-size: 15px;
      ">${label}</div>
    `,
    className: 'moving-vehicle-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

function createHazardIcon() {
  return L.divIcon({
    html: `
      <div style="
        width: 28px;
        height: 28px;
        background: #dc2626;
        border: 2px solid #ffffff;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 0 12px rgba(220, 38, 38, 0.85);
        color: #ffffff;
        font-size: 13px;
        font-weight: 800;
        cursor: pointer;
      ">⛔</div>
    `,
    className: 'hazard-pin-icon',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

// Function to construct smooth polyline coordinates using waypoint geoPoints
function buildRoutePathGeoPoints(
  pathPolylineNodeIds: string[],
  graph: CityGraph,
  nodeMap: Map<string, GraphNode>
): [number, number][] {
  if (pathPolylineNodeIds.length < 2) return [];

  const points: [number, number][] = [];

  for (let i = 0; i < pathPolylineNodeIds.length - 1; i++) {
    const u = pathPolylineNodeIds[i];
    const v = pathPolylineNodeIds[i + 1];

    const edge = graph.edges.find(e => (e.source === u && e.target === v) || (e.source === v && e.target === u));

    if (edge && edge.geoPoints && edge.geoPoints.length > 0) {
      if (edge.source === u) {
        edge.geoPoints.forEach((pt, pIdx) => {
          if (points.length === 0 || pIdx > 0) {
            points.push([pt[0], pt[1]]);
          }
        });
      } else {
        const reversed = [...edge.geoPoints].reverse();
        reversed.forEach((pt, pIdx) => {
          if (points.length === 0 || pIdx > 0) {
            points.push([pt[0], pt[1]]);
          }
        });
      }
    } else {
      const n1 = nodeMap.get(u);
      const n2 = nodeMap.get(v);
      if (n1 && n2) {
        if (points.length === 0) points.push([n1.lat, n1.lng]);
        points.push([n2.lat, n2.lng]);
      }
    }
  }

  return points;
}

export const RealLeafletMap: React.FC<RealLeafletMapProps> = ({
  graph,
  solution,
  comparisonSolution,
  showComparison = true,
  incidents,
  onAddIncident,
  onRemoveIncident,
  onClearAllIncidents,
}) => {
  const [activeTileKey, setActiveTileKey] = useState<keyof typeof TILE_LAYERS>('osm');
  const [mapMode, setMapMode] = useState<'point_to_point' | 'fleet_vrp'>('point_to_point');

  // Point-to-Point Navigation State
  const [startNodeId, setStartNodeId] = useState<string>(() => graph.nodes[0]?.id || '');
  const [endNodeId, setEndNodeId] = useState<string>(() => graph.nodes[graph.nodes.length - 1]?.id || '');
  const [p2pAlgorithm, setP2pAlgorithm] = useState<'quantum_evasive' | 'classical_shortest'>('quantum_evasive');
  const [isDrivingSim, setIsDrivingSim] = useState<boolean>(false);
  const [tripProgress, setTripProgress] = useState<number>(0);
  const [simSpeed, setSimSpeed] = useState<number>(1);
  const [vehicleCycle, setVehicleCycle] = useState<number>(0);
  const [isGreenChannelActive, setIsGreenChannelActive] = useState<boolean>(false);
  const [selectedEdgeToBlock, setSelectedEdgeToBlock] = useState<string>('');

  // Path Engine instance for custom P2P calculations
  const pathEngine = useMemo(() => new ShortestPathEngine(graph), [graph]);

  // Keep start and end nodes valid when city graph changes
  useEffect(() => {
    if (graph.nodes.length > 0) {
      const depots = graph.nodes.filter(n => n.type === 'depot');
      const customers = graph.nodes.filter(n => n.type === 'customer');
      const allNonDepot = graph.nodes.filter(n => n.type !== 'depot');
      setStartNodeId(depots[0]?.id || graph.nodes[0].id);
      setEndNodeId(customers[0]?.id || allNonDepot[allNonDepot.length - 1]?.id || graph.nodes[graph.nodes.length - 1].id);
      setTripProgress(0);
      setIsDrivingSim(false);
      setIsGreenChannelActive(false);
    }
  }, [graph]);

  // Fleet animation ticker
  useEffect(() => {
    let animId: number;
    const updatePulse = () => {
      setVehicleCycle(prev => (prev + 0.003) % 1);
      animId = requestAnimationFrame(updatePulse);
    };
    animId = requestAnimationFrame(updatePulse);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Trip simulation driving ticker
  useEffect(() => {
    let timer: any;
    if (isDrivingSim) {
      timer = setInterval(() => {
        setTripProgress(prev => {
          if (prev >= 1) {
            setIsDrivingSim(false);
            sounds.playConvergenceChime();
            return 1;
          }
          return prev + 0.006 * simSpeed;
        });
      }, 50);
    }
    return () => clearInterval(timer);
  }, [isDrivingSim, simSpeed]);

  const nodeMap = useMemo(() => {
    const map = new Map<string, GraphNode>();
    graph.nodes.forEach(n => map.set(n.id, n));
    return map;
  }, [graph]);

  // Compute Active Point-to-Point Route
  const p2pRoute = useMemo(() => {
    if (!startNodeId || !endNodeId || startNodeId === endNodeId) return null;
    return pathEngine.findPointToPointPath(startNodeId, endNodeId, p2pAlgorithm);
  }, [pathEngine, startNodeId, endNodeId, p2pAlgorithm, incidents]);

  // Compute Classical Comparison Route for P2P
  const p2pClassicalRoute = useMemo(() => {
    if (!startNodeId || !endNodeId || startNodeId === endNodeId) return null;
    return pathEngine.findPointToPointPath(startNodeId, endNodeId, 'classical_shortest');
  }, [pathEngine, startNodeId, endNodeId, incidents]);

  // Build GeoPoints for P2P Route
  const p2pGeoPoints = useMemo(() => {
    if (!p2pRoute) return [];
    return buildRoutePathGeoPoints(p2pRoute.pathNodeIds, graph, nodeMap);
  }, [p2pRoute, graph, nodeMap]);

  const p2pClassicalGeoPoints = useMemo(() => {
    if (!p2pClassicalRoute) return [];
    return buildRoutePathGeoPoints(p2pClassicalRoute.pathNodeIds, graph, nodeMap);
  }, [p2pClassicalRoute, graph, nodeMap]);

  // Compute Vehicle Current Lat/Lng along P2P Route
  const currentTripVehiclePos = useMemo<[number, number] | null>(() => {
    if (p2pGeoPoints.length < 2) return null;
    const totalSegs = p2pGeoPoints.length - 1;
    const floatIdx = Math.min(0.9999, Math.max(0, tripProgress)) * totalSegs;
    const segIdx = Math.floor(floatIdx);
    const frac = floatIdx - segIdx;
    const p1 = p2pGeoPoints[segIdx];
    const p2 = p2pGeoPoints[Math.min(totalSegs, segIdx + 1)];
    if (!p1 || !p2) return p2pGeoPoints[0];
    return [p1[0] + (p2[0] - p1[0]) * frac, p1[1] + (p2[1] - p1[1]) * frac];
  }, [p2pGeoPoints, tripProgress]);

  const routeColors = ['#2563eb', '#059669', '#d97706', '#7c3aed', '#dc2626'];
  const hospitalCount = graph.nodes.filter(n => n.type === 'hospital').length;

  const handleSwapPoints = () => {
    const temp = startNodeId;
    setStartNodeId(endNodeId);
    setEndNodeId(temp);
    setTripProgress(0);
    sounds.playQuantumPulse(520);
  };

  const handleBlockRouteAhead = () => {
    if (!p2pRoute || p2pRoute.pathNodeIds.length < 2) return;
    for (let i = 0; i < p2pRoute.pathNodeIds.length - 1; i++) {
      const u = p2pRoute.pathNodeIds[i];
      const v = p2pRoute.pathNodeIds[i + 1];
      const edge = graph.edges.find(e => (e.source === u && e.target === v) || (e.source === v && e.target === u));
      if (edge && !edge.isClosed && !incidents.some(inc => inc.edgeId === edge.id)) {
        onAddIncident(edge.id, 'accident');
        sounds.playIncidentAlert();
        return;
      }
    }
  };

  const handleToggleEdgeBlock = (edgeId: string) => {
    const existing = incidents.find(inc => inc.edgeId === edgeId);
    if (existing && onRemoveIncident) {
      onRemoveIncident(existing.id);
    } else {
      onAddIncident(edgeId, 'accident');
      sounds.playIncidentAlert();
    }
  };

  const handleToggleGreenCorridor = () => {
    const nextState = !isGreenChannelActive;
    setIsGreenChannelActive(nextState);
    sounds.playQuantumPulse(nextState ? 650 : 400);

    if (nextState) {
      // Find hospital node in the current city
      const hospital = graph.nodes.find(n => n.type === 'hospital');
      if (hospital) {
        // If neither start nor end is hospital, route to hospital
        if (startNodeId !== hospital.id && endNodeId !== hospital.id) {
          setEndNodeId(hospital.id);
          setTripProgress(0);
        }
      }
    } else {
      // If turning OFF and end point was hospital, restore standard customer node
      const currentEnd = nodeMap.get(endNodeId);
      if (currentEnd?.type === 'hospital') {
        const regularCustomer = graph.nodes.find(n => n.type === 'customer' && n.id !== startNodeId);
        if (regularCustomer) {
          setEndNodeId(regularCustomer.id);
          setTripProgress(0);
        }
      }
    }
  };

  return (
    <div className="map-view map-view-real" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      
      {/* 1. TOP INTERACTIVE NAVIGATION & CONTROLS DOCK */}
      <div className="glass-panel" style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        
        {/* Row 1: Mode Switcher & City Info */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Navigation size={16} color="var(--primary)" /> Routing Mode:
            </span>
            <div style={{ display: 'flex', background: 'var(--bg-primary)', padding: 3, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              <button
                onClick={() => { setMapMode('point_to_point'); sounds.playQuantumPulse(500); }}
                style={{
                  padding: '4px 10px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: mapMode === 'point_to_point' ? 'var(--primary)' : 'transparent',
                  color: mapMode === 'point_to_point' ? '#ffffff' : 'var(--text-muted)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                📍 Point-to-Point Trip (A → B)
              </button>
              <button
                onClick={() => { setMapMode('fleet_vrp'); sounds.playQuantumPulse(500); }}
                style={{
                  padding: '4px 10px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: mapMode === 'fleet_vrp' ? 'var(--primary)' : 'transparent',
                  color: mapMode === 'fleet_vrp' ? '#ffffff' : 'var(--text-muted)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                🚚 Full Multi-Depot Fleet Dispatch
              </button>
            </div>
          </div>

          {/* Quick Layer & Emergency Toggles */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {hospitalCount > 0 && (
              <button
                onClick={handleToggleGreenCorridor}
                style={{
                  padding: '4px 8px',
                  fontSize: '0.72rem',
                  borderRadius: 'var(--radius-sm)',
                  border: isGreenChannelActive ? '1px solid #10b981' : '1px solid var(--border-subtle)',
                  background: isGreenChannelActive ? '#dcfce7' : 'var(--bg-card)',
                  color: isGreenChannelActive ? '#15803d' : 'var(--text-muted)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <Ambulance size={13} color={isGreenChannelActive ? '#15803d' : 'var(--text-muted)'} />
                {isGreenChannelActive ? 'Green Corridor: ON' : 'Green Corridor: OFF'}
              </button>
            )}

            {/* Tile Switcher */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Layers size={13} color="var(--text-muted)" />
              {(Object.keys(TILE_LAYERS) as Array<keyof typeof TILE_LAYERS>).map(key => (
                <button
                  key={key}
                  onClick={() => setActiveTileKey(key)}
                  className={`btn ${activeTileKey === key ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '3px 7px', fontSize: '0.7rem' }}
                >
                  {key.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Row 2: Point-to-Point Trip Planner Bar (When in A -> B mode) */}
        {mapMode === 'point_to_point' && (
          <div style={{
            background: 'var(--bg-secondary)',
            padding: '10px 12px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              
              {/* Start Point (A) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 220 }}>
                <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#16a34a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>A</span>
                <select
                  value={startNodeId}
                  onChange={e => { setStartNodeId(e.target.value); setTripProgress(0); }}
                  style={{ width: '100%', padding: '6px 8px', fontSize: '0.8rem', fontWeight: 500 }}
                >
                  <optgroup label="Select Starting Point (Origin)">
                    {graph.nodes.map(n => (
                      <option key={`start_${n.id}`} value={n.id}>
                        {n.type === 'depot' ? '🏢 [Depot] ' : n.type === 'hospital' ? '🏥 [Hospital] ' : '📍 '}
                        {n.name}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {/* Swap Button */}
              <button
                onClick={handleSwapPoints}
                className="btn btn-secondary"
                title="Swap Start and Destination"
                style={{ padding: '6px 8px' }}
              >
                <ArrowRightLeft size={14} />
              </button>

              {/* End Point (B) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 220 }}>
                <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#dc2626', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>B</span>
                <select
                  value={endNodeId}
                  onChange={e => { setEndNodeId(e.target.value); setTripProgress(0); }}
                  style={{ width: '100%', padding: '6px 8px', fontSize: '0.8rem', fontWeight: 500 }}
                >
                  <optgroup label="Select Destination (Target)">
                    {graph.nodes.map(n => (
                      <option key={`end_${n.id}`} value={n.id}>
                        {n.type === 'depot' ? '🏢 [Depot] ' : n.type === 'hospital' ? '🏥 [Hospital] ' : '📍 '}
                        {n.name}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {/* Algorithm Switcher */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <button
                  onClick={() => setP2pAlgorithm('quantum_evasive')}
                  style={{
                    padding: '5px 9px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid',
                    borderColor: p2pAlgorithm === 'quantum_evasive' ? '#2563eb' : 'var(--border-subtle)',
                    background: p2pAlgorithm === 'quantum_evasive' ? '#eff6ff' : 'var(--bg-card)',
                    color: p2pAlgorithm === 'quantum_evasive' ? '#1d4ed8' : 'var(--text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  ⚛️ Quantum Evasive
                </button>
                <button
                  onClick={() => setP2pAlgorithm('classical_shortest')}
                  style={{
                    padding: '5px 9px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid',
                    borderColor: p2pAlgorithm === 'classical_shortest' ? '#ea580c' : 'var(--border-subtle)',
                    background: p2pAlgorithm === 'classical_shortest' ? '#fff7ed' : 'var(--bg-card)',
                    color: p2pAlgorithm === 'classical_shortest' ? '#c2410c' : 'var(--text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  🚗 Classical Direct
                </button>
              </div>

              {/* Driving Simulation Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <button
                  onClick={() => {
                    if (tripProgress >= 1) setTripProgress(0);
                    setIsDrivingSim(!isDrivingSim);
                    sounds.playQuantumPulse(550);
                  }}
                  className={`btn ${isDrivingSim ? 'btn-danger' : 'btn-primary'}`}
                  style={{ padding: '5px 10px', fontSize: '0.78rem' }}
                >
                  {isDrivingSim ? <><Pause size={13} /> Pause Trip</> : <><Play size={13} /> Drive Trip</>}
                </button>
                <button
                  onClick={() => { setIsDrivingSim(false); setTripProgress(0); }}
                  className="btn btn-secondary"
                  title="Reset Trip Position"
                  style={{ padding: '5px 8px' }}
                >
                  <RotateCcw size={13} />
                </button>
                <button
                  onClick={() => setSimSpeed(s => (s === 1 ? 2 : s === 2 ? 4 : 1))}
                  className="btn btn-secondary font-mono"
                  style={{ padding: '5px 8px', fontSize: '0.72rem' }}
                >
                  {simSpeed}x Spd
                </button>
              </div>
            </div>

            {/* Live Trip HUD Stats Strip */}
            {p2pRoute && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: 8,
                paddingTop: 4,
                borderTop: '1px solid var(--border-subtle)',
              }}>
                {isGreenChannelActive && (
                  <div style={{
                    gridColumn: '1 / -1',
                    background: '#dcfce7',
                    border: '1px solid #86efac',
                    color: '#15803d',
                    padding: '6px 12px',
                    borderRadius: 6,
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Ambulance size={16} color="#15803d" />
                      <span>🚨 EMERGENCY GREEN CORRIDOR ACTIVE — Priority Transit to Hospital (Traffic Pre-Empted)</span>
                    </div>
                    <span style={{ fontSize: '0.7rem', background: '#15803d', color: '#fff', padding: '2px 8px', borderRadius: 10 }}>
                      Zero Delay Granted
                    </span>
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem' }}>
                  <Compass size={14} color="#2563eb" />
                  <div>Distance: <strong style={{ color: '#0f172a' }}>{p2pRoute.distanceKm} km</strong></div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem' }}>
                  <Clock size={14} color="#16a34a" />
                  <div>Est. Time: <strong style={{ color: '#0f172a' }}>{isGreenChannelActive ? Math.round(p2pRoute.travelTimeMin * 0.75) : p2pRoute.travelTimeMin} min</strong></div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem' }}>
                  <Flame size={14} color="#d97706" />
                  <div>Delay Factor: <strong style={{ color: isGreenChannelActive ? '#15803d' : '#b45309' }}>{isGreenChannelActive ? '0.0 min (Bypassed)' : `+${p2pRoute.congestionDelayMin} min`}</strong></div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem' }}>
                  <Zap size={14} color="#059669" />
                  <div>Carbon footprint: <strong style={{ color: '#15803d' }}>{p2pRoute.emissionKg} kg CO₂</strong></div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem' }}>
                  <CheckCircle size={14} color="#2563eb" />
                  <div>Waypoints: <strong style={{ color: '#0f172a' }}>{p2pRoute.pathNodeIds.length} Nodes</strong></div>
                </div>
              </div>
            )}

            {/* Live Roadblock & Incident Injector Bar */}
            <div style={{
              background: '#fef2f2',
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid #fecaca',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#991b1b', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <AlertTriangle size={15} color="#dc2626" /> Roadblock Injector:
                  </span>
                  <button
                    onClick={handleBlockRouteAhead}
                    className="btn"
                    title="Block the upcoming road along this route to see real-time quantum detour"
                    style={{
                      background: '#dc2626',
                      color: '#fff',
                      padding: '4px 9px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      borderRadius: 4,
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      cursor: 'pointer',
                    }}
                  >
                    ⚡ Block Route Ahead
                  </button>
                </div>

                {/* Road Dropdown Selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 260 }}>
                  <select
                    value={selectedEdgeToBlock || (graph.edges[0]?.id || '')}
                    onChange={e => setSelectedEdgeToBlock(e.target.value)}
                    style={{ width: '100%', padding: '5px 8px', fontSize: '0.76rem', background: '#fff' }}
                  >
                    <optgroup label="Select Road Link to Block">
                      {graph.edges.map(e => {
                        const n1 = nodeMap.get(e.source);
                        const n2 = nodeMap.get(e.target);
                        const isBlk = e.isClosed || incidents.some(inc => inc.edgeId === e.id);
                        return (
                          <option key={e.id} value={e.id}>
                            {isBlk ? '⛔ [BLOCKED] ' : '🛣️ '}
                            {n1?.name || e.source} ↔ {n2?.name || e.target} ({e.lengthKm} km)
                          </option>
                        );
                      })}
                    </optgroup>
                  </select>

                  <button
                    onClick={() => {
                      const edgeId = selectedEdgeToBlock || graph.edges[0]?.id;
                      if (edgeId) handleToggleEdgeBlock(edgeId);
                    }}
                    className="btn"
                    style={{
                      background: '#b91c1c',
                      color: '#fff',
                      padding: '5px 10px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      borderRadius: 4,
                      border: 'none',
                      whiteSpace: 'nowrap',
                      cursor: 'pointer',
                    }}
                  >
                    🚫 Toggle Block
                  </button>

                  {incidents.length > 0 && onClearAllIncidents && (
                    <button
                      onClick={onClearAllIncidents}
                      className="btn btn-secondary"
                      title="Clear all active roadblocks and restore normal traffic"
                      style={{ padding: '5px 8px', fontSize: '0.75rem', color: '#16a34a', whiteSpace: 'nowrap' }}
                    >
                      🧹 Clear All ({incidents.length})
                    </button>
                  )}
                </div>
              </div>

              {/* Active Roadblocks Badges Strip */}
              {incidents.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', paddingTop: 2 }}>
                  <span style={{ fontSize: '0.72rem', color: '#dc2626', fontWeight: 700 }}>Active Blockades:</span>
                  {incidents.map(inc => {
                    const edge = graph.edges.find(e => e.id === inc.edgeId);
                    const n1 = edge ? nodeMap.get(edge.source) : null;
                    const n2 = edge ? nodeMap.get(edge.target) : null;
                    const label = n1 && n2 ? `${n1.name} ↔ ${n2.name}` : inc.edgeId;
                    return (
                      <span
                        key={inc.id}
                        style={{
                          background: '#fee2e2',
                          border: '1px solid #fca5a5',
                          color: '#991b1b',
                          padding: '2px 8px',
                          borderRadius: 12,
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        ⛔ {label}
                        {onRemoveIncident && (
                          <button
                            onClick={() => onRemoveIncident(inc.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#dc2626',
                              cursor: 'pointer',
                              padding: 0,
                              marginLeft: 4,
                              fontWeight: 800,
                              fontSize: '0.8rem',
                            }}
                            title="Reopen road"
                          >
                            ✕
                          </button>
                        )}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 2. STATS STRIP (When in Fleet Mode) */}
      {mapMode === 'fleet_vrp' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
          gap: 8,
        }}>
          {[
            { label: 'Network Nodes', value: graph.nodes.length, color: '#2563eb' },
            { label: 'Road Links', value: graph.edges.length, color: '#475569' },
            { label: 'Demand Points', value: graph.nodes.filter(n => n.type === 'customer').length, color: '#d97706' },
            { label: 'Hospitals', value: graph.nodes.filter(n => n.type === 'hospital').length, color: '#059669' },
            { label: 'Depots', value: graph.nodes.filter(n => n.type === 'depot').length, color: '#2563eb' },
            ...(solution ? [{ label: 'Total Distance', value: `${solution.totalDistanceKm.toFixed(1)} km`, color: '#2563eb' }] : []),
            ...(solution ? [{ label: 'CO₂ Emission', value: `${solution.totalEmissionKg.toFixed(1)} kg`, color: '#059669' }] : []),
          ].map((s, i) => (
            <div key={i} className="glass-panel" style={{
              padding: '8px 10px',
              textAlign: 'center',
              borderRadius: 'var(--radius-sm)',
            }}>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: s.color, fontFamily: 'var(--font-mono)' }}>{s.value}</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2, fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* 3. MAIN LEAFLET MAP CONTAINER */}
      <div className="map-stage" style={{ height: 600, width: '100%', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border-subtle)', position: 'relative' }}>
        <MapContainer
          center={graph.center}
          zoom={graph.zoom}
          style={{ height: '100%', width: '100%', background: '#e2e8f0' }}
          zoomControl={true}
        >
          <MapController center={graph.center} zoom={graph.zoom} />

          <TileLayer
            key={activeTileKey}
            url={TILE_LAYERS[activeTileKey].url}
            attribution={TILE_LAYERS[activeTileKey].attribution}
            maxZoom={(TILE_LAYERS[activeTileKey] as any).maxZoom ?? 19}
          />

          {/* 3.1 Road Network Edges */}
          {graph.edges.map(edge => {
            const n1 = nodeMap.get(edge.source);
            const n2 = nodeMap.get(edge.target);
            if (!n1 || !n2) return null;

            const positions: [number, number][] =
              edge.geoPoints && edge.geoPoints.length > 0
                ? (edge.geoPoints.map(p => [p[0], p[1]]) as [number, number][])
                : [[n1.lat, n1.lng], [n2.lat, n2.lng]];

            const isBlocked = edge.isClosed || incidents.some(inc => inc.edgeId === edge.id);
            const incident = incidents.find(inc => inc.edgeId === edge.id);

            let color = 'rgba(100, 116, 139, 0.45)';
            let weight = 2.5;

            if (isBlocked) {
              color = '#dc2626';
              weight = 4.5;
            } else if (edge.congestionFactor > 2.0) {
              color = '#f43f5e';
              weight = 3.5;
            } else if (edge.congestionFactor > 1.3) {
              color = '#f59e0b';
              weight = 3;
            }

            const midLat = (n1.lat + n2.lat) / 2;
            const midLng = (n1.lng + n2.lng) / 2;

            return (
              <React.Fragment key={edge.id}>
                {/* Wide invisible click-target hitbox for effortless mouse clicking */}
                <Polyline
                  positions={positions}
                  pathOptions={{
                    color: 'transparent',
                    weight: 22,
                    opacity: 0,
                  }}
                >
                  <Popup>
                    <div style={{ padding: 6, fontFamily: 'sans-serif', minWidth: 200 }}>
                      <h4 style={{ margin: 0, fontWeight: 700, color: '#0f172a', fontSize: '13px' }}>
                        🛣️ Road: {n1.name} ↔ {n2.name}
                      </h4>
                      <div style={{ margin: '6px 0', fontSize: '12px', color: '#475569' }}>
                        Length: <strong>{edge.lengthKm} km</strong> | Speed: <strong>{edge.currentSpeedKmh} km/h</strong><br />
                        Congestion: <strong>{edge.congestionFactor.toFixed(2)}x</strong><br />
                        Status:{' '}
                        <strong style={{ color: isBlocked ? '#dc2626' : '#16a34a' }}>
                          {isBlocked ? '⛔ BLOCKED ROAD' : '🟢 OPEN & CLEAR'}
                        </strong>
                      </div>

                      {isBlocked ? (
                        <button
                          onClick={() => {
                            if (incident && onRemoveIncident) {
                              onRemoveIncident(incident.id);
                            } else {
                              handleToggleEdgeBlock(edge.id);
                            }
                          }}
                          style={{
                            background: '#16a34a',
                            color: '#fff',
                            border: 'none',
                            padding: '6px 10px',
                            borderRadius: 4,
                            cursor: 'pointer',
                            fontSize: '11px',
                            fontWeight: 700,
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 4,
                          }}
                        >
                          🟢 Reopen Road & Clear Incident
                        </button>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <button
                            onClick={() => onAddIncident(edge.id, 'accident')}
                            style={{
                              background: '#dc2626',
                              color: '#fff',
                              border: 'none',
                              padding: '6px 10px',
                              borderRadius: 4,
                              cursor: 'pointer',
                              fontSize: '11px',
                              fontWeight: 700,
                            }}
                          >
                            ⛔ Block Road (Inject Accident)
                          </button>
                          <button
                            onClick={() => onAddIncident(edge.id, 'traffic_surge')}
                            style={{
                              background: '#d97706',
                              color: '#fff',
                              border: 'none',
                              padding: '4px 8px',
                              borderRadius: 4,
                              cursor: 'pointer',
                              fontSize: '11px',
                              fontWeight: 600,
                            }}
                          >
                            ⚠️ Inject Heavy Traffic Jam (+3.5x)
                          </button>
                        </div>
                      )}
                    </div>
                  </Popup>
                </Polyline>

                {/* Visible styled polyline */}
                <Polyline
                  positions={positions}
                  pathOptions={{
                    color,
                    weight,
                    dashArray: isBlocked ? '8, 6' : undefined,
                    opacity: isBlocked ? 0.95 : 0.8,
                  }}
                />

                {/* Hazard Marker at midpoint when blocked */}
                {isBlocked && (
                  <Marker
                    position={[midLat, midLng]}
                    icon={createHazardIcon()}
                  >
                    <Popup>
                      <div style={{ padding: 6, fontFamily: 'sans-serif' }}>
                        <strong style={{ color: '#dc2626', fontSize: '12px' }}>⛔ ROAD CLOSED</strong>
                        <p style={{ margin: '4px 0', fontSize: '11px' }}>
                          {n1.name} ↔ {n2.name}<br />
                          Quantum engine automatically reroutes vehicles around this blockage.
                        </p>
                        {onRemoveIncident && incident && (
                          <button
                            onClick={() => onRemoveIncident(incident.id)}
                            style={{
                              background: '#16a34a',
                              color: '#fff',
                              border: 'none',
                              padding: '4px 8px',
                              borderRadius: 4,
                              cursor: 'pointer',
                              fontSize: '11px',
                              fontWeight: 700,
                              marginTop: 4,
                            }}
                          >
                            🟢 Reopen Road
                          </button>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                )}
              </React.Fragment>
            );
          })}

          {/* 3.2 Point-to-Point Mode Routes */}
          {mapMode === 'point_to_point' && (
            <>
              {/* Classical Comparison Path (Dashed Rose) */}
              {p2pAlgorithm === 'quantum_evasive' && p2pClassicalGeoPoints.length > 1 && (
                <Polyline
                  positions={p2pClassicalGeoPoints}
                  pathOptions={{
                    color: '#f43f5e',
                    weight: 3.5,
                    dashArray: '6, 6',
                    opacity: 0.6,
                  }}
                />
              )}

              {/* Active Selected Path (Thick Solid Blue / Emerald) */}
              {p2pGeoPoints.length > 1 && (
                <Polyline
                  positions={p2pGeoPoints}
                  pathOptions={{
                    color: isGreenChannelActive
                      ? '#16a34a'
                      : p2pAlgorithm === 'quantum_evasive'
                      ? '#2563eb'
                      : '#ea580c',
                    weight: isGreenChannelActive ? 6.5 : 5.5,
                    opacity: 0.95,
                  }}
                />
              )}

              {/* Moving Vehicle on Point-to-Point Path */}
              {currentTripVehiclePos && (
                <Marker
                  position={currentTripVehiclePos}
                  icon={createVehiclePinIcon(
                    isGreenChannelActive
                      ? '#16a34a'
                      : p2pAlgorithm === 'quantum_evasive'
                      ? '#2563eb'
                      : '#ea580c',
                    isGreenChannelActive ? '🚑' : '🚗'
                  )}
                >
                  <Popup>
                    <div style={{ fontSize: '12px' }}>
                      <strong>{isGreenChannelActive ? '🚑 Emergency Green Corridor Ambulance' : 'Active Trip Vehicle'}</strong><br />
                      Trip Progress: {Math.round(tripProgress * 100)}%
                    </div>
                  </Popup>
                </Marker>
              )}
            </>
          )}

          {/* 3.3 Multi-Depot Fleet Mode Routes */}
          {mapMode === 'fleet_vrp' && (
            <>
              {showComparison && comparisonSolution && comparisonSolution.routes.map((route, rIdx) => {
                const positions = buildRoutePathGeoPoints(route.pathPolylineNodeIds, graph, nodeMap);
                if (positions.length < 2) return null;
                return (
                  <Polyline
                    key={`comp_route_${rIdx}`}
                    positions={positions}
                    pathOptions={{ color: '#f43f5e', weight: 4, opacity: 0.5, dashArray: '8, 8' }}
                  />
                );
              })}

              {solution && solution.routes.map((route, rIdx) => {
                const positions = buildRoutePathGeoPoints(route.pathPolylineNodeIds, graph, nodeMap);
                if (positions.length < 2) return null;
                const isEmergency = isGreenChannelActive && route.pathPolylineNodeIds.some(id => nodeMap.get(id)?.type === 'hospital');
                const color = isEmergency ? '#16a34a' : routeColors[rIdx % routeColors.length];

                return (
                  <React.Fragment key={`sol_route_${rIdx}`}>
                    <Polyline positions={positions} pathOptions={{ color, weight: 4.5, opacity: 0.85 }} />
                  </React.Fragment>
                );
              })}
            </>
          )}

          {/* 3.4 All Graph Landmark & Destination Nodes */}
          {graph.nodes.map(node => {
            const isStart = mapMode === 'point_to_point' && node.id === startNodeId;
            const isEnd = mapMode === 'point_to_point' && node.id === endNodeId;

            return (
              <Marker
                key={node.id}
                position={[node.lat, node.lng]}
                icon={createCustomMarkerIcon(node, isStart, isEnd)}
              >
                <Popup>
                  <div style={{ padding: 4, fontFamily: 'sans-serif', minWidth: 160 }}>
                    <strong style={{ fontSize: '13px', color: '#0f172a' }}>{node.name}</strong>
                    <div style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 6px' }}>
                      Type: <strong>{node.type.toUpperCase()}</strong> | Demand: {node.demand} kg
                    </div>

                    {/* Interactive Start/End point buttons */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <button
                        onClick={() => {
                          setStartNodeId(node.id);
                          setTripProgress(0);
                          sounds.playQuantumPulse(500);
                        }}
                        style={{
                          background: '#16a34a',
                          color: '#fff',
                          border: 'none',
                          padding: '4px 8px',
                          borderRadius: 4,
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        🟢 Set as Starting Point (A)
                      </button>
                      <button
                        onClick={() => {
                          setEndNodeId(node.id);
                          setTripProgress(0);
                          sounds.playQuantumPulse(500);
                        }}
                        style={{
                          background: '#dc2626',
                          color: '#fff',
                          border: 'none',
                          padding: '4px 8px',
                          borderRadius: 4,
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        🔴 Set as Destination (B)
                      </button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

    </div>
  );
};
