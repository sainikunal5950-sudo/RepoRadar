"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { BarChart3, CheckCircle2 } from "lucide-react";

export interface IssueTypeItem {
  type: string;
  count: number;
  color: string;
}

interface Props {
  data: IssueTypeItem[];
  isLoading?: boolean;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="p-2.5 rounded-lg bg-[#141414] border border-[#282828] shadow-xl text-xs font-mono">
        <span className="font-bold text-white block mb-0.5">{data.type}</span>
        <span className="text-neutral-300">
          Issues: <strong className="text-white">{data.count}</strong>
        </span>
      </div>
    );
  }
  return null;
};

export default function IssueTypeBarChart({ data, isLoading }: Props) {
  const total = data.reduce((acc, curr) => acc + (curr.count || 0), 0);

  if (isLoading) {
    return (
      <div className="p-6 rounded-2xl bg-[#111111] border border-[#1F1F1F] h-72 flex items-center justify-center animate-pulse">
        <div className="w-full h-36 bg-neutral-900/60 rounded-xl" />
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="p-6 rounded-2xl bg-[#111111] border border-[#1F1F1F] h-72 flex flex-col items-center justify-center text-center space-y-2">
        <CheckCircle2 className="w-8 h-8 text-emerald-400 mb-1" />
        <h4 className="text-sm font-bold font-mono text-white">
          No Category Violations
        </h4>
        <p className="text-xs font-mono text-neutral-500 max-w-xs">
          Zero anti-patterns detected across security, bug, performance, and code smell rules.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 rounded-2xl bg-[#111111] border border-[#1F1F1F] space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-white" />
          <h3 className="text-sm font-bold font-mono text-white uppercase tracking-wider">
            Issue Category Breakdown
          </h3>
        </div>
        <span className="text-xs font-mono text-neutral-400">
          By Issue Type
        </span>
      </div>

      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="type"
              stroke="#555555"
              fontSize={11}
              fontFamily="monospace"
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#555555"
              fontSize={11}
              fontFamily="monospace"
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
