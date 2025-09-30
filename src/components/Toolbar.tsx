import { ChangeEvent, useMemo, useRef } from 'react';
import { useRadarStore } from '../lib/store';
import { ItemType } from '../lib/types';

const TYPE_OPTIONS: { label: string; value: ItemType }[] = [
  { label: 'Weak signals', value: 'weak signal' },
  { label: 'Trends', value: 'trend' },
  { label: 'Wild cards', value: 'wild card' }
];

export function Toolbar() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    config,
    filters,
    zoom,
    pan,
    fullscreen,
    setFilters,
    loadFromFile,
    resetView,
    setViewport,
    setFullscreen
  } = useRadarStore((state) => ({
    config: state.config,
    filters: state.filters,
    zoom: state.zoom,
    pan: state.pan,
    setFilters: state.setFilters,
    loadFromFile: state.loadFromFile,
    resetView: state.resetView,
    setViewport: state.setViewport,
    fullscreen: state.fullscreen,
    setFullscreen: state.setFullscreen
  }));

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    loadFromFile(file);
    event.target.value = '';
  };

  const toggleType = (value: ItemType) => {
    const types = filters.types.includes(value)
      ? filters.types.filter((type) => type !== value)
      : [...filters.types, value];
    setFilters({ types });
  };

  const quadrantOptions = useMemo(() => config?.quadrants ?? [], [config]);
  const ringOptions = useMemo(() => config?.rings.map((r) => r.name) ?? [], [config]);

  const handleSearch = (event: ChangeEvent<HTMLInputElement>) => {
    setFilters({ search: event.target.value });
  };

  const handleQuadrant = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setFilters({ quadrants: value ? [value] : [] });
  };

  const handleRing = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setFilters({ rings: value ? [value] : [] });
  };

  const handleZoom = (direction: 'in' | 'out') => {
    const factor = direction === 'in' ? 1.2 : 1 / 1.2;
    const newZoom = Math.min(4, Math.max(0.25, zoom * factor));
    setViewport(newZoom, pan);
  };

  const requestFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error('Fullscreen toggle failed', error);
    } finally {
      setFullscreen(Boolean(document.fullscreenElement));
    }
  };

  return (
    <header className="topbar" role="toolbar" aria-label="Radar controls">
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <h1>{config?.title ?? 'Futures Radar'}</h1>
        <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>Offline first • Semi-circular radar</div>
      </div>
      <div className="toolbar-group" style={{ flexWrap: 'wrap', justifyContent: 'flex-end', gap: '0.75rem' }}>
        <div className="filters" style={{ alignItems: 'center' }}>
          <input
            type="search"
            placeholder="Search"
            value={filters.search}
            onChange={handleSearch}
            aria-label="Search radar items"
          />
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            {TYPE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => toggleType(option.value)}
                aria-pressed={filters.types.includes(option.value)}
                style={{
                  background: filters.types.includes(option.value) ? 'rgba(137, 161, 199, 0.4)' : undefined,
                  borderColor: filters.types.includes(option.value) ? 'rgba(137, 161, 199, 0.9)' : undefined
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
          <label>
            Quadrant
            <select value={filters.quadrants[0] ?? ''} onChange={handleQuadrant}>
              <option value="">All</option>
              {quadrantOptions.map((quadrant) => (
                <option key={quadrant} value={quadrant}>
                  {quadrant}
                </option>
              ))}
            </select>
          </label>
          <label>
            Ring
            <select value={filters.rings[0] ?? ''} onChange={handleRing}>
              <option value="">All</option>
              {ringOptions.map((ring) => (
                <option key={ring} value={ring}>
                  {ring}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="toolbar-group">
          <button type="button" onClick={() => handleZoom('out')} aria-label="Zoom out">
            −
          </button>
          <span aria-live="polite" style={{ minWidth: '3rem', textAlign: 'center' }}>
            {(zoom * 100).toFixed(0)}%
          </span>
          <button type="button" onClick={() => handleZoom('in')} aria-label="Zoom in">
            +
          </button>
          <button type="button" onClick={resetView} aria-label="Reset view">
            Reset
          </button>
        </div>
        <div className="toolbar-group">
          <button type="button" onClick={() => fileInputRef.current?.click()} aria-label="Open data file">
            Open file
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.csv,application/json,text/csv"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>
        <button type="button" onClick={requestFullscreen} aria-pressed={fullscreen}>
          {fullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
        </button>
      </div>
    </header>
  );
}
