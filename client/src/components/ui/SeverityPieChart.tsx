"use client";

import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { ShieldCheck, PieChart as PieIcon } from "lucide-react";

export interface SeveritySlice {
  name: string;
  value: number;
  color: string;
}

interface Props {
  data: SeveritySlice[];
  isLoading?: boolean;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="p-2.5 rounded-lg bg-[#141414] border border-[#282828] shadow-xl text-xs font-mono">
        <span className="font-bold text-white block mb-0.5">{data.name} Issues</span>
        <span className="text-neutral-300">
          Count: <strong className="text-white">{data.value}</strong>
        </span>
      </div>
    );
  }
  return null;
};

export default function SeverityPieChart({ data, isLoading }: Props) {
  const total = data.reduce((acc, curr) => acc + (curr.value || 0), 0);

  if (isLoading) {
    return (
      <div className="p-6 rounded-2xl bg-[#111111] border border-[#1F1F1F] h-72 flex items-center justify-center animate-pulse">
        <div className="w-32 h-32 rounded-full border-4 border-neutral-800" />
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="p-6 rounded-2xl bg-[#111111] border border-[#1F1F1F] h-72 flex flex-col items-center justify-center text-center space-y-2">
        <ShieldCheck className="w-8 h-8 text-emerald-400 mb-1" />
        <h4 className="text-sm font-bold font-mono text-white">
          Zero Issues Detected
        </h4>
        <p className="text-xs font-mono text-neutral-500 max-w-xs">
          This codebase is clean with 100% integrity across all severity tiers.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 rounded-2xl bg-[#111111] border border-[#1F1F1F] space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PieIcon className="w-4 h-4 text-white" />
          <h3 className="text-sm font-bold font-mono text-white uppercase tracking-wider">
            Severity Distribution
          </h3>
        </div>
        <span className="text-xs font-mono text-neutral-400">
          {total} Total Issues
        </span>
      </div>

      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={75}
              paddingAngle={4}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  stroke="#111111"
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value, entry: any) => (
                <span className="text-xs font-mono text-neutral-300">
                  {value} ({entry.payload?.value || 0})
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
