const iconStyle = { width: 12, height: 12 } as const;

export function IconTask() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={iconStyle}
    >
      <rect x="4" y="2" width="12" height="16" rx="2" />
      <path d="M8 7h4M8 10h4M8 13h2" />
    </svg>
  );
}

export function IconUrgent() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={iconStyle}
    >
      <path d="M11.5 2L4 11h7l-2.5 7L18 9h-7l.5-7z" />
    </svg>
  );
}
