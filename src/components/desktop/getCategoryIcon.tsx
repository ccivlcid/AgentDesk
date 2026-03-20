import type { ReactElement } from "react";
import {
  IconProjectSoftware,
  IconProjectMarketing,
  IconProjectResearch,
  IconProjectProduct,
  IconProjectContent,
  IconProjectOperations,
  IconProjectDesign,
} from "./DesktopIcons";

type IconComponent = (props: { color: string }) => ReactElement;

export function getCategoryIcon(categoryId?: string | null): IconComponent | null {
  switch (categoryId) {
    case "cat_software_dev":
      return IconProjectSoftware;
    case "cat_marketing":
      return IconProjectMarketing;
    case "cat_research":
      return IconProjectResearch;
    case "cat_product_launch":
      return IconProjectProduct;
    case "cat_content":
      return IconProjectContent;
    case "cat_operations":
      return IconProjectOperations;
    case "cat_design":
      return IconProjectDesign;
    default:
      return null;
  }
}
