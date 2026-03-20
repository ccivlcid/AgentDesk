/** 응답 텍스트에서 ```tsx?``` 코드 블록 추출 */
export function extractCodeBlock(text: string): string {
  const m = text.match(/```(?:tsx?|jsx?|react)?\s*\n?([\s\S]+?)```/);
  if (m) return m[1].trim();
  // No fenced block — return raw text (caller must validate)
  return text.trim();
}

/** 추출된 코드가 실제 JS/TS 코드인지 기본 검증 */
export function assertValidCode(code: string): void {
  const first = code.trimStart();
  const validStarters = [
    /^import\b/,
    /^export\s+(default\s+)?(function|class|const|async)/,
    /^(const|let|var|function|class)\b/,
    /^\/\//,        // comment
    /^\/\*/,        // block comment
    /^"use /,       // "use strict" etc
  ];
  if (!validStarters.some((re) => re.test(first))) {
    const preview = first.slice(0, 80).replace(/\n/g, " ");
    throw new Error(`AI가 코드 블록을 반환하지 않았습니다. 응답 시작: "${preview}..."`);
  }
}

/** 응답 텍스트에서 SVG 아이콘 + TSX 컴포넌트 두 블록 추출 */
function extractSvgAndCode(text: string): { svg: string | null; code: string } {
  const svgMatch = text.match(/```svg\s*\n?([\s\S]+?)```/);
  const codeMatch = text.match(/```(?:tsx?|jsx?|react?)\s*\n?([\s\S]+?)```/);
  return {
    svg: svgMatch ? svgMatch[1].trim() : null,
    code: codeMatch ? codeMatch[1].trim() : extractCodeBlock(text),
  };
}

export function extractSvg(text: string): string | null {
  const m = text.match(/```svg\s*\n?([\s\S]+?)```/);
  if (m) return m[1].trim();
  // fallback: bare <svg ...> block
  const bare = text.match(/(<svg[\s\S]+?<\/svg>)/i);
  return bare ? bare[1].trim() : null;
}
