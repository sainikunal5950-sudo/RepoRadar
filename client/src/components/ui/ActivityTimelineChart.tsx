import React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Activity, Calendar } from "lucide-react";

export interface ActivityTimelineDataPoint {
  date: string;
  commit_count: number;
  additions: number;
  deletions: number;
}

interface ActivityTimelineChartProps {
  data: ActivityTimelineDataPoint[];
  groupBy: "day" | "week" | "month";
  onGroupByChange?: (groupBy: "day" | "week" | "month") => void;
  isLoading?: boolean;
}

export default function ActivityTimelineChart({
  data,
  groupBy,
  onGroupByChange,
  isLoading = false,
}: ActivityTimelineChartProps) {
  const totalCommits = data.reduce((acc, d) => acc + d.commit_count, 0);
  const totalAdditions = data.reduce((acc, d) => acc + d.additions, 0);
  const totalDeletions = data.reduce((acc, d) => acc + d.deletions, 0);

  const formatTick = (val: string) => {
    if (!val) return "";
    if (groupBy === "month") {
      const [year, month] = val.split("-");
      const d = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
      return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    }
    const d = new Date(val);
    return isNaN(d.getTime()) ? val : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const point = payload[0].payload as ActivityTimelineDataPoint;
      return (
        <div className="bg-neutral-900 border border-neutral-700 p-3 rounded-lg shadow-xl font-mono text-xs z-50">
          <p className="text-neutral-300 font-semibold mb-2 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-blue-400" />
            {label}
          </p>
          <div className="space-y-1">
            <p className="text-blue-400 font-medium">
              Commits: <span className="text-white font-bold">{point.commit_count}</span>
            </p>
            <p className="text-emerald-400">
              Lines Added: +{point.additions.toLocaleString()}
            </p>
            <p className="text-rose-400">
              Lines Deleted: -{point.deletions.toLocaleString()}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div
      data-testid="activity-timeline-chart"
      className="p-6 bg-neutral-900/60 border border-neutral-800 rounded-xl flex flex-col"
    >
      {/* Header with Granularity Toggle */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">Commit Activity Over Time</h3>
          </div>
          <p className="text-xs text-neutral-400 font-mono mt-0.5">
            {totalCommits.toLocaleString()} commits &bull; +{totalAdditions.toLocaleString()} / -{totalDeletions.toLocaleString()} lines
          </p>
        </div>

        {onGroupByChange && (
          <div className="flex items-center bg-neutral-950 p-1 rounded-lg border border-neutral-800 text-xs font-mono">
            {(["day", "week", "month"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => onGroupByChange(mode)}
                className={`px-3 py-1 rounded-md capitalize transition-all ${
                  groupBy === mode
                    ? "bg-neutral-800 text-white font-semibold shadow-sm"
                    : "text-neutral-400 hover:text-neutral-200"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Chart Canvas */}
      {isLoading ? (
        <div className="h-64 flex items-center justify-center text-neutral-500 font-mono text-sm">
          Loading activity timeline...
        </div>
      ) : data.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-neutral-500 font-mono text-sm border border-dashed border-neutral-800 rounded-lg">
          No commit activity recorded in this period.
        </div>
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="commitGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={formatTick}
                stroke="#525252"
                fontSize={11}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                stroke="#525252"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="commit_count"
                stroke="#3b82f6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#commitGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
