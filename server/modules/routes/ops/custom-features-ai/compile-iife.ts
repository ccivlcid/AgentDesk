import { build as esbuild } from "esbuild";
import logger from "../../../../lib/logger.ts";
import { FEATURE_DIR } from "./paths.ts";

/** TSX 컴포넌트 코드를 IIFE JS로 컴파일 (React 번들 포함) */
export async function compileToIife(code: string): Promise<string> {
  const wrapper = `
import React from 'react';
import { createRoot } from 'react-dom/client';

${code}

const root = createRoot(document.getElementById('root'));
root.render(React.createElement(CustomFeatureWidget, {
  config: (typeof window !== 'undefined' && window.__agdConfig) ? window.__agdConfig : {}
}));
`;
  const buildOpts = {
    // resolveDir을 FEATURE_DIR로 설정 → feature/node_modules/ 우선 탐색, 없으면 상위 node_modules/ 폴백
    stdin: { contents: wrapper, loader: "tsx" as const, resolveDir: FEATURE_DIR },
    bundle: true,
    format: "iife" as const,
    platform: "browser" as const,
    write: false,
    define: { "process.env.NODE_ENV": '"production"' },
    logLevel: "silent" as const,
  };

  // Helper: extract readable error details from esbuild BuildFailure
  function extractBuildErrors(err: unknown): { details: string; unresolved: string[] } {
    const buildErr = err as { errors?: Array<{ text: string; location?: { line?: number } }> };
    const errors = buildErr.errors ?? [];
    const details = errors.slice(0, 3).map((e) => {
      const loc = e.location ? ` (line ${e.location.line})` : "";
      return `${e.text}${loc}`;
    }).join(" | ");
    // Collect "Could not resolve 'pkg'" package names
    const unresolved = errors
      .map((e) => e.text.match(/Could not resolve ['"]([^'"]+)['"]/)?.[1])
      .filter((x): x is string => !!x);
    return { details: details || String(err), unresolved };
  }

  try {
    const result = await esbuild(buildOpts);
    return result.outputFiles![0].text;
  } catch (err) {
    const { details, unresolved } = extractBuildErrors(err);

    // Retry: remove unresolvable import lines anywhere in wrapper + inject per-binding stubs
    if (unresolved.length > 0) {
      let wrapperWithStubs = wrapper;
      for (const pkg of unresolved) {
        const escaped = pkg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        // Match the full import statement (skip `import type …` — no runtime effect)
        const importRe = new RegExp(
          `^import\\s+(?!type\\s+)(.*?)\\s+from\\s+['"]${escaped}['"];?\\s*$`,
          "gm",
        );
        wrapperWithStubs = wrapperWithStubs.replace(importRe, (_match, clause: string) => {
          const stubs: string[] = [`// [stub] import '${pkg}' removed`];

          // Named imports: { A, B as C, ... }
          const namedM = clause.match(/\{([^}]+)\}/);
          if (namedM) {
            const names = (namedM[1] as string)
              .split(",")
              .map((n) => {
                const parts = n.trim().split(/\s+as\s+/);
                return (parts[parts.length - 1] ?? "").trim();
              })
              .filter((n) => /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(n));
            if (names.length > 0) stubs.push(`var { ${names.join(", ")} } = {};`);
          }

          // Default import: import Foo from 'pkg'  (not: import { } or import *)
          const defaultM = clause.match(/^([a-zA-Z_$][a-zA-Z0-9_$]*)\s*$/);
          if (defaultM) stubs.push(`var ${defaultM[1]} = {};`);

          // Namespace import: * as Foo
          const nsM = clause.match(/\*\s+as\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/);
          if (nsM) stubs.push(`var ${nsM[1]} = new Proxy({}, { get: () => () => null });`);

          return stubs.join("\n");
        });
        // Also stub the bare package variable (for side-effect imports or missed cases)
        const stubName = pkg.replace(/[^a-zA-Z0-9_$]/g, "_");
        wrapperWithStubs += `\nif(typeof ${stubName}==="undefined"){var ${stubName}=new Proxy({},{get:()=>()=>null});}\n`;
      }
      try {
        const retryResult = await esbuild({ ...buildOpts, stdin: { ...buildOpts.stdin, contents: wrapperWithStubs } });
        logger.warn(`[compileToIife] retried without: ${unresolved.join(", ")}`);
        return retryResult.outputFiles![0].text;
      } catch { /* fall through to throw original error */ }
    }

    throw new Error(`esbuild: ${details}`);
  }
}
