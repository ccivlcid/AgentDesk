import type { Node, Edge } from "@xyflow/react";
import type { AgentNodeData } from "../nodes/WbAgentNode";

export interface BuiltinPreset {
  id: string;
  name: string;
  name_ko: string;
  category: "general" | "design" | "analysis" | "development";
  description: string;
  description_ko: string;
  icon: string;
  figma_required: boolean;
  nodes: Node[];
  edges: Edge[];
  steps: string[];
}

export const DESIGN_WORKFLOW_PRESET: BuiltinPreset = {
  id: "builtin-design-workflow-v1",
  name: "Design Workflow",
  name_ko: "디자인 워크플로우",
  category: "design",
  description: "Figma → Analysis → Component Design → Implementation → Review",
  description_ko: "Figma → 디자인 분석 → 컴포넌트 설계 → 코드 구현 → 코드 리뷰",
  icon: "",
  figma_required: true,
  nodes: [
    {
      id: "design-n1",
      type: "agent",
      position: { x: 100, y: 200 },
      data: {
        label: "디자인 분석",
        emoji: "🔍",
        skill: "design",
      } satisfies AgentNodeData,
    },
    {
      id: "design-n2",
      type: "agent",
      position: { x: 350, y: 200 },
      data: {
        label: "컴포넌트 설계",
        emoji: "📐",
        skill: "design",
      } satisfies AgentNodeData,
    },
    {
      id: "design-n3",
      type: "agent",
      position: { x: 600, y: 200 },
      data: {
        label: "코드 구현",
        emoji: "⊙",
        skill: "development",
      } satisfies AgentNodeData,
    },
    {
      id: "design-n4",
      type: "agent",
      position: { x: 850, y: 200 },
      data: {
        label: "코드 리뷰",
        emoji: "✓",
        skill: "analysis",
      } satisfies AgentNodeData,
    },
  ],
  edges: [
    {
      id: "design-e1",
      source: "design-n1",
      target: "design-n2",
      animated: false,
      label: "on_success",
      labelStyle: { fontFamily: "var(--th-font-mono)", fontSize: 9 },
    },
    {
      id: "design-e2",
      source: "design-n2",
      target: "design-n3",
      animated: false,
      label: "on_success",
      labelStyle: { fontFamily: "var(--th-font-mono)", fontSize: 9 },
    },
    {
      id: "design-e3",
      source: "design-n3",
      target: "design-n4",
      animated: false,
      label: "always",
      labelStyle: { fontFamily: "var(--th-font-mono)", fontSize: 9 },
    },
  ],
  steps: ["디자인 분석", "컴포넌트 설계", "코드 구현", "코드 리뷰"],
};

export const BUILTIN_PRESETS: BuiltinPreset[] = [
  DESIGN_WORKFLOW_PRESET,
];
