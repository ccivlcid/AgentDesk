/** 위험 패턴 검증 — 거부 시 이유 문자열 반환, 통과 시 null */
export function validateBundle(code: string): string | null {
  const BLOCKED = [
    /\beval\s*\(/,
    /\bnew\s+Function\s*\(/,
    /\brequire\s*\(/,
    /\bimport\s*\(/,
    /process\.env/,
    /document\.write/,
    /window\.location\s*=/,
    /localStorage\.clear/,
    /IndexedDB/i,
    /XMLHttpRequest/,
  ];
  for (const re of BLOCKED) {
    if (re.test(code)) return `blocked pattern: ${re.source}`;
  }
  // fetch는 /api/* 경로만 허용
  const fetchCalls = code.match(/fetch\s*\(\s*["'`]([^"'`]+)["'`]/g) ?? [];
  for (const call of fetchCalls) {
    const m = call.match(/fetch\s*\(\s*["'`]([^"'`]+)["'`]/);
    if (m && !m[1].startsWith("/api/") && !m[1].startsWith("http://127.0.0.1")) {
      return `blocked fetch target: ${m[1]}`;
    }
  }
  return null;
}
