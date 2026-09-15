import React, { useState } from 'react';

export interface DataPoint {
  label: string;
  value: number;
  secondaryValue?: number;
}

interface AdminAreaChartProps {
  data: DataPoint[];
  title?: string;
  subtitle?: string;
  height?: number;
  color?: string;
  valuePrefix?: string;
  valueSuffix?: string;
  className?: string;
}

export function AdminAreaChart({
  data,
  title,
  subtitle,
  height = 220,
  color = '#e50914',
  valuePrefix = '',
  valueSuffix = '',
  className = '',
}: AdminAreaChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 bg-card border border-white/10 rounded-2xl text-xs text-slate-500">
        No chart telemetry data available.
      </div>
    );
  }

  const values = data.map((d) => d.value);
  const maxValue = Math.max(...values, 1);
  const minValue = Math.min(...values, 0);
  const range = maxValue - minValue || 1;

  // SVG dimensions
  const svgWidth = 800;
  const svgHeight = height;
  const paddingX = 40;
  const paddingY = 25;
  const graphWidth = svgWidth - paddingX * 2;
  const graphHeight = svgHeight - paddingY * 2;

  const getCoordinates = (index: number, val: number) => {
    const x = paddingX + (index / Math.max(data.length - 1, 1)) * graphWidth;
    const normalizedY = (val - minValue) / range;
    const y = svgHeight - paddingY - normalizedY * graphHeight;
    return { x, y };
  };

  const points = data.map((d, i) => getCoordinates(i, d.value));

  // Build path d
  const linePath = points.reduce((acc, pt, i) => {
    if (i === 0) return `M ${pt.x},${pt.y}`;
    // Simple smooth curve or line
    return `${acc} L ${pt.x},${pt.y}`;
  }, '');

  const areaPath = `
    ${linePath}
    L ${points[points.length - 1].x},${svgHeight - paddingY}
    L ${points[0].x},${svgHeight - paddingY}
    Z
  `;

  return (
    <div
      className={`p-5 rounded-2xl bg-card border border-white/10 flex flex-col justify-between ${className}`}
    >
      {(title || subtitle) && (
        <div className="flex items-center justify-between mb-4">
          <div>
            {title && <h4 className="text-sm font-bold text-white">{title}</h4>}
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>

          {hoveredIndex !== null && data[hoveredIndex] && (
            <div className="px-3 py-1 bg-white/10 border border-white/15 rounded-lg text-xs font-semibold text-white animate-fade-in">
              <span className="text-slate-400 mr-1.5">{data[hoveredIndex].label}:</span>
              <span className="text-primary font-bold">
                {valuePrefix}
                {data[hoveredIndex].value.toLocaleString()}
                {valueSuffix}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto overflow-visible select-none"
        >
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.35" />
              <stop offset="100%" stopColor={color} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((step, idx) => {
            const y = svgHeight - paddingY - step * graphHeight;
            const stepVal = Math.round(minValue + step * range);
            return (
              <g key={idx}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={svgWidth - paddingX}
                  y2={y}
                  stroke="rgba(255,255,255,0.06)"
                  strokeDasharray="4 4"
                />
                <text
                  x={paddingX - 10}
                  y={y + 3}
                  textAnchor="end"
                  fill="#64748b"
                  fontSize="10"
                  fontFamily="sans-serif"
                >
                  {valuePrefix}
                  {stepVal}
                  {valueSuffix}
                </text>
              </g>
            );
          })}

          {/* Area Fill */}
          <path d={areaPath} fill="url(#areaGradient)" />

          {/* Stroke Line */}
          <path
            d={linePath}
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data Points */}
          {points.map((pt, idx) => {
            const isHovered = hoveredIndex === idx;
            return (
              <g
                key={idx}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="cursor-pointer"
              >
                {/* Larger invisible hitbox */}
                <circle cx={pt.x} cy={pt.y} r="14" fill="transparent" />
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? '6' : '3.5'}
                  fill={isHovered ? '#fff' : color}
                  stroke="#18181b"
                  strokeWidth="2"
                  className="transition-all duration-150"
                />
              </g>
            );
          })}
        </svg>

        {/* Labels below */}
        <div className="flex justify-between px-2 pt-2 text-[10px] text-slate-500 font-mono">
          <span>{data[0]?.label}</span>
          {data.length > 2 && (
            <span>{data[Math.floor(data.length / 2)]?.label}</span>
          )}
          <span>{data[data.length - 1]?.label}</span>
        </div>
      </div>
    </div>
  );
}

interface AdminBarChartProps {
  data: DataPoint[];
  title?: string;
  subtitle?: string;
  barColor?: string;
  valueSuffix?: string;
  className?: string;
}

export function AdminBarChart({
  data,
  title,
  subtitle,
  barColor = 'bg-primary',
  valueSuffix = '',
  className = '',
}: AdminBarChartProps) {
  if (!data || data.length === 0) return null;
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className={`p-5 rounded-2xl bg-card border border-white/10 space-y-4 ${className}`}>
      {(title || subtitle) && (
        <div>
          {title && <h4 className="text-sm font-bold text-white">{title}</h4>}
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      )}

      <div className="space-y-3 pt-1">
        {data.map((item, idx) => {
          const percent = Math.round((item.value / maxValue) * 100);
          return (
            <div key={idx} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium truncate max-w-[200px]">
                  {item.label}
                </span>
                <span className="text-white font-mono font-semibold">
                  {item.value.toLocaleString()} {valueSuffix}
                </span>
              </div>
              <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
