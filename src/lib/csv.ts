import { ItemType, RadarItem, RadarConfig, SourceLink, LoadResult } from './types';

const TYPE_MAP: Record<string, ItemType> = {
  'weak signal': 'weak signal',
  'weak-signal': 'weak signal',
  signal: 'weak signal',
  trend: 'trend',
  technology: 'trend',
  'wild card': 'wild card',
  wildcard: 'wild card'
};

const REQUIRED_FIELDS = ['id', 'title', 'type', 'quadrant', 'ring', 'summary', 'updated_at'] as const;

type CsvRow = Record<string, string>;

function parseLine(line: string, delimiter = ','): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result.map((value) => value.trim());
}

export function parseCsv(text: string): string[][] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length === 0) {
    return [];
  }

  return lines.map((line) => parseLine(line));
}

function mapType(raw: string): ItemType {
  const normalized = raw.trim().toLowerCase();
  return TYPE_MAP[normalized] ?? 'trend';
}

function parseSources(raw: string): SourceLink[] {
  if (!raw) return [];
  return raw.split(';').flatMap((segment) => {
    const trimmed = segment.trim();
    if (!trimmed) return [];
    const [label, url] = trimmed.split('|');
    if (!label && !url) return [];
    return [
      {
        label: (label ?? url ?? '').trim(),
        url: (url ?? '').trim()
      }
    ];
  });
}

function parseFloatSafe(value: string): number | null {
  if (!value) return null;
  const num = Number.parseFloat(value);
  if (Number.isNaN(num)) return null;
  return Math.min(5, Math.max(0, num));
}

export function csvToRadarData(rows: string[][], config: RadarConfig): LoadResult {
  if (rows.length === 0) {
    return { data: { items: [] }, issues: [] };
  }

  const [header, ...body] = rows;
  const headerIndex = new Map<string, number>();
  header.forEach((key, index) => headerIndex.set(key.trim().toLowerCase(), index));

  const items: RadarItem[] = [];
  const issues: LoadResult['issues'] = [];

  const requiredMissing = REQUIRED_FIELDS.filter((field) => !headerIndex.has(field));
  if (requiredMissing.length > 0) {
    issues.push({ id: 'csv', reason: `Missing required columns: ${requiredMissing.join(', ')}` });
    return { data: { items: [] }, issues };
  }

  for (const row of body) {
    const rowMap: CsvRow = {};
    headerIndex.forEach((colIndex, key) => {
      rowMap[key] = row[colIndex] ?? '';
    });

    const missing = REQUIRED_FIELDS.filter((field) => !rowMap[field] || rowMap[field].length === 0);
    if (missing.length > 0) {
      issues.push({ id: rowMap.id || 'unknown', reason: `Missing fields: ${missing.join(', ')}` });
      continue;
    }

    const type = mapType(rowMap.type);
    const quadrant = rowMap.quadrant.trim();
    const ring = rowMap.ring.trim();

    if (!config.quadrants.includes(quadrant)) {
      issues.push({ id: rowMap.id, reason: `Unknown quadrant '${quadrant}'` });
      continue;
    }

    if (!config.rings.some((r) => r.name === ring)) {
      issues.push({ id: rowMap.id, reason: `Unknown ring '${ring}'` });
      continue;
    }

    const item: RadarItem = {
      id: rowMap.id,
      title: rowMap.title,
      type,
      quadrant,
      ring,
      summary: rowMap.summary,
      sources: parseSources(rowMap.sources),
      updated_at: rowMap.updated_at,
      confidence: parseFloatSafe(rowMap.confidence),
      impact: parseFloatSafe(rowMap.impact),
      notes: rowMap.notes || undefined
    };

    if (rowMap['angle_deg']) {
      const angle = Number.parseFloat(rowMap['angle_deg']);
      if (!Number.isNaN(angle)) {
        item.angle_deg = angle;
      }
    }

    if (rowMap['radius_norm']) {
      const radius = Number.parseFloat(rowMap['radius_norm']);
      if (!Number.isNaN(radius)) {
        item.radius_norm = Math.min(1, Math.max(0, radius));
      }
    }

    items.push(item);
  }

  return { data: { items }, issues };
}
