import { useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent, KeyboardEvent as ReactKeyboardEvent } from 'react';
import * as d3 from 'd3';
import { LayoutPoint, RadarConfig } from '../lib/types';
import { getQuadrantSectors, getRingBounds } from '../lib/layout';
import { useRadarStore } from '../lib/store';

interface RadarProps {
  config: RadarConfig;
  layout: LayoutPoint[];
  hasData: boolean;
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  content: string;
}

export function Radar({ config, layout, hasData }: RadarProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const zoomLayerRef = useRef<SVGGElement | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, x: 0, y: 0, content: '' });
  const { setSelected, zoom, pan, setViewport } = useRadarStore((state) => ({
    setSelected: state.setSelected,
    zoom: state.zoom,
    pan: state.pan,
    setViewport: state.setViewport
  }));

  const width = config.geometry.width;
  const height = config.geometry.height;
  const centerX = width / 2;
  const centerY = (config.geometry.semiCircle ?? false) ? height - config.geometry.margin : height / 2;
  const rMax = Math.min(width / 2, height) - config.geometry.margin;

  const rings = useMemo(() => getRingBounds(config, width, height), [config, width, height]);
  const quadrants = useMemo(() => getQuadrantSectors(config), [config]);
  const palette = config.palette ?? {};

  useEffect(() => {
    if (!svgRef.current || !zoomLayerRef.current) return;

    const svg = d3.select(svgRef.current);
    const zoomLayer = d3.select(zoomLayerRef.current);

    const zoomBehavior = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.25, 4])
      .on('zoom', (event) => {
        const { k, x, y } = event.transform;
        zoomLayer.attr('transform', `translate(${x},${y}) scale(${k})`);
        setViewport(k, { x, y });
      });

    svg.call(zoomBehavior as any);
    zoomBehavior.transform(svg, d3.zoomIdentity.translate(pan.x, pan.y).scale(zoom));

    return () => {
      svg.on('.zoom', null);
    };
  }, [pan.x, pan.y, setViewport, zoom]);

  useEffect(() => {
    if (!zoomLayerRef.current) return;
    const zoomLayer = d3.select(zoomLayerRef.current);
    zoomLayer.attr('transform', `translate(${pan.x},${pan.y}) scale(${zoom})`);
  }, [pan.x, pan.y, zoom]);

  const handleMouseEnter = (event: ReactMouseEvent<SVGCircleElement>, point: LayoutPoint) => {
    const rect = (event.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
    setTooltip({
      visible: true,
      x: event.clientX - rect.left + 12,
      y: event.clientY - rect.top + 12,
      content: `${point.item.title}\n${point.item.type} • ${point.item.ring} • Updated ${point.item.updated_at}`
    });
  };

  const handleMouseMove = (event: ReactMouseEvent<SVGCircleElement>) => {
    if (!tooltip.visible) return;
    const rect = (event.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
    setTooltip((current) => ({ ...current, x: event.clientX - rect.left + 12, y: event.clientY - rect.top + 12 }));
  };

  const handleMouseLeave = () => {
    setTooltip((current) => ({ ...current, visible: false }));
  };

  const ringPaths = useMemo(() => {
    const semiCircle = config.geometry.semiCircle ?? false;
    const startAngle = semiCircle ? Math.PI : 0;
    const endAngle = semiCircle ? Math.PI * 2 : Math.PI * 2;
    return rings.map((ring) => {
      const arc = d3
        .arc()
        .innerRadius(ring.inner)
        .outerRadius(ring.outer)
        .startAngle(startAngle)
        .endAngle(endAngle);
      return { name: ring.name, path: arc() ?? '' };
    });
  }, [config.geometry.semiCircle, rings]);

  const quadrantLines = useMemo(() => {
    if (!quadrants.length) return [];
    const angles = quadrants.map((quadrant) => quadrant.start);
    const lastEnd = quadrants[quadrants.length - 1]?.end;
    if (typeof lastEnd === 'number') {
      angles.push(lastEnd);
    }
    return angles.map((angle, index) => ({
      key: `boundary-${index}`,
      x2: Math.cos(angle) * rMax,
      y2: Math.sin(angle) * rMax
    }));
  }, [quadrants, rMax]);

  const ringLabels = useMemo(() => {
    const semiCircle = config.geometry.semiCircle ?? false;
    const angle = semiCircle ? (Math.PI * 3) / 2 : -Math.PI / 2;
    return rings.map((ring) => {
      const radius = (ring.inner + ring.outer) / 2;
      const x = Math.cos(angle) * (radius + 12);
      const y = Math.sin(angle) * (radius + 12);
      return { name: ring.name, x, y };
    });
  }, [config.geometry.semiCircle, rings]);

  const quadrantLabels = useMemo(() => {
    return quadrants.map((quadrant) => {
      const angle = (quadrant.start + quadrant.end) / 2;
      const x = Math.cos(angle) * (rMax + 40);
      const y = Math.sin(angle) * (rMax + 40);
      return { name: quadrant.name, x, y };
    });
  }, [quadrants, rMax]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <svg ref={svgRef} width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Futures radar">
        <defs>
          <radialGradient id="node-gradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.9)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.05)" />
          </radialGradient>
        </defs>
        <rect width={width} height={height} fill={config.palette.bg ?? '#0E1621'} />
        <g transform={`translate(${centerX},${centerY})`}>
          <g ref={zoomLayerRef} transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
            {ringPaths.map((ring) => (
              <path key={ring.name} d={ring.path} fill="none" stroke={config.palette.grid ?? '#32475B'} strokeWidth={1} />
            ))}
            {quadrantLines.map((line) => (
              <line key={line.key} x1={0} y1={0} x2={line.x2} y2={line.y2} stroke={config.palette.grid ?? '#32475B'} strokeWidth={1} />
            ))}
            {layout.map((point) => {
              const color = palette[point.item.type] ?? '#89A1C7';
              const size = 8 + (point.item.impact ?? 0) * 2;
              return (
                <circle
                  key={point.item.id}
                  cx={point.x}
                  cy={point.y}
                  r={size}
                  fill={color}
                  fillOpacity={0.85}
                  stroke="#101b2a"
                  strokeWidth={1}
                  onMouseEnter={(event) => handleMouseEnter(event, point)}
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                  onClick={() => setSelected(point.item)}
                  role="button"
                  aria-label={`${point.item.title} (${point.item.type})`}
                  tabIndex={0}
                  onKeyDown={(event: ReactKeyboardEvent<SVGCircleElement>) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setSelected(point.item);
                    }
                  }}
                />
              );
            })}
          </g>
          {ringLabels.map((label) => (
            <text key={label.name} x={label.x} y={label.y} fill="rgba(255,255,255,0.7)" fontSize={12} textAnchor="middle">
              {label.name}
            </text>
          ))}
          {quadrantLabels.map((label) => (
            <text key={label.name} x={label.x} y={label.y} fill="rgba(255,255,255,0.9)" fontSize={14} textAnchor="middle">
              {label.name}
            </text>
          ))}
        </g>
        {!hasData && (
          <text x={width / 2} y={height / 2} fill="rgba(255,255,255,0.7)" fontSize={16} textAnchor="middle">
            No items match current filters
          </text>
        )}
      </svg>
      {tooltip.visible ? (
        <div className="tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
          {tooltip.content.split('\n').map((line) => (
            <div key={line}>{line}</div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
