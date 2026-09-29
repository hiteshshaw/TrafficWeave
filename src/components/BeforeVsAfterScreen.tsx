import React, { useState } from 'react';
import {
  TrendingDown,
  Clock,
  Navigation,
  Fuel,
  Flame,
  ArrowDown,
  Sparkles,
  Zap,
  ShieldAlert,
  CheckCircle,
  Sliders,
  DollarSign,
  Car,
  Layers,
} from 'lucide-react';
import { sounds } from '../core/audio/soundEffects';

interface ScenarioData {
  id: string;
  name: string;
  location: string;
  description: string;
  before: {
    status: string;
    travelTimeMin: number;
    distanceKm: number;
    fuelLiters: number;
    co2Kg: number;
    congestionDelayMin: number;
    avgSpeedKmh: number;
    routeColor: string;
  };
  after: {
    status: string;
    travelTimeMin: number;
    distanceKm: number;
    fuelLiters: number;
    co2Kg: number;
    congestionDelayMin: number;
    avgSpeedKmh: number;
    routeColor: string;
  };
}

const PRESET_SCENARIOS: ScenarioData[] = [
  {
    id: 'mumbai_arterial',
    name: 'Metropolitan Congestion & Arterial Bottleneck',
    location: 'Mumbai: CST → Bandra Kurla Complex (BKC)',
    description: 'Classical navigation routes vehicles straight through high-density Western Express bottlenecks. TrafficWeave uses quantum wave tunneling to dynamically route through clear secondary corridors.',
    before: {
      status: 'Congested Route (Classical Direct)',
      travelTimeMin: 28,
      distanceKm: 14.2,
      fuelLiters: 1.85,
      co2Kg: 4.32,
      congestionDelayMin: 12.5,
      avgSpeedKmh: 30.4,
      routeColor: '#ef4444',
    },
    after: {
      status: 'Optimized Route (TrafficWeave QPSO)',
      travelTimeMin: 19,
      distanceKm: 12.8,
      fuelLiters: 1.09,
      co2Kg: 2.54,
      congestionDelayMin: 1.2,
      avgSpeedKmh: 40.4,
      routeColor: '#2563eb',
    },
  },
  {
    id: 'delhi_ncr_ring',
    name: 'Ring Road Jam & Monsoon Flood Detour',
    location: 'Delhi NCR: Connaught Place → Cyber City (Gurugram)',
    description: 'Sudden waterlogging blocks Outer Ring Road. TrafficWeave reacts in under 45ms to compute an evasive green-light detour around the blockage.',
    before: {
      status: 'Blocked Route (Gridlocked Traffic)',
      travelTimeMin: 45,
      distanceKm: 22.0,
      fuelLiters: 3.10,
      co2Kg: 7.24,
      congestionDelayMin: 24.0,
      avgSpeedKmh: 29.3,
      routeColor: '#ef4444',
    },
    after: {
      status: 'Evasive Detour (TrafficWeave Dynamic)',
      travelTimeMin: 26,
      distanceKm: 18.5,
      fuelLiters: 1.62,
      co2Kg: 3.78,
      congestionDelayMin: 2.5,
      avgSpeedKmh: 42.7,
      routeColor: '#2563eb',
    },
  },
  {
    id: 'blr_green_corridor',
    name: 'Emergency Medical Green Corridor Transit',
    location: 'Bengaluru: Electronic City → Manipal Trauma Hospital',
    description: 'Critical patient transit with priority signal preemption and zero-congestion routing bypassing Whitefield and Silk Board choke points.',
    before: {
      status: 'Standard Non-Priority Transit',
      travelTimeMin: 34,
      distanceKm: 16.8,
      fuelLiters: 2.20,
      co2Kg: 5.14,
      congestionDelayMin: 16.0,
      avgSpeedKmh: 29.6,
      routeColor: '#ef4444',
    },
    after: {
      status: 'Emergency Green Corridor Active',
      travelTimeMin: 14,
      distanceKm: 13.2,
      fuelLiters: 1.15,
      co2Kg: 2.68,
      congestionDelayMin: 0.0,
      avgSpeedKmh: 56.5,
      routeColor: '#16a34a',
    },
  },
  {
    id: 'fleet_dispatch_multidepot',
    name: 'Multi-Depot E-Commerce Fleet Dispatch',
    location: 'Hyderabad: HITEC City & Secunderabad (20 Drop Points)',
    description: 'Optimization of 4 delivery vans with strict customer time-windows and dynamic capacity balancing.',
    before: {
      status: 'Nearest Neighbor Heuristic',
      travelTimeMin: 180,
      distanceKm: 84.0,
      fuelLiters: 10.92,
      co2Kg: 25.50,
      congestionDelayMin: 55.0,
      avgSpeedKmh: 28.0,
      routeColor: '#ef4444',
    },
    after: {
      status: 'QPSO Multi-Depot Global Optimum',
      travelTimeMin: 118,
      distanceKm: 62.5,
      fuelLiters: 6.87,
      co2Kg: 16.04,
      congestionDelayMin: 8.0,
      avgSpeedKmh: 31.8,
      routeColor: '#2563eb',
    },
  },
];

