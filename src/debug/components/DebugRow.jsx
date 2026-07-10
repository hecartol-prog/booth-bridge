/**
 * @param {{ label: string, value?: React.ReactNode, mono?: boolean }} props
 */
export function DebugRow({ label, value, mono = false }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1 text-xs">
      <span className="shrink-0 text-slate-400">{label}</span>
      <span
        className={`text-right break-all text-slate-200 ${mono ? "font-mono text-[11px]" : ""}`}
      >
        {value ?? "—"}
      </span>
    </div>
  );
}
