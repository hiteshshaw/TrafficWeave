import React from 'react';
import {
  Activity,
  Atom,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Cpu,
  Globe2,
  MapPin,
  RotateCcw,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { sounds } from '../core/audio/soundEffects';

export type ActiveTab = 'simulation' | 'tournament' | 'benchmark' | 'quantum' | 'innovations' | 'deliverables' | 'theory';
export type MapViewMode = 'real_gis' | 'schematic_canvas';

interface HeaderProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  selectedCityId: string;
  onCityChange: (cityId: string) => void;
  mapViewMode: MapViewMode;
  onMapViewModeChange: (mode: MapViewMode) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onResetAll: () => void;
}

const tabs = [
  { id: 'simulation', label: 'Simulation', icon: Activity },
  { id: 'tournament', label: 'Arena', icon: BarChart3 },
  { id: 'innovations', label: 'Routing Lab', icon: Cpu },
  { id: 'benchmark', label: 'Benchmarks', icon: BarChart3 },
  { id: 'quantum', label: 'Quantum', icon: Atom },
  { id: 'deliverables', label: 'Specifications', icon: CheckCircle2 },
  { id: 'theory', label: 'Theory', icon: BookOpen },
] as const;

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  selectedCityId,
  onCityChange,
  mapViewMode,
  onMapViewModeChange,
  isMuted,
  onToggleMute,
  onResetAll,
}) => (
  <header className="app-header">
    <div className="header-inner">
      <div className="header-main">
        <div className="brand-block">
          <img className="brand-mark" src="/trafficweave.svg" alt="" aria-hidden="true" />
          <div className="brand-copy">
            <div className="brand-title-row">
              <h1 className="brand-title">TrafficWeave</h1>
              <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>QPSO v2.4</span>
            </div>
            <p className="brand-subtitle">Urban routing operations</p>
          </div>
        </div>

        <label className="city-control">
          <MapPin size={17} aria-hidden="true" />
          <span className="city-control-copy">
            <span className="control-overline">Network</span>
            <select
              className="city-select"
              value={selectedCityId}
              aria-label="Select city network"
              onChange={event => onCityChange(event.target.value)}
            >
              <optgroup label="Metropolitan Road Networks">
                <option value="mumbai_real">Mumbai Metropolitan Network</option>
                <option value="delhi_real">Delhi NCR Metro Network</option>
                <option value="bengaluru_real">Bengaluru Tech Corridor</option>
                <option value="hyderabad_real">Hyderabad Cyberabad Corridor</option>
                <option value="chennai_real">Chennai Coastal Corridor</option>
              </optgroup>
            </select>
          </span>
        </label>

        <div className="header-actions" aria-label="Global controls">
          <button
            onClick={() => {
              onToggleMute();
              if (isMuted) sounds.playQuantumPulse(550);
            }}
            className="btn header-icon-button"
            type="button"
            aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
            title={isMuted ? 'Unmute audio' : 'Mute audio'}
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <button
            onClick={onResetAll}
            className="btn header-icon-button"
            type="button"
            aria-label="Reset solvers and traffic state"
            title="Reset solvers and traffic state"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </div>

      <div className="header-secondary">
        <nav className="main-nav" aria-label="Main navigation">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`nav-tab${activeTab === id ? ' nav-tab-active' : ''}`}
              type="button"
              onClick={() => onTabChange(id)}
              aria-current={activeTab === id ? 'page' : undefined}
              aria-label={label}
              title={label}
            >
              <Icon size={15} aria-hidden="true" />
              <span className="nav-tab-label">{label}</span>
            </button>
          ))}
        </nav>

        <div className="map-view-switcher" role="group" aria-label="Map display mode">
          <button
            className={`map-view-button${mapViewMode === 'real_gis' ? ' map-view-button-active' : ''}`}
            type="button"
            onClick={() => onMapViewModeChange('real_gis')}
            aria-pressed={mapViewMode === 'real_gis'}
            title="GIS map"
          >
            <Globe2 size={14} aria-hidden="true" />
            <span className="map-view-button-label">GIS</span>
          </button>
          <button
            className={`map-view-button${mapViewMode === 'schematic_canvas' ? ' map-view-button-active' : ''}`}
            type="button"
            onClick={() => onMapViewModeChange('schematic_canvas')}
            aria-pressed={mapViewMode === 'schematic_canvas'}
            title="Grid canvas"
          >
            <Cpu size={14} aria-hidden="true" />
            <span className="map-view-button-label">Canvas</span>
          </button>
        </div>
      </div>
    </div>
  </header>
);
