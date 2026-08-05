import { TrendUp, TrendDown, Minus } from "@phosphor-icons/react/dist/ssr";

export function StatNumber({
  label,
  value,
  delta,
  accent = false,
}: {
  label: string;
  value: string;
  delta?: string;
  accent?: boolean;
}) {
  const isPositive = delta?.startsWith("+");
  const isNegative = delta?.startsWith("-");

  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p
        className={`mt-1 font-mono text-3xl font-semibold tabular-nums ${
          accent ? "text-accent" : "text-foreground"
        }`}
      >
        {value}
      </p>
      {delta && (
        <p
          className={`mt-1 flex items-center gap-1 font-mono text-xs tabular-nums ${
            isPositive
              ? "text-positive"
              : isNegative
                ? "text-negative"
                : "text-muted"
          }`}
        >
          {isPositive ? (
            <TrendUp size={12} weight="bold" />
          ) : isNegative ? (
            <TrendDown size={12} weight="bold" />
          ) : (
            <Minus size={12} weight="bold" />
          )}
          {delta}
        </p>
      )}
    </div>
  );
}
