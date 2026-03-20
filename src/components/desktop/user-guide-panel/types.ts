/**
 * UserGuidePanel 타입 정의
 */

export interface KeyEntry {
  keys: string[];
  desc: string;
}

export interface Callout {
  type: "tip" | "warn" | "info";
  text: string;
}

export interface Section {
  heading: string;
  body?: string;
  keys?: KeyEntry[];
  callout?: Callout;
  features?: { icon: string; label: string; desc: string }[];
}

export interface Chapter {
  id: string;
  color: string;
  icon: string;
  title: string;
  sections: Section[];
}

export type I18nT = (v: { ko: string; en: string; ja: string; zh: string }) => string;
