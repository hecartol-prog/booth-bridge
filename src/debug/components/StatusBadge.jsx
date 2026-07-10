import { cn } from "@/lib/utils";

const STATUS_STYLES = {
  PASS: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  RUNNING: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  FAILED: "bg-red-500/20 text-red-400 border-red-500/30",
  SKIP: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  IDLE: "bg-slate-700/40 text-slate-500 border-slate-600/30",
};

/**
 * @param {{ status: string, className?: string }} props
 */
export function StatusBadge({ status, className }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.IDLE;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-mono font-medium uppercase",
        style,
        className
      )}
    >
      {status}
    </span>
  );
}
