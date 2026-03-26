export function CliSpinnerFallback() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", gap: 10, fontFamily: "var(--th-font-mono)", fontSize: 11, color: "#9CA3AF" }}>
      <svg className="animate-spin" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <circle cx="12" cy="12" r="10" strokeOpacity={0.2} />
        <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
      </svg>
      loading...
    </div>
  );
}
