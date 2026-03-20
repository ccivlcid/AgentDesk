export type { DirectiveAndInboxRouteCtx, DirectiveAndInboxRouteDeps } from "./directives-inbox/types.ts";

import { createDirectiveLeaderLookup } from "./directives-inbox/directive-leader-lookup.ts";
import { registerApiDirectivesRoute } from "./directives-inbox/register-api-directives-route.ts";
import { registerApiInboxRoute } from "./directives-inbox/register-api-inbox-route.ts";
import type { DirectiveAndInboxRouteCtx, DirectiveAndInboxRouteDeps } from "./directives-inbox/types.ts";

export function registerDirectiveAndInboxRoutes(
  ctx: DirectiveAndInboxRouteCtx,
  deps: DirectiveAndInboxRouteDeps,
): void {
  const { findDirectiveLeader } = createDirectiveLeaderLookup(
    ctx.db,
    deps.normalizeTextField,
    deps.findTeamLeader,
  );
  registerApiDirectivesRoute(ctx, deps, findDirectiveLeader);
  registerApiInboxRoute(ctx, deps, findDirectiveLeader);
}
