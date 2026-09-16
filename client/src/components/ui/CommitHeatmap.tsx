import React, { useState } from "react";
import { Flame, Clock } from "lucide-react";

export interface HeatmapData {
  matrix: number[][]; // [day 0..6][hour 0..23]
  points: { day: number; dayName: string; hour: number; count: number }[];
  maxCount: number;
  totalCommits: number;
}

interface CommitHeatmapProps {
  data?: HeatmapData | null;
  isLoading?: boolean;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function CommitHeatmap({ data, isLoading = false }: CommitHeatmapProps) {
  const [hoveredCell, setHoveredCell] = useState<{
    day: string;
    hour: number;
    count: number;
  } | null>(null);

  const matrix = data?.matrix || Array.from({ length: 7 }, () => Array(24).fill(0));
  const maxCount = data?.maxCount || 1;

  // Calculates intensity bucket (0 to 4)
  const getCellColor = (count: number) => {
    if (count === 0) return "bg-neutral-900 border-neutral-800/80";
    const ratio = count / Math.max(1, maxCount);
    if (ratio < 0.25) return "bg-blue-950/60 border-blue-900/50 text-blue-300";
    if (ratio < 0.5) return "bg-blue-800/70 border-blue-700/60 text-white";
    if (ratio < 0.75) return "bg-blue-600 border-blue-500 text-white font-bold";
    return "bg-indigo-500 border-indigo-400 text-white font-extrabold shadow-sm shadow-indigo-500/20";
  };

  return (
    <div
      data-testid="commit-heatmap"
      className="p-6 bg-neutral-900/60 border border-neutral-800 rounded-xl flex flex-col"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-semibold text-white">Punch Card / Coding Heatmap</h3>
          </div>
          <p className="text-xs text-neutral-400 font-mono mt-0.5">
            Commit density distribution across days of the week and hours of the day (24h format)
          </p>
        </div>

        {hoveredCell && (
          <div className="text-xs font-mono px-3 py-1 bg-neutral-950 border border-neutral-700 rounded-lg text-neutral-200">
            <span className="font-semibold text-blue-400">{hoveredCell.count}</span> commits on{" "}
            <span className="font-semibold text-white">{hoveredCell.day}</span> at{" "}
            <span className="font-semibold text-white">
              {String(hoveredCell.hour).padStart(2, "0")}:00
            </span>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="h-56 flex items-center justify-center text-neutral-500 font-mono text-sm">
          Loading heatmap distribution...
        </div>
      ) : (
        <div className="overflow-x-auto pb-2">
          <div className="min-w-[700px]">
            {/* Hour Headers (00 to 23) */}
            <div className="flex items-center mb-2 pl-12">
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="flex-1 text-center text-[10px] font-mono text-neutral-500"
                >
                  {hour % 3 === 0 ? `${hour}h` : ""}
                </div>
              ))}
            </div>

            {/* Matrix Grid (7 rows of 24 cells) */}
            <div className="space-y-1.5">
              {DAYS.map((dayName, dayIdx) => (
                <div key={dayName} className="flex items-center gap-2">
                  <span className="w-10 text-xs font-mono font-medium text-neutral-400 text-right pr-1">
                    {dayName}
                  </span>
                  <div className="flex-1 grid grid-cols-24 gap-1.5" style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}>
                    {HOURS.map((hour) => {
                      const count = matrix[dayIdx]?.[hour] || 0;
                      return (
                        <div
                          key={`${dayIdx}-${hour}`}
                          onMouseEnter={() =>
                            setHoveredCell({ day: dayName, hour, count })
                          }
                          onMouseLeave={() => setHoveredCell(null)}
                          className={`h-7 rounded border transition-all duration-150 cursor-pointer flex items-center justify-center text-[10px] select-none hover:scale-110 hover:z-10 ${getCellColor(
                            count
                          )}`}
                          title={`${count} commits on ${dayName} at ${hour}:00`}
                        >
                          {count > 0 ? count : ""}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Legend & Summary Footer */}
            <div className="flex items-center justify-between mt-5 pt-3 border-t border-neutral-800/80 text-xs font-mono text-neutral-400">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-neutral-500" />
                <span>Peak activity hour: 24h schedule</span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-neutral-500 mr-1">Less</span>
                <div className="w-3.5 h-3.5 rounded bg-neutral-900 border border-neutral-800" />
                <div className="w-3.5 h-3.5 rounded bg-blue-950 border border-blue-900/50" />
                <div className="w-3.5 h-3.5 rounded bg-blue-800 border border-blue-700/60" />
                <div className="w-3.5 h-3.5 rounded bg-blue-600 border border-blue-500" />
                <div className="w-3.5 h-3.5 rounded bg-indigo-500 border border-indigo-400" />
                <span className="text-[11px] text-neutral-500 ml-1">More</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
