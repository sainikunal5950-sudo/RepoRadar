import React from "react";

interface ScoreCardProps {
  title: string;
  score: number;
  weight: string;
  icon: React.ElementType;
  description?: string;
  className?: string;
}

export default function ScoreCard({
  title,
  score,
  weight,
  icon: Icon,
  description,
  className = "",
}: ScoreCardProps) {
  const clampedScore = Math.max(0, Math.min(100, Math.round(score)));

  let color = "text-emerald-400";
  let barColor = "bg-emerald-500";
  let borderHover = "hover:border-emerald-500/40";

  if (clampedScore < 40) {
    color = "text-red-400";
    barColor = "bg-red-500";
    borderHover = "hover:border-red-500/40";
  } else if (clampedScore < 60) {
    color = "text-orange-400";
    barColor = "bg-orange-500";
    borderHover = "hover:border-orange-500/40";
  } else if (clampedScore < 80) {
    color = "text-yellow-400";
    barColor = "bg-yellow-500";
    borderHover = "hover:border-yellow-500/40";
  }

  return (
    <div
      className={`p-5 rounded-2xl bg-[#111111] border border-[#1F1F1F] transition-all ${borderHover} space-y-4 flex flex-col justify-between ${className}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[#181818] border border-[#282828]">
            <Icon className={`w-4 h-4 ${color}`} />
          </div>
          <div>
            <h4 className="text-sm font-bold font-mono text-white tracking-wide">
              {title}
            </h4>
            <span className="text-[11px] font-mono text-neutral-500">
              Weight: {weight}
            </span>
          </div>
        </div>

        <div className="text-right">
          <span className={`text-2xl font-bold font-mono ${color}`}>
            {clampedScore}
          </span>
          <span className="text-xs font-mono text-neutral-500">/100</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="w-full h-2 bg-[#1A1A1A] rounded-full overflow-hidden">
          <div
            className={`h-full ${barColor} rounded-full transition-all duration-1000 ease-out`}
            style={{ width: `${clampedScore}%` }}
          />
        </div>
        {description && (
          <p className="text-[11px] font-mono text-neutral-400 leading-relaxed">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
