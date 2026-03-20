import type { RuntimeContext } from "../../../../types/runtime-context.ts";
import { createAgentCrudHelpers } from "./crud-helpers.ts";
import { registerAgentReadRoutes } from "./register-agent-routes-read.ts";
import { registerAgentPersonaRoutes } from "./register-agent-routes-persona.ts";
import { registerAgentWriteRoutes } from "./register-agent-routes-write.ts";
import { registerAgentPatchRoutes } from "./register-agent-patch.ts";
import { registerAgentMetricsRoutes } from "./register-agent-routes-metrics.ts";

export function registerAgentCrudRoutes(ctx: RuntimeContext): void {
  const helpers = createAgentCrudHelpers(ctx.db);

  registerAgentReadRoutes(ctx.app, ctx, helpers);
  registerAgentPersonaRoutes(ctx.app, ctx, helpers);
  registerAgentWriteRoutes(ctx.app, ctx, helpers);
  registerAgentPatchRoutes(ctx.app, ctx, helpers);
  registerAgentMetricsRoutes(ctx.app, ctx);
}
