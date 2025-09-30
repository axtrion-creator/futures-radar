import { create } from 'zustand';
import { csvToRadarData, parseCsv } from './csv';
import { computeLayout } from './layout';
import {
  FiltersState,
  LayoutPoint,
  LoadResult,
  RadarConfig,
  RadarData,
  RadarItem,
  ValidationIssue
} from './types';

interface RadarState {
  config: RadarConfig | null;
  data: RadarData | null;
  visible: RadarItem[];
  layout: LayoutPoint[];
  issues: ValidationIssue[];
  selected: RadarItem | null;
  filters: FiltersState;
  zoom: number;
  pan: { x: number; y: number };
  fullscreen: boolean;
  loadInitial: () => Promise<void>;
  loadFromFile: (file: File) => Promise<void>;
  setSelected: (item: RadarItem | null) => void;
  setFilters: (filters: Partial<FiltersState>) => void;
  resetView: () => void;
  setViewport: (zoom: number, pan: { x: number; y: number }) => void;
  setFullscreen: (value: boolean) => void;
}

const defaultFilters: FiltersState = {
  search: '',
  types: [],
  quadrants: [],
  rings: []
};

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Failed to load ${path}`);
  return (await response.json()) as T;
}

async function fetchText(path: string): Promise<string> {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Failed to load ${path}`);
  return response.text();
}

function filterItems(data: RadarData, filters: FiltersState): RadarItem[] {
  const searchLower = filters.search.trim().toLowerCase();
  return data.items.filter((item) => {
    if (filters.types.length > 0 && !filters.types.includes(item.type)) return false;
    if (filters.quadrants.length > 0 && !filters.quadrants.includes(item.quadrant)) return false;
    if (filters.rings.length > 0 && !filters.rings.includes(item.ring)) return false;
    if (searchLower) {
      const haystack = `${item.title} ${item.summary} ${item.notes ?? ''}`.toLowerCase();
      if (!haystack.includes(searchLower)) return false;
    }
    return true;
  });
}

function buildLayout(config: RadarConfig, items: RadarItem[]): LayoutPoint[] {
  return computeLayout(items, config, config.geometry.width, config.geometry.height);
}

export const useRadarStore = create<RadarState>((set, get) => ({
  config: null,
  data: null,
  visible: [],
  layout: [],
  issues: [],
  selected: null,
  filters: defaultFilters,
  zoom: 1,
  pan: { x: 0, y: 0 },
  fullscreen: false,
  loadInitial: async () => {
    try {
      const config = await fetchJson<RadarConfig>('/config/radar.config.json');
      let data: RadarData | null = null;
      const issues: ValidationIssue[] = [];
      try {
        data = await fetchJson<RadarData>('/data/radar.json');
      } catch (err) {
        console.warn('JSON data load failed, trying CSV', err);
        try {
          const text = await fetchText('/data/radar.csv');
          const rows = parseCsv(text);
          const result = csvToRadarData(rows, config);
          data = result.data;
          issues.push(...result.issues);
        } catch (errCsv) {
          console.error('CSV load failed', errCsv);
        }
      }

      if (!data) {
        data = { items: [] };
      }

      const filters = get().filters;
      const visible = filterItems(data, filters);
      const layout = buildLayout(config, visible);

      set({ config, data, visible, layout, issues });
    } catch (error) {
      console.error('Failed to initialize radar', error);
      set({
        issues: [{ id: 'config', reason: 'Failed to load configuration' }],
        config: null,
        data: { items: [] },
        visible: [],
        layout: []
      });
    }
  },
  loadFromFile: async (file: File) => {
    const { config } = get();
    if (!config) return;
    const text = await file.text();
    let result: LoadResult | null = null;

    if (file.name.endsWith('.json')) {
      try {
        const json = JSON.parse(text) as RadarData;
        result = { data: json, issues: [] };
      } catch (error) {
        console.error('Invalid JSON file', error);
        set({ issues: [{ id: 'file', reason: 'Invalid JSON format' }] });
        return;
      }
    } else if (file.name.endsWith('.csv')) {
      result = csvToRadarData(parseCsv(text), config);
    }

    if (!result) {
      set({ issues: [{ id: 'file', reason: 'Unsupported file type' }] });
      return;
    }
    const filters = get().filters;
    const visible = filterItems(result.data, filters);
    const layout = buildLayout(config, visible);
    const selected = get().selected;
    const stillVisible = selected ? visible.some((item) => item.id === selected.id) : false;
    set({ data: result.data, visible, layout, issues: result.issues, selected: stillVisible ? selected : null });
  },
  setSelected: (item) => set({ selected: item }),
  setFilters: (partial) => {
    const filters = { ...get().filters, ...partial };
    const { config, data, selected } = get();
    if (!config || !data) {
      set({ filters });
      return;
    }
    const visible = filterItems(data, filters);
    const layout = buildLayout(config, visible);
    const stillVisible = selected ? visible.some((item) => item.id === selected.id) : false;
    set({ filters, visible, layout, selected: stillVisible ? selected : null });
  },
  resetView: () => set({ zoom: 1, pan: { x: 0, y: 0 } }),
  setViewport: (zoom, pan) => set({ zoom, pan }),
  setFullscreen: (value) => set({ fullscreen: value })
}));
