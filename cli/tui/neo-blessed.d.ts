/**
 * neo-blessed is API-compatible with blessed.
 * Re-export all types from @types/blessed.
 */
declare module "neo-blessed" {
  import blessed from "blessed";
  export = blessed;
}
