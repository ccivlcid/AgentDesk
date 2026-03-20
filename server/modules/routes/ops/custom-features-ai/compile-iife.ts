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

    // Retry: remove unresolvable import lines anywhere in wrapper + inject empty stubs
    if (unresolved.length > 0) {
      let wrapperWithStubs = wrapper;
      for (const pkg of unresolved) {
        // Remove: import Foo from 'pkg'  /  import { Foo } from 'pkg'  /  import 'pkg'
        const escaped = pkg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        wrapperWithStubs = wrapperWithStubs.replace(
          new RegExp(`^import\\s[^;]*?from\\s+['"]${escaped}['"];?\\s*$`, "gm"),
          `// [stub] import from '${pkg}' removed`,
        );
        // Also stub the identifier so runtime doesn't crash
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
