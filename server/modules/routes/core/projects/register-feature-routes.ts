import type { ProjectRoutesDeps } from "./types.ts";
import { registerBurndownSourcesRoutes } from "./register-burndown-sources-routes.ts";
import { registerTemplatesDeliverablesRoutes } from "./register-templates-deliverables-routes.ts";

export function registerFeatureRoutes(deps: ProjectRoutesDeps): void {
  registerBurndownSourcesRoutes(deps);
  registerTemplatesDeliverablesRoutes(deps);
}
