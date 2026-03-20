export const CRON_PRESETS = [
  { label: "Every 30 min", labelKo: "30분마다", expr: "*/30 * * * *", icon: "M12 6v6l3 3" },
  { label: "Hourly", labelKo: "매시간", expr: "0 * * * *", icon: "M12 6v6l4 2" },
  { label: "Daily 9 AM", labelKo: "매일 오전 9시", expr: "0 9 * * *", icon: "M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83" },
  { label: "Daily 6 PM", labelKo: "매일 오후 6시", expr: "0 18 * * *", icon: "M12 3a6 6 0 009 9 9 9 0 01-9-9z" },
  { label: "Weekdays 9 AM", labelKo: "평일 오전 9시", expr: "0 9 * * 1-5", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
  { label: "Weekly Mon 9 AM", labelKo: "매주 월요일 9시", expr: "0 9 * * 1", icon: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" },
  { label: "Monthly 1st 9 AM", labelKo: "매월 1일 9시", expr: "0 9 1 * *", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
];

export const PRIORITY_OPTIONS = [
  { value: 1, label: "Critical", labelKo: "긴급" },
  { value: 2, label: "High", labelKo: "높음" },
  { value: 3, label: "Normal", labelKo: "보통" },
  { value: 4, label: "Low", labelKo: "낮음" },
  { value: 5, label: "Lowest", labelKo: "최저" },
];