export const BeforeVsAfterScreen: React.FC = () => {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('mumbai_arterial');
  const [fleetSize, setFleetSize] = useState<number>(25);
  const [fuelPricePerLiter, setFuelPricePerLiter] = useState<number>(104);

  const scenario = PRESET_SCENARIOS.find(s => s.id === selectedScenarioId) || PRESET_SCENARIOS[0];

  // Calculate percentage improvements
  const timeSavedMin = scenario.before.travelTimeMin - scenario.after.travelTimeMin;
  const timeSavedPct = ((timeSavedMin / scenario.before.travelTimeMin) * 100).toFixed(1);

  const distSavedKm = (scenario.before.distanceKm - scenario.after.distanceKm).toFixed(1);
  const distSavedPct = (((scenario.before.distanceKm - scenario.after.distanceKm) / scenario.before.distanceKm) * 100).toFixed(1);

  const fuelSavedL = (scenario.before.fuelLiters - scenario.after.fuelLiters).toFixed(2);
  const fuelSavedPct = (((scenario.before.fuelLiters - scenario.after.fuelLiters) / scenario.before.fuelLiters) * 100).toFixed(1);

  const co2SavedKg = (scenario.before.co2Kg - scenario.after.co2Kg).toFixed(2);
  const co2SavedPct = (((scenario.before.co2Kg - scenario.after.co2Kg) / scenario.before.co2Kg) * 100).toFixed(1);

  // Annual fleet projections (Assuming 2 trips/day, 300 operational days/year)
  const tripsPerYearPerVehicle = 600;
  const annualFuelSavedLiters = Math.round(Number(fuelSavedL) * tripsPerYearPerVehicle * fleetSize);
  const annualMoneySavedInr = Math.round(annualFuelSavedLiters * fuelPricePerLiter);
  const annualCo2SavedTons = ((Number(co2SavedKg) * tripsPerYearPerVehicle * fleetSize) / 1000).toFixed(1);
  const annualHoursSaved = Math.round((timeSavedMin / 60) * tripsPerYearPerVehicle * fleetSize);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1200, margin: '0 auto' }}>
      
      {/* 1. Header Overview Banner */}
      <div className="glass-panel" style={{ padding: '20px 24px', background: 'linear-gradient(to right, #ffffff, #f8fafc)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="badge badge-cyan" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                IMPACT AUDIT
              </span>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
                Before vs. After Optimization Impact
              </h2>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4 }}>
              Direct head-to-head empirical comparison of classical congested routes vs TrafficWeave quantum-optimized routes.
            </p>
          </div>

          {/* Scenario Selector Pills */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {PRESET_SCENARIOS.map(sc => (
              <button
                key={sc.id}
                onClick={() => {
                  setSelectedScenarioId(sc.id);
                  sounds.playQuantumPulse(500);
                }}
                className={`btn ${selectedScenarioId === sc.id ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.78rem', padding: '6px 12px' }}
              >
                {sc.name.split(' ')[0]} {sc.name.split(' ')[1]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. THE CORE BEFORE → TRAFFICWEAVE → AFTER VISUAL WORKFLOW */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 18, alignItems: 'stretch' }}>
        
        {/* BEFORE CARD */}
        <div className="glass-panel" style={{
          padding: 22,
          borderLeft: '5px solid #ef4444',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: 16,
          background: '#ffffff',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#dc2626', letterSpacing: '0.05em' }}>
                BEFORE
              </span>
              <span className="badge badge-rose font-mono">Unoptimized</span>
            </div>

            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
              {scenario.before.status}
            </h3>
            <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 2 }}>
              {scenario.location}
            </p>

            {/* Metrics List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: '#fef2f2', borderRadius: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: '#991b1b', fontWeight: 600 }}>
                  <Clock size={16} /> Travel time:
                </div>
                <strong className="font-mono" style={{ fontSize: '1.05rem', color: '#b91c1c' }}>{scenario.before.travelTimeMin} min</strong>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>
                  <Navigation size={16} /> Distance:
                </div>
                <strong className="font-mono" style={{ fontSize: '1.05rem', color: '#0f172a' }}>{scenario.before.distanceKm} km</strong>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>
                  <Fuel size={16} /> Fuel consumption:
                </div>
                <strong className="font-mono" style={{ fontSize: '1.05rem', color: '#0f172a' }}>{scenario.before.fuelLiters} L</strong>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>
                  <Flame size={16} /> CO₂ emissions:
                </div>
                <strong className="font-mono" style={{ fontSize: '1.05rem', color: '#0f172a' }}>{scenario.before.co2Kg} kg</strong>
              </div>
            </div>
          </div>

          <div style={{ fontSize: '0.74rem', color: '#94a3b8', borderTop: '1px solid #e2e8f0', paddingTop: 10 }}>
            ⚠️ Congestion delay: +{scenario.before.congestionDelayMin} min idling in traffic bottlenecks.
          </div>
        </div>

        {/* CENTER CONNECTOR: TRAFFICWEAVE ENGINE */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
          gap: 12,
        }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: '#e0f2fe',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#0284c7',
          }}>
            <ArrowDown size={18} />
          </div>

          <div className="glass-panel" style={{
            padding: '16px 20px',
            background: 'linear-gradient(135deg, #0284c7, #2563eb)',
            color: '#ffffff',
            borderRadius: 10,
            textAlign: 'center',
            width: '100%',
            boxShadow: '0 8px 16px rgba(37, 99, 235, 0.25)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 4 }}>
              <Sparkles size={16} color="#38bdf8" />
              <strong style={{ fontSize: '1rem', letterSpacing: '0.04em' }}>TRAFFICWEAVE</strong>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#bfdbfe', fontWeight: 500 }}>
              Dynamic Quantum-Inspired Optimization Engine
            </div>
            <div style={{
              display: 'inline-block',
              marginTop: 10,
              fontSize: '0.7rem',
              fontWeight: 700,
              background: 'rgba(255, 255, 255, 0.2)',
              padding: '3px 10px',
              borderRadius: 20,
            }}>
              QPSO Delta-Well Tunneling
            </div>
          </div>

          <div style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: '#dcfce7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#16a34a',
          }}>
            <ArrowDown size={18} />
          </div>
        </div>

        {/* AFTER CARD */}
        <div className="glass-panel" style={{
          padding: 22,
          borderLeft: '5px solid #16a34a',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: 16,
          background: '#ffffff',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#16a34a', letterSpacing: '0.05em' }}>
                AFTER
              </span>
              <span className="badge badge-emerald font-mono">✓ 100% Optimized</span>
            </div>

            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
              {scenario.after.status}
            </h3>
            <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 2 }}>
              {scenario.description}
            </p>

            {/* Metrics List with Green Badges */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: '#f0fdf4', borderRadius: 6, border: '1px solid #bbf7d0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: '#166534', fontWeight: 600 }}>
                  <Clock size={16} /> Travel time:
                </div>
                <div style={{ textAlign: 'right' }}>
                  <strong className="font-mono" style={{ fontSize: '1.05rem', color: '#15803d' }}>{scenario.after.travelTimeMin} min</strong>
                  <span className="badge badge-emerald" style={{ marginLeft: 6, fontSize: '0.68rem' }}>-{timeSavedPct}%</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>
                  <Navigation size={16} /> Distance:
                </div>
                <div style={{ textAlign: 'right' }}>
                  <strong className="font-mono" style={{ fontSize: '1.05rem', color: '#0f172a' }}>{scenario.after.distanceKm} km</strong>
                  <span className="badge badge-cyan" style={{ marginLeft: 6, fontSize: '0.68rem' }}>-{distSavedPct}%</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>
                  <Fuel size={16} /> Fuel consumption:
                </div>
                <div style={{ textAlign: 'right' }}>
                  <strong className="font-mono" style={{ fontSize: '1.05rem', color: '#0f172a' }}>{scenario.after.fuelLiters} L</strong>
                  <span className="badge badge-emerald" style={{ marginLeft: 6, fontSize: '0.68rem' }}>-{fuelSavedPct}%</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>
                  <Flame size={16} /> CO₂ emissions:
                </div>
                <div style={{ textAlign: 'right' }}>
                  <strong className="font-mono" style={{ fontSize: '1.05rem', color: '#0f172a' }}>{scenario.after.co2Kg} kg</strong>
                  <span className="badge badge-emerald" style={{ marginLeft: 6, fontSize: '0.68rem' }}>-{co2SavedPct}%</span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ fontSize: '0.74rem', color: '#15803d', borderTop: '1px solid #e2e8f0', paddingTop: 10, fontWeight: 600 }}>
            ✓ Evasive path avoids bottleneck delay: Saved {timeSavedMin} minutes &amp; {co2SavedKg} kg CO₂!
          </div>
        </div>

      </div>

      {/* 3. INTERACTIVE FLEET SCALE ROI CALCULATOR */}
      <div className="glass-panel" style={{ padding: 22, background: 'var(--bg-secondary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
          <div>
            <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Interactive Enterprise Fleet ROI &amp; Sustainability Projections
            </h4>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Simulate annual economic and environmental savings when TrafficWeave is deployed across an entire commercial fleet.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem' }}>
              <span>Fleet Size:</span>
              <input
                type="number"
                min="1"
                max="500"
                value={fleetSize}
                onChange={e => setFleetSize(Math.max(1, Number(e.target.value)))}
                style={{ width: 70, padding: '4px 8px', fontSize: '0.85rem', fontWeight: 700, textAlign: 'center' }}
              />
              <span style={{ color: 'var(--text-muted)' }}>vehicles</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem' }}>
              <span>Fuel Price:</span>
              <input
                type="number"
                min="50"
                max="200"
                value={fuelPricePerLiter}
                onChange={e => setFuelPricePerLiter(Math.max(1, Number(e.target.value)))}
                style={{ width: 70, padding: '4px 8px', fontSize: '0.85rem', fontWeight: 700, textAlign: 'center' }}
              />
              <span style={{ color: 'var(--text-muted)' }}>₹/L</span>
            </div>
          </div>
        </div>

        {/* 4 Projected ROI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          <div className="glass-card" style={{ padding: 14, textAlign: 'center' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Annual Fuel Cost Savings</div>
            <div className="font-mono" style={{ fontSize: '1.4rem', fontWeight: 800, color: '#16a34a', marginTop: 4 }}>
              ₹{(annualMoneySavedInr / 100000).toFixed(2)} Lakhs
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: 2 }}>
              ({annualFuelSavedLiters.toLocaleString()} Liters Saved)
            </div>
          </div>

          <div className="glass-card" style={{ padding: 14, textAlign: 'center' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Annual Carbon Reduction</div>
            <div className="font-mono" style={{ fontSize: '1.4rem', fontWeight: 800, color: '#059669', marginTop: 4 }}>
              {annualCo2SavedTons} Tons CO₂
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: 2 }}>
              Net-Zero Emission Contribution
            </div>
          </div>

          <div className="glass-card" style={{ padding: 14, textAlign: 'center' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Driver Idle Hours Saved</div>
            <div className="font-mono" style={{ fontSize: '1.4rem', fontWeight: 800, color: '#2563eb', marginTop: 4 }}>
              {annualHoursSaved.toLocaleString()} Hours
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: 2 }}>
              Reduced Overtime &amp; Delays
            </div>
          </div>

          <div className="glass-card" style={{ padding: 14, textAlign: 'center' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Route Efficiency Gain</div>
            <div className="font-mono" style={{ fontSize: '1.4rem', fontWeight: 800, color: '#9333ea', marginTop: 4 }}>
              +{timeSavedPct}%
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: 2 }}>
              Quantum Evasion vs Direct Jam
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
