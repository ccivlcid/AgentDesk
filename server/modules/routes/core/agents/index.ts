import type { RuntimeContext } from "../../../../types/runtime-context.ts";
import { registerAgentCrudRoutes } from "./crud.ts";
import { registerAgentProcessInspectorRoutes } from "./process-inspector.ts";
import { registerAgentSpawnRoute } from "./spawn.ts";
import { registerAgentAvatarRoutes } from "./avatar.ts";

export function registerAgentRoutes(ctx: RuntimeContext): void {
  registerAgentProcessInspectorRoutes(ctx);
  registerAgentCrudRoutes(ctx);
  registerAgentSpawnRoute(ctx);
  registerAgentAvatarRoutes(ctx);
}
