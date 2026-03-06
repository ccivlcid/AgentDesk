import type { RuntimeContext, RouteCollabExports, RouteOpsExports } from "../types/runtime-context.ts";
import { registerRoutesPartA } from "./routes/core.ts";
import { registerRoutesPartB } from "./routes/collab.ts";
import { registerRoutesPartC } from "./routes/ops.ts";
import { registerHeartbeatDeleteRoutesEarly } from "./routes/ops/heartbeat.ts";
import { ROUTE_RUNTIME_HELPER_KEYS } from "./runtime-helper-keys.ts";

export function registerApiRoutes(ctx: RuntimeContext): RouteCollabExports & RouteOpsExports {
  const runtime: RuntimeContext = ctx;

  // heartbeat DELETE는 다른 라우트보다 먼저 등록 (404 방지)
  registerHeartbeatDeleteRoutesEarly(runtime);

  Object.assign(runtime, registerRoutesPartB(runtime));
  Object.assign(runtime, registerRoutesPartA(runtime));
  Object.assign(runtime, registerRoutesPartC(runtime));

  const routeHelpers = Object.fromEntries(ROUTE_RUNTIME_HELPER_KEYS.map((key) => [key, runtime[key]])) as Omit<
    RouteCollabExports,
    "DEPT_KEYWORDS"
  > &
    RouteOpsExports;

  return {
    DEPT_KEYWORDS: runtime.DEPT_KEYWORDS,
    ...routeHelpers,
  };
}
