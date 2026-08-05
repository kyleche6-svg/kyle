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
        className={`mt-1 text-3xl font-semibold tabular-nums ${
          accent ? "text-accent" : "text-foreground"
        }`}
      >
        {value}
      </p>
      {delta && (
        <p
          className={`mt-1 text-xs tabular-nums ${
            isPositive
              ? "text-emerald-400"
              : isNegative
                ? "text-red-400"
                : "text-muted"
          }`}
        >
          {delta}
        </p>
      )}
    </div>
  );
}
