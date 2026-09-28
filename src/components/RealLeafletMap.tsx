import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { CityGraph, GraphNode, TrafficIncident } from '../types/graph';
import { VRPSolution } from '../types/vrp';
import { Layers, MapPin, AlertTriangle, Navigation, Zap, Ambulance } from 'lucide-react';
import { sounds } from '../core/audio/soundEffects';

interface RealLeafletMapProps {
  graph: CityGraph;
  solution: VRPSolution | null;
  comparisonSolution?: VRPSolution | null;
  comparisonName?: string;
  showComparison?: boolean;
  incidents: TrafficIncident[];
  onAddIncident: (edgeId: string, type: 'accident' | 'construction' | 'traffic_surge') => void;
  simulationTimeMin: number;
}

// Tile Layer definitions - ALL are free, no API key required
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
    attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 20,
  },
  satellite: {
    name: 'Esri Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri - Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    maxZoom: 18,
  },
  topo: {
    name: 'Esri Topo',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri - Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community',
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

// Custom Marker Icon Creator
function createCustomMarkerIcon(node: GraphNode, _isGreenChannel: boolean = false) {
  let iconHtml = '';
  let size = 26;

  if (node.type === 'depot') {
    iconHtml = `
      <div style="
        width: 26px;
        height: 26px;
        background: #0284c7;
        border: 2px solid #ffffff;
        border-radius: 4px;
        transform: rotate(45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
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
        background: #10b981;
        border: 2px solid #ffffff;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
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
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
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

// Traffic signal beacon icon for preempted intersections
function createSignalPreemptionIcon() {
  return L.divIcon({
    html: `
      <div style="
        width: 16px;
        height: 16px;
        background: #10b981;
        border: 2px solid #ffffff;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 0 8px #10b981;
      "></div>
    `,
    className: 'signal-beacon-marker',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
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

    // Find the matching edge in the graph
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
}) => {
  const [activeTileKey, setActiveTileKey] = useState<keyof typeof TILE_LAYERS>('osm');
  const [vehicleCycle, setVehicleCycle] = useState<number>(0);

  // Animation ticker for moving vehicle pulses on real roads
  useEffect(() => {
    let animId: number;
    const updatePulse = () => {
      setVehicleCycle(prev => (prev + 0.003) % 1);
      animId = requestAnimationFrame(updatePulse);
    };
    animId = requestAnimationFrame(updatePulse);
    return () => cancelAnimationFrame(animId);
  }, []);

  const nodeMap = new Map<string, GraphNode>();
  graph.nodes.forEach(n => nodeMap.set(n.id, n));

  const routeColors = ['#0284c7', '#38bdf8', '#10b981', '#f59e0b', '#ef4444'];
  const [isGreenChannelActive, setIsGreenChannelActive] = useState<boolean>(true);

  // Check if route serves a hospital (Green Channel Priority)
  const isHospitalRoute = (route: { pathPolylineNodeIds: string[] }) => {
    return route.pathPolylineNodeIds.some(id => nodeMap.get(id)?.type === 'hospital');
  };

  const hospitalCount = graph.nodes.filter(n => n.type === 'hospital').length;

  return (
    <div className="map-view map-view-real" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Real Map Top Control Bar */}
      <div className="map-toolbar" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        padding: '8px 14px',
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border-subtle)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <MapPin size={15} color="var(--accent-sky)" />
          <strong style={{ color: 'var(--text-main)', fontSize: '0.85rem' }}>{graph.name}</strong>
          <span className="badge badge-cyan" style={{ fontSize: '0.68rem' }}>{graph.country}</span>
          {solution && (
            <span className="badge badge-cyan" style={{ fontSize: '0.68rem' }}>
              <Navigation size={10} /> {solution.routes.length} Active Routes
            </span>
          )}
          {incidents.length > 0 && (
            <span className="badge badge-rose" style={{ fontSize: '0.68rem' }}>
              <AlertTriangle size={10} /> {incidents.length} Incident{incidents.length !== 1 ? 's' : ''}
            </span>
          )}
          {isGreenChannelActive && hospitalCount > 0 && (
            <span className="badge badge-emerald" style={{ fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Zap size={10} color="#15803d" /> Green Corridor Active
            </span>
          )}
        </div>

        {/* Action Controls: Green Channel Toggle & Tile Layer Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Emergency Green Channel Toggle */}
          <button
            onClick={() => {
              setIsGreenChannelActive(!isGreenChannelActive);
              sounds.playQuantumPulse(600);
            }}
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

          {/* Tile Layer Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Layers size={13} color="var(--text-muted)" />
            {(Object.keys(TILE_LAYERS) as Array<keyof typeof TILE_LAYERS>).map(key => (
              <button
                key={key}
                onClick={() => setActiveTileKey(key)}
                className={`btn ${activeTileKey === key ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '3px 7px', fontSize: '0.7rem' }}
              >
                {key === 'osm' ? 'OSM' : key === 'dark' ? 'Dark' : key === 'satellite' ? 'Satellite' : 'Topo'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Live Stats Strip */}
      <div className="map-metrics" style={{
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
          <div key={i} className="glass-panel map-metric-card" style={{
            padding: '8px 10px',
            textAlign: 'center',
            borderRadius: 'var(--radius-sm)',
          }}>
            <div className="map-metric-value" style={{ fontSize: '0.95rem', fontWeight: 700, color: s.color, fontFamily: 'var(--font-mono)' }}>{s.value}</div>
            <div className="map-metric-label" style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2, fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Main Leaflet Map Container */}
      <div className="map-stage">
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

          {/* 1. Draw Real Road Network Edges with Live Congestion */}
          {graph.edges.map(edge => {
            const n1 = nodeMap.get(edge.source);
            const n2 = nodeMap.get(edge.target);
            if (!n1 || !n2) return null;

            const positions: [number, number][] =
              edge.geoPoints && edge.geoPoints.length > 0
                ? (edge.geoPoints.map(p => [p[0], p[1]]) as [number, number][])
                : [[n1.lat, n1.lng], [n2.lat, n2.lng]];

            let color = 'rgba(100, 116, 139, 0.45)';
            let weight = 2.5;

            if (edge.isClosed) {
              color = '#ef4444';
              weight = 4;
            } else if (edge.congestionFactor > 2.0) {
              color = '#f43f5e';
              weight = 3.5;
            } else if (edge.congestionFactor > 1.3) {
              color = '#f59e0b';
              weight = 3;
            }

            return (
              <Polyline
                key={edge.id}
                positions={positions}
                pathOptions={{
                  color,
                  weight,
                  dashArray: edge.isClosed ? '6, 6' : undefined,
                  opacity: 0.8,
                }}
              >
                <Popup>
                  <div style={{ padding: 4, fontFamily: 'sans-serif' }}>
                    <h4 style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>Road Segment</h4>
                    <p style={{ margin: '4px 0', fontSize: '12px' }}>
                      Length: <strong>{edge.lengthKm} km</strong><br />
                      Current Speed: <strong>{edge.currentSpeedKmh} km/h</strong><br />
                      Congestion Factor: <strong>{edge.congestionFactor.toFixed(2)}x</strong><br />
                      Status: <strong style={{ color: edge.isClosed ? '#ff0055' : '#10b981' }}>{edge.isClosed ? 'CLOSED' : 'OPEN'}</strong>
                    </p>
                    <button
                      onClick={() => onAddIncident(edge.id, 'accident')}
                      style={{
                        background: '#ef4444',
                        color: '#fff',
                        border: 'none',
                        padding: '4px 8px',
                        borderRadius: 4,
                        cursor: 'pointer',
                        fontSize: '11px',
                        fontWeight: 600,
                        marginTop: 4,
                      }}
                    >
                      Block Road Segment
                    </button>
                  </div>
                </Popup>
              </Polyline>
            );
          })}

          {/* 2. Draw Comparison Routes (Classical Baseline in Dashed Red) */}
          {showComparison && comparisonSolution && comparisonSolution.routes.map((route, rIdx) => {
            const positions = buildRoutePathGeoPoints(route.pathPolylineNodeIds, graph, nodeMap);
            if (positions.length < 2) return null;

            return (
              <Polyline
                key={`comp_route_${rIdx}`}
                positions={positions}
                pathOptions={{
                  color: '#f43f5e',
                  weight: 4,
                  opacity: 0.5,
                  dashArray: '8, 8',
                }}
              />
            );
          })}

          {/* 3. Draw Active Solution Routes */}
          {solution && solution.routes.map((route, rIdx) => {
            const positions = buildRoutePathGeoPoints(route.pathPolylineNodeIds, graph, nodeMap);
            if (positions.length < 2) return null;

            const isEmergency = isGreenChannelActive && isHospitalRoute(route);
            const color = isEmergency ? '#10b981' : routeColors[rIdx % routeColors.length];

            const totalSegs = positions.length - 1;
            const floatIdx = ((vehicleCycle + rIdx * 0.25) % 1) * totalSegs;
            const segIdx = Math.floor(floatIdx);
            const frac = floatIdx - segIdx;
            const p1 = positions[segIdx];
            const p2 = positions[Math.min(totalSegs, segIdx + 1)];
            if (!p1 || !p2) return null;

            const vehicleLat = p1[0] + (p2[0] - p1[0]) * frac;
            const vehicleLng = p1[1] + (p2[1] - p1[1]) * frac;

            return (
              <React.Fragment key={`opt_route_${rIdx}`}>
                {/* Outer Pulsating Glow for Emergency Green Channel */}
                {isEmergency && (
                  <Polyline
                    positions={positions}
                    pathOptions={{
                      color: '#00ff88',
                      weight: 10,
                      opacity: 0.35,
                    }}
                  />
                )}

                {/* Main Route Polyline */}
                <Polyline
                  positions={positions}
                  pathOptions={{
                    color,
                    weight: isEmergency ? 6 : 5,
                    opacity: 0.95,
                  }}
                />

                {/* Preempted Green Traffic Signal Beacons along the Green Channel */}
                {isEmergency && route.pathPolylineNodeIds.map((nodeId, nIdx) => {
                  const n = nodeMap.get(nodeId);
                  if (!n || n.type === 'depot' || n.type === 'hospital') return null;
                  return (
                    <Marker
                      key={`signal_r${rIdx}_${nodeId}_${nIdx}`}
                      position={[n.lat, n.lng]}
                      icon={createSignalPreemptionIcon()}
                    >
                      <Popup>
                        <div style={{ padding: 4, fontFamily: 'sans-serif' }}>
                          <strong style={{ color: '#10b981' }}>Adaptive Signal Preemption</strong>
                          <p style={{ margin: '3px 0', fontSize: '11px' }}>
                            Intersection: <strong>{n.name}</strong><br />
                            Signal State: <strong style={{ color: '#10b981' }}>GREEN (Pre-empted)</strong><br />
                            Civilian Queue: <strong>Cleared (0s Delay)</strong>
                          </p>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}

                {/* Animated Vehicle Pulse Marker */}
                <CircleMarker
                  center={[vehicleLat, vehicleLng]}
                  radius={isEmergency ? 10 : 7}
                  pathOptions={{
                    color: isEmergency ? '#00ff88' : '#ffffff',
                    fillColor: color,
                    fillOpacity: 1,
                    weight: isEmergency ? 3 : 2,
                  }}
                >
                  <Popup>
                    <div style={{ padding: 4 }}>
                      <strong>{isEmergency ? 'Emergency Medical Vehicle (Priority 1)' : `Vehicle ${rIdx + 1}`}</strong>
                      <p style={{ margin: '3px 0', fontSize: '12px' }}>
                        Route Distance: <strong>{route.totalDistanceKm} km</strong><br />
                        Est. Time: <strong>{route.totalTimeMin} min</strong><br />
                        Stops: <strong>{route.stops ? route.stops.length : 0} deliveries</strong>
                        {isEmergency && (
                          <>
                            <br />
                            <span style={{ color: '#10b981', fontWeight: 600 }}>Signals Preempted: Zero Junction Delay</span>
                          </>
                        )}
                      </p>
                    </div>
                  </Popup>
                </CircleMarker>
              </React.Fragment>
            );
          })}

          {/* 4. Draw Graph Nodes */}
          {graph.nodes.map(node => (
            <Marker
              key={node.id}
              position={[node.lat, node.lng]}
              icon={createCustomMarkerIcon(node, isGreenChannelActive)}
            >
              <Popup>
                <div style={{ padding: 4, minWidth: 160, fontFamily: 'sans-serif' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{
                      padding: '2px 6px',
                      borderRadius: 3,
                      fontSize: '10px',
                      fontWeight: 700,
                      color: '#ffffff',
                      background: node.type === 'depot' ? '#0284c7' : node.type === 'hospital' ? '#10b981' : '#475569',
                    }}>
                      {node.type.toUpperCase()}
                    </span>
                    <strong style={{ fontSize: '13px', color: '#0f172a' }}>{node.name}</strong>
                  </div>
                  <p style={{ margin: '2px 0', fontSize: '12px', color: '#334155' }}>
                    Demand: <strong>{node.demand} kg</strong><br />
                    Priority: <strong>{node.priority ?? 1}/5</strong>
                    {node.timeWindow && (
                      <>
                        <br />
                        Time Window: <strong>[{node.timeWindow.start}, {node.timeWindow.end}] min</strong>
                      </>
                    )}
                  </p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
};
