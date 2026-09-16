"use client";

import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { TrendingUp, Clock } from "lucide-react";

export interface HealthTrendPoint {
  id: string;
  date: string;
  overall_score: number;
  overall_grade: string;
  security_score: number;
  code_quality_score: number;
  maintainability_score: number;
  performance_score: number;
}

interface Props {
  data: HealthTrendPoint[];
  isLoading?: boolean;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const point = payload[0].payload;
    return (
      <div className="p-3 rounded-xl bg-[#141414] border border-[#282828] shadow-2xl text-xs font-mono space-y-1">
        <div className="text-neutral-400 border-b border-[#282828] pb-1 font-bold">
          {point.date}
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-neutral-300">Overall Score:</span>
          <span className="font-bold text-emerald-400">
            {point.overall_score} (Grade {point.overall_grade})
          </span>
        </div>
        <div className="flex items-center justify-between gap-4 text-neutral-400">
          <span>Security:</span>
          <span>{point.security_score}</span>
        </div>
        <div className="flex items-center justify-between gap-4 text-neutral-400">
          <span>Quality:</span>
          <span>{point.code_quality_score}</span>
        </div>
      </div>
    );
  }
  return null;
};

export default function HealthTrendChart({ data, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="p-6 rounded-2xl bg-[#111111] border border-[#1F1F1F] h-72 flex items-center justify-center animate-pulse">
        <div className="w-full h-36 bg-neutral-900/60 rounded-xl" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="p-6 rounded-2xl bg-[#111111] border border-[#1F1F1F] h-72 flex flex-col items-center justify-center text-center space-y-2">
        <Clock className="w-8 h-8 text-neutral-500 mb-1" />
        <h4 className="text-sm font-bold font-mono text-white">
          No Trend Data Available
        </h4>
        <p className="text-xs font-mono text-neutral-500 max-w-xs">
          Calculate health scores to begin recording historical trend metrics.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 rounded-2xl bg-[#111111] border border-[#1F1F1F] space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-white" />
          <h3 className="text-sm font-bold font-mono text-white uppercase tracking-wider">
            Health Score Trend
          </h3>
        </div>
        <span className="text-xs font-mono text-neutral-400">
          {data.length} {data.length === 1 ? "Snapshot" : "Snapshots"} Recorded
        </span>
      </div>

      {data.length === 1 ? (
        <div className="h-56 w-full flex flex-col items-center justify-center text-center p-4 rounded-xl bg-[#141414] border border-[#222222]">
          <span className="text-2xl font-bold font-mono text-emerald-400 mb-1">
            {data[0].overall_score} / 100 (Grade {data[0].overall_grade})
          </span>
          <p className="text-xs font-mono text-neutral-400 max-w-sm">
            Initial health baseline established on {data[0].date}. Re-calculate health after code updates to track score trends over time.
          </p>
        </div>
      ) : (
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222222" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="#555555"
                fontSize={10}
                fontFamily="monospace"
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={[0, 100]}
                stroke="#555555"
                fontSize={10}
                fontFamily="monospace"
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="overall_score"
                stroke="#10B981"
                strokeWidth={3}
                dot={{ fill: "#10B981", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: "#FFFFFF", stroke: "#10B981" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
