"use client";

type StatCardColor = "green" | "yellow" | "red";

const STAT_CARD_COLOR_CLASS: Record<StatCardColor, string> = {
  green: "border-green-activity/30 text-green-activity",
  yellow: "border-yellow-activity/30 text-yellow-activity",
  red: "border-red-activity/30 text-red-activity",
};

interface StatCardProps {
  label: string;
  value: string;
  sub: string;
  color: StatCardColor;
}

export function StatCard({ label, value, sub, color }: StatCardProps) {
  return (
    <div className={`bg-card border rounded-md p-3 ${STAT_CARD_COLOR_CLASS[color]}`}>
      <p className="text-xs opacity-70">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
      <p className="text-xs opacity-70">{sub}</p>
    </div>
  );
}
