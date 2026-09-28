import React, { useRef, useEffect, useState } from 'react';
import { CityGraph, GraphNode, GraphEdge, TrafficIncident } from '../types/graph';
import { VRPSolution } from '../types/vrp';
import { AlertTriangle } from 'lucide-react';

interface CityMapCanvasProps {
  graph: CityGraph;
  solution: VRPSolution | null;
  comparisonSolution?: VRPSolution | null;
  comparisonName?: string;
  showComparison?: boolean;
  incidents: TrafficIncident[];
  onAddIncident: (edgeId: string, type: 'accident' | 'construction' | 'traffic_surge') => void;
  onRemoveIncident: (incidentId: string) => void;
  simulationTimeMin: number;
}

export const CityMapCanvas: React.FC<CityMapCanvasProps> = ({
  graph,
  solution,
  comparisonSolution,
  comparisonName: _comparisonName = 'Baseline PSO',
  showComparison = false,
  incidents,
  onAddIncident,
  onRemoveIncident: _onRemoveIncident,
  simulationTimeMin,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<GraphEdge | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);

  // Animation frame counter for particle flow
  const tickRef = useRef<number>(0);

  useEffect(() => {
    let animationId: number;

    const render = () => {
      tickRef.current += 1;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;

      // Coordinate normalization factors
      const scaleX = width / 1000;
      const scaleY = height / 1000;

      // Clear with clean light slate background
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, width, height);

      // Draw subtle grid
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.04)';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      const nodeMap = new Map<string, GraphNode>();
      graph.nodes.forEach(n => nodeMap.set(n.id, n));

      // 1. Draw Road Edges with Dynamic Congestion Colors
      for (const edge of graph.edges) {
        const n1 = nodeMap.get(edge.source);
        const n2 = nodeMap.get(edge.target);
        if (!n1 || !n2) continue;

        const x1 = n1.x * scaleX;
        const y1 = n1.y * scaleY;
        const x2 = n2.x * scaleX;
        const y2 = n2.y * scaleY;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);

        if (edge.isClosed) {
          ctx.strokeStyle = 'rgba(244, 63, 94, 0.9)';
          ctx.lineWidth = 4;
          ctx.setLineDash([8, 6]);
        } else if (edge.congestionFactor >= 2.5) {
          // Severe congestion: crimson red glow
          ctx.strokeStyle = `rgba(244, 63, 94, ${Math.min(1, 0.5 + (edge.congestionFactor - 2.5) * 0.25)})`;
          ctx.lineWidth = 4;
          ctx.setLineDash([]);
        } else if (edge.congestionFactor >= 1.6) {
          // Moderate congestion: amber/orange
          ctx.strokeStyle = `rgba(245, 158, 11, 0.75)`;
          ctx.lineWidth = 3;
          ctx.setLineDash([]);
        } else {
          // Free flow: cyan / slate road
          ctx.strokeStyle = 'rgba(51, 65, 85, 0.6)';
          ctx.lineWidth = 2.5;
          ctx.setLineDash([]);
        }
        ctx.stroke();
        ctx.setLineDash([]); // reset

        // Flow particles along active edges
        if (!edge.isClosed) {
          const flowSpeed = (edge.currentSpeedKmh / 60) * 0.008;
          const particleOffset = ((tickRef.current * flowSpeed) % 1);
          const px = x1 + (x2 - x1) * particleOffset;
          const py = y1 + (y2 - y1) * particleOffset;

          ctx.beginPath();
          ctx.arc(px, py, edge.congestionFactor > 2.0 ? 3 : 2, 0, Math.PI * 2);
          ctx.fillStyle = edge.congestionFactor > 2.0 ? '#ff0055' : 'rgba(0, 240, 255, 0.7)';
          ctx.fill();
        }
      }

      // 2. Draw Comparison Routes (e.g. Classical PSO baseline in dashed red/amber)
      if (showComparison && comparisonSolution) {
        comparisonSolution.routes.forEach(route => {
          if (route.pathPolylineNodeIds.length < 2) return;
          ctx.beginPath();
          ctx.strokeStyle = 'rgba(244, 63, 94, 0.45)';
          ctx.lineWidth = 4;
          ctx.setLineDash([6, 6]);

          for (let i = 0; i < route.pathPolylineNodeIds.length; i++) {
            const n = nodeMap.get(route.pathPolylineNodeIds[i]);
            if (!n) continue;
            const px = n.x * scaleX;
            const py = n.y * scaleY;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.stroke();
          ctx.setLineDash([]);
        });
      }

      // 3. Draw Active Solution Routes (QPSO Quantum Optimized in Glowing Cyan / Violet ribbons)
      const routeColors = ['#00f0ff', '#a855f7', '#10b981', '#f59e0b', '#3b82f6'];

      if (solution) {
        solution.routes.forEach((route, rIdx) => {
          if (route.pathPolylineNodeIds.length < 2) return;

          const color = routeColors[rIdx % routeColors.length];

          // Outer Glow
          ctx.beginPath();
          ctx.strokeStyle = color;
          ctx.lineWidth = 5;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.shadowColor = color;
          ctx.shadowBlur = 12;

          for (let i = 0; i < route.pathPolylineNodeIds.length; i++) {
            const n = nodeMap.get(route.pathPolylineNodeIds[i]);
            if (!n) continue;
            const px = n.x * scaleX;
            const py = n.y * scaleY;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.stroke();
          ctx.shadowBlur = 0; // reset

          // Inner bright core line
          ctx.beginPath();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.8;
          for (let i = 0; i < route.pathPolylineNodeIds.length; i++) {
            const n = nodeMap.get(route.pathPolylineNodeIds[i]);
            if (!n) continue;
            const px = n.x * scaleX;
            const py = n.y * scaleY;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.stroke();

          // Animate Delivery Vehicle along the route
          const totalPoints = route.pathPolylineNodeIds.length;
          if (totalPoints > 1) {
            const cycle = ((tickRef.current * 0.008 + rIdx * 0.3) % 1);
            const floatIdx = cycle * (totalPoints - 1);
            const pIdx1 = Math.floor(floatIdx);
            const pIdx2 = Math.min(totalPoints - 1, pIdx1 + 1);
            const segFrac = floatIdx - pIdx1;

            const nA = nodeMap.get(route.pathPolylineNodeIds[pIdx1]);
            const nB = nodeMap.get(route.pathPolylineNodeIds[pIdx2]);

            if (nA && nB) {
              const vx = (nA.x + (nB.x - nA.x) * segFrac) * scaleX;
              const vy = (nA.y + (nB.y - nA.y) * segFrac) * scaleY;

              // Vehicle Halo
              ctx.beginPath();
              ctx.arc(vx, vy, 8, 0, Math.PI * 2);
              ctx.fillStyle = color;
              ctx.shadowColor = color;
              ctx.shadowBlur = 16;
              ctx.fill();
              ctx.shadowBlur = 0;

              // Vehicle Core Icon
              ctx.beginPath();
              ctx.arc(vx, vy, 5, 0, Math.PI * 2);
              ctx.fillStyle = '#ffffff';
              ctx.fill();

              // Route stop sequence numbers
              route.stops.forEach((stop, sIdx) => {
                const sn = nodeMap.get(stop.nodeId);
                if (sn) {
                  const sx = sn.x * scaleX;
                  const sy = sn.y * scaleY;
                  ctx.fillStyle = color;
                  ctx.font = 'bold 11px Outfit, sans-serif';
                  ctx.fillText(`${rIdx + 1}.${sIdx + 1}`, sx + 12, sy - 8);
                }
              });
            }
          }
        });
      }

      // 4. Draw Graph Nodes
      for (const node of graph.nodes) {
        const nx = node.x * scaleX;
        const ny = node.y * scaleY;
        const isHovered = hoveredNode?.id === node.id;
        const isSelected = selectedNode?.id === node.id;

        if (node.type === 'depot') {
          // Diamond shape for Logistics Depots
          const size = isHovered || isSelected ? 18 : 14;
          ctx.save();
          ctx.translate(nx, ny);
          ctx.rotate(Math.PI / 4);
          ctx.fillStyle = '#00f0ff';
          ctx.shadowColor = '#00f0ff';
          ctx.shadowBlur = isSelected ? 20 : 10;
          ctx.fillRect(-size / 2, -size / 2, size, size);
          ctx.restore();

          ctx.fillStyle = '#040915';
          ctx.font = 'bold 9px Outfit, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('HUB', nx, ny);
        } else if (node.type === 'hospital') {
          // Hospital / Priority Node
          const radius = isHovered || isSelected ? 16 : 13;
          ctx.beginPath();
          ctx.arc(nx, ny, radius, 0, Math.PI * 2);
          ctx.fillStyle = '#10b981';
          ctx.shadowColor = '#10b981';
          ctx.shadowBlur = 12;
          ctx.fill();
          ctx.shadowBlur = 0;

          // Cross icon
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(nx - 2, ny - 6, 4, 12);
          ctx.fillRect(nx - 6, ny - 2, 12, 4);
        } else if (node.type === 'intersection') {
          // Small intersection hub
          ctx.beginPath();
          ctx.arc(nx, ny, 6, 0, Math.PI * 2);
          ctx.fillStyle = '#475569';
          ctx.fill();
        } else {
          // Customer Delivery Node
          const radius = isHovered || isSelected ? 14 : 10;
          ctx.beginPath();
          ctx.arc(nx, ny, radius, 0, Math.PI * 2);
          ctx.fillStyle = '#a855f7';
          ctx.shadowColor = '#a855f7';
          ctx.shadowBlur = isSelected ? 15 : 6;
          ctx.fill();
          ctx.shadowBlur = 0;

          // Inner dot
          ctx.beginPath();
          ctx.arc(nx, ny, 4, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
        }

        // Node Label
        ctx.font = '500 11px Outfit, sans-serif';
        ctx.fillStyle = isSelected ? '#00f0ff' : isHovered ? '#ffffff' : '#94a3b8';
        ctx.textAlign = 'center';
        ctx.fillText(node.name, nx, ny + (node.type === 'depot' ? 20 : 18));
      }

      // 5. Draw Incidents (Pulsing Hazard Warning)
      for (const inc of incidents) {
        const edge = graph.edges.find(e => e.id === inc.edgeId);
        if (!edge) continue;
        const n1 = nodeMap.get(edge.source);
        const n2 = nodeMap.get(edge.target);
        if (!n1 || !n2) continue;

        const mx = ((n1.x + n2.x) / 2) * scaleX;
        const my = ((n1.y + n2.y) / 2) * scaleY;

        // Pulse ring
        const pulse = (Math.sin(tickRef.current * 0.1) + 1) * 6;
        ctx.beginPath();
        ctx.arc(mx, my, 14 + pulse, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(244, 63, 94, 0.6)';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(mx, my, 12, 0, Math.PI * 2);
        ctx.fillStyle = '#ff0055';
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('!', mx, my);
      }

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [graph, solution, comparisonSolution, showComparison, incidents, hoveredNode, selectedNode]);

  // Handle Canvas Click to select node or inject incident
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 1000;
    const clickY = ((e.clientY - rect.top) / rect.height) * 1000;

    // Find clicked node
    let clickedNode: GraphNode | null = null;
    for (const node of graph.nodes) {
      const dist = Math.hypot(node.x - clickX, node.y - clickY);
      if (dist <= 25) {
        clickedNode = node;
        break;
      }
    }

    if (clickedNode) {
      setSelectedNode(clickedNode);
      setSelectedEdge(null);
      return;
    }

    // Find clicked edge
    let clickedEdge: GraphEdge | null = null;
    const nodeMap = new Map(graph.nodes.map(n => [n.id, n]));

    for (const edge of graph.edges) {
      const n1 = nodeMap.get(edge.source);
      const n2 = nodeMap.get(edge.target);
      if (!n1 || !n2) continue;

      const distToSegment = getDistanceToLineSegment(clickX, clickY, n1.x, n1.y, n2.x, n2.y);
      if (distToSegment <= 15) {
        clickedEdge = edge;
        break;
      }
    }

    if (clickedEdge) {
      setSelectedEdge(clickedEdge);
      setSelectedNode(null);
    } else {
      setSelectedNode(null);
      setSelectedEdge(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * 1000;
    const mouseY = ((e.clientY - rect.top) / rect.height) * 1000;

    for (const node of graph.nodes) {
      if (Math.hypot(node.x - mouseX, node.y - mouseY) <= 20) {
        setHoveredNode(node);
        return;
      }
    }
    setHoveredNode(null);
  };

  return (
    <div className="map-view map-view-canvas" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Canvas Header & Legend Bar */}
      <div className="map-toolbar" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        padding: '8px 16px',
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border-subtle)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem' }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: '#0284c7', transform: 'rotate(45deg)', display: 'inline-block' }} />
            <span style={{ color: 'var(--text-muted)' }}>Depot Hub</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#0284c7', display: 'inline-block' }} />
            <span style={{ color: 'var(--text-muted)' }}>Customer Node</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#059669', display: 'inline-block' }} />
            <span style={{ color: 'var(--text-muted)' }}>Hospital Priority</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem' }}>
            <span style={{ width: 16, height: 3, background: 'linear-gradient(to right, #0284c7, #dc2626)', display: 'inline-block', borderRadius: 2 }} />
            <span style={{ color: 'var(--text-muted)' }}>Congestion Indicator</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.8rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>Simulation Time:</span>
          <span className="font-mono badge badge-cyan">
            T+{Math.floor(simulationTimeMin)} min
          </span>
          {incidents.length > 0 && (
            <span className="badge badge-rose">
              <AlertTriangle size={12} /> {incidents.length} Active Incidents
            </span>
          )}
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="map-stage map-stage-canvas">
        <canvas
          ref={canvasRef}
          width={1000}
          height={680}
          onClick={handleCanvasClick}
          onMouseMove={handleMouseMove}
          style={{ width: '100%', height: '100%', cursor: 'crosshair', display: 'block' }}
        />

        {/* Floating Quick Action / Selected Node Overlay */}
        {selectedNode && (
          <div className="glass-panel" style={{
            position: 'absolute',
            bottom: 16,
            left: 16,
            padding: 16,
            width: 320,
            zIndex: 10,
            border: '1px solid var(--border-strong)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>{selectedNode.name}</h4>
              <span className="badge badge-cyan">{selectedNode.type}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 12 }}>
              <div>Demand: <strong style={{ color: 'var(--text-main)' }}>{selectedNode.demand} kg</strong></div>
              <div>Priority: <strong style={{ color: 'var(--text-main)' }}>{selectedNode.priority || 1}/5</strong></div>
              {selectedNode.timeWindow && (
                <div style={{ gridColumn: 'span 2' }}>
                  Time Window: <strong style={{ color: 'var(--text-main)' }}>[{selectedNode.timeWindow.start} - {selectedNode.timeWindow.end} min]</strong>
                </div>
              )}
            </div>
            <button onClick={() => setSelectedNode(null)} className="btn btn-secondary" style={{ width: '100%', padding: '4px 8px', fontSize: '0.75rem' }}>
              Close Inspector
            </button>
          </div>
        )}

        {/* Selected Edge Incident Injector */}
        {selectedEdge && (
          <div className="glass-panel" style={{
            position: 'absolute',
            bottom: 16,
            left: 16,
            padding: 16,
            width: 340,
            zIndex: 10,
            border: '1px solid var(--accent-amber)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent-amber)' }}>Road Segment Controls</h4>
              <span className="badge badge-amber">{selectedEdge.id}</span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <div>Length: <strong style={{ color: 'var(--text-main)' }}>{selectedEdge.lengthKm} km</strong></div>
              <div>Speed: <strong style={{ color: 'var(--text-main)' }}>{selectedEdge.currentSpeedKmh} km/h</strong></div>
              <div>Congestion: <strong style={{ color: 'var(--text-main)' }}>{selectedEdge.congestionFactor.toFixed(2)}x</strong></div>
              <div>Status: <strong style={{ color: selectedEdge.isClosed ? '#dc2626' : '#059669' }}>{selectedEdge.isClosed ? 'CLOSED' : 'OPEN'}</strong></div>
            </div>

            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => {
                  onAddIncident(selectedEdge.id, 'accident');
                  setSelectedEdge(null);
                }}
                className="btn btn-danger"
                style={{ flex: 1, padding: '6px 8px', fontSize: '0.75rem' }}
              >
                Block Segment
              </button>
              <button
                onClick={() => {
                  onAddIncident(selectedEdge.id, 'traffic_surge');
                  setSelectedEdge(null);
                }}
                className="btn btn-secondary"
                style={{ flex: 1, padding: '6px 8px', fontSize: '0.75rem', borderColor: 'var(--accent-amber)', color: 'var(--accent-amber)' }}
              >
                Traffic Surge
              </button>
              <button
                onClick={() => setSelectedEdge(null)}
                className="btn btn-secondary"
                style={{ padding: '6px 8px', fontSize: '0.75rem' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

function getDistanceToLineSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
}
