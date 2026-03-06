/* ================================================================== */
/*  Default Drawer — wraps existing drawing functions                   */
/* ================================================================== */

import type { FurnitureDrawer } from "./index";
import { drawDesk, drawChair, drawPlant, drawWhiteboard } from "../drawing-furniture-a";
import {
  drawBookshelf,
  drawCoffeeMachine,
  drawSofa,
  drawCoffeeTable,
  drawHighTable,
  drawVendingMachine,
} from "../drawing-furniture-b";
import {
  drawWindow,
  drawWallClock,
  drawPictureFrame,
  drawCeilingLight,
  drawRug,
  drawTrashCan,
  drawWaterCooler,
} from "../drawing-core";

export const defaultDrawer: FurnitureDrawer = {
  drawDesk,
  drawChair,
  drawBookshelf,
  drawWhiteboard,
  drawPlant,
  drawSofa,
  drawCoffeeMachine,
  drawVendingMachine,
  drawHighTable,
  drawCoffeeTable,
  drawWindow,
  drawWallClock,
  drawPictureFrame,
  drawCeilingLight,
  drawRug,
  drawTrashCan,
  drawWaterCooler,
};
