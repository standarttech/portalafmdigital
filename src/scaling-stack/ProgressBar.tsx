interface ProgressBarProps {
  current: number;
  total: number;
}

const ProgressBar = ({ current, total }: ProgressBarProps) => {
  const pct = Math.round((current / total) * 100);
  return (
    <div className="px-6 pb-5 pt-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-[hsl(var(--ss-muted-fg))]">
          Step {current} of {total}
        </span>
        <span className="text-xs font-medium text-[hsl(var(--ss-muted-fg))]">
          {pct}%
        </span>
      </div>
      <div className="ss-progress-track">
        <div className="ss-progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

export default ProgressBar;
