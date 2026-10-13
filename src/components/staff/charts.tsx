"use client";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

// Single-series charts: navy marks on white, recessive grid, tooltip on hover, no legend (title names the series).
const INK = "#486581";
const GRID = "#E4E9F0";
const MARK = "#102A43";

function Tip({ active, payload, label, unit }: { active?: boolean; payload?: { value: number }[]; label?: string; unit: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-line bg-white px-3 py-2 text-sm shadow-sm">
      <p className="text-slate">{label}</p>
      <p className="font-semibold text-navy">{payload[0].value} {unit}</p>
    </div>
  );
}

export function HBarChart({ data, unit }: { data: { label: string; value: number }[]; unit: string }) {
  const h = Math.max(160, data.length * 30 + 30);
  return (
    <div style={{ height: h }} role="img" aria-label={`Bar chart: ${data.map((d) => `${d.label} ${d.value}`).join(", ")}`}>
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }} barCategoryGap={6}>
          <CartesianGrid horizontal={false} stroke={GRID} />
          <XAxis type="number" allowDecimals={false} tick={{ fill: INK, fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="label" width={170} tick={{ fill: "#102A43", fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip cursor={{ fill: "#EAF0F6" }} content={<Tip unit={unit} />} />
          <Bar isAnimationActive={false} dataKey="value" fill={MARK} radius={[0, 4, 4, 0]} maxBarSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TrendChart({ data, unit }: { data: { label: string; value: number }[]; unit: string }) {
  return (
    <div style={{ height: 220 }} role="img" aria-label={`Trend: ${data.map((d) => `${d.label} ${d.value}`).join(", ")}`}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ left: 0, right: 16, top: 8, bottom: 4 }}>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey="label" tick={{ fill: INK, fontSize: 12 }} axisLine={{ stroke: GRID }} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fill: INK, fontSize: 12 }} axisLine={false} tickLine={false} width={32} />
          <Tooltip cursor={{ stroke: "#829AB1", strokeDasharray: "3 3" }} content={<Tip unit={unit} />} />
          <Line isAnimationActive={false} type="monotone" dataKey="value" stroke={MARK} strokeWidth={2} dot={{ r: 4, fill: MARK, stroke: "#fff", strokeWidth: 2 }} activeDot={{ r: 6 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
