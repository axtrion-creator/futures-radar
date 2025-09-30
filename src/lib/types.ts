export type ItemType = 'weak signal' | 'trend' | 'wild card';

export interface SourceLink {
  label: string;
  url: string;
}

export interface RadarItem {
  id: string;
  title: string;
  type: ItemType;
  quadrant: string;
  ring: string;
  summary: string;
  sources: SourceLink[];
  updated_at: string;
  confidence: number | null;
  impact: number | null;
  notes?: string;
  angle_deg?: number;
  radius_norm?: number;
}

export interface RadarData {
  meta?: {
    name?: string;
    exported_at?: string;
  };
  items: RadarItem[];
}

export interface RingConfig {
  name: string;
  radius: number;
}

export interface PlacementConfig {
  jitter: boolean;
  seeded: boolean;
  allowOverrides: boolean;
}

export interface GeometryConfig {
  width: number;
  height: number;
  margin: number;
  semiCircle?: boolean;
}

export interface RadarConfig {
  title: string;
  palette: Record<string, string>;
  quadrants: string[];
  rings: RingConfig[];
  geometry: GeometryConfig;
  placement: PlacementConfig;
}

export interface LayoutPoint {
  item: RadarItem;
  angle: number;
  radius: number;
  x: number;
  y: number;
}

export interface ValidationIssue {
  id: string;
  reason: string;
}

export interface LoadResult {
  data: RadarData;
  issues: ValidationIssue[];
}

export interface FiltersState {
  search: string;
  types: ItemType[];
  quadrants: string[];
  rings: string[];
}
