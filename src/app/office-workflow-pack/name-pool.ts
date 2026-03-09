import type { Localized } from "./types";
import { NAME_POOL_A } from "./name-pool-a";
import { NAME_POOL_B } from "./name-pool-b";

export const DEPARTMENT_PERSON_NAME_POOL: Partial<Record<string, Localized[]>> = {
  ...NAME_POOL_A,
  ...NAME_POOL_B,
};
