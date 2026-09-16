import React from "react";

interface ScoreGaugeProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
  className?: string;
}

export default function ScoreGauge({
  score,
  size = 120,
  strokeWidth = 10,
  showLabel = true,
  className = "",
}: ScoreGaugeProps) {
  const clampedScore = Math.max(0, Math.min(100, Math.round(score)));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clampedScore / 100) * circumference;

  let color = "text-emerald-400 stroke-emerald-500";
  let glowColor = "rgba(16, 185, 129, 0.25)";

  if (clampedScore < 40) {
    color = "text-red-400 stroke-red-500";
    glowColor = "rgba(239, 68, 68, 0.25)";
  } else if (clampedScore < 60) {
    color = "text-orange-400 stroke-orange-500";
    glowColor = "rgba(249, 115, 22, 0.25)";
  } else if (clampedScore < 80) {
    color = "text-yellow-400 stroke-yellow-500";
    glowColor = "rgba(234, 179, 8, 0.25)";
  }

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
        style={{ filter: `drop-shadow(0 0 12px ${glowColor})` }}
      >
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          stroke="#222222"
          fill="none"
        />
        {/* Progress Indicator */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="none"
          className={`transition-all duration-1000 ease-out ${color}`}
        />
      </svg>

      {showLabel && (
        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className={`font-bold font-mono text-white ${size > 90 ? "text-2xl" : "text-base"}`}>
            {clampedScore}
          </span>
          <span className="text-[10px] font-mono text-neutral-500">/100</span>
        </div>
      )}
    </div>
  );
}
