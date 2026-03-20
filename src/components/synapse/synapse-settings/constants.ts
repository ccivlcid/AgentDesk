import type { CSSProperties } from "react";
import { tl } from "./tl";

export const mono = "var(--th-font-mono)";
export const base: CSSProperties = { fontFamily: mono };

export type SubTab = "notion" | "obsidian" | "notebooklm" | "figma" | "rules";

export const HELP: Record<SubTab, { title: string; items: string[] }> = {
  notion: {
    title: tl("Notion 연동 가이드", "Notion Integration Guide", "Notion連携ガイド", "Notion集成指南"),
    items: [
      tl("Notion → 설정 → 연동 → 새 API 통합 (Integration) 생성", "Notion → Settings → Integrations → Create new integration"),
      tl("생성된 Integration Token (secret_xxxx...)을 복사하여 입력", "Copy the generated Integration Token (secret_xxxx...) and paste it below"),
      tl("연결할 페이지/데이터베이스에서 '연결 추가'로 통합 권한 부여", "Grant access by clicking 'Add connections' on the page or database"),
      tl("연결 후 페이지 검색으로 워크스페이스 내용을 에이전트에 제공 가능", "After connecting, search pages to provide workspace content to agents"),
    ],
  },
  obsidian: {
    title: tl("Obsidian 연동 가이드", "Obsidian Integration Guide", "Obsidian連携ガイド", "Obsidian集成指南"),
    items: [
      tl("로컬 모드: Obsidian Vault 폴더 경로를 직접 입력 (읽기 전용)", "Local mode: enter the Obsidian Vault folder path directly (read-only)"),
      tl("REST API 모드: Obsidian → 설정 → 커뮤니티 플러그인 → 'Local REST API' 설치", "REST API mode: Obsidian → Settings → Community Plugins → install 'Local REST API'"),
      tl("REST API 플러그인 활성화 후 포트(기본 27123)와 API 키를 입력", "After enabling the REST API plugin, enter the port (default 27123) and API key"),
      tl("연결된 노트는 에이전트 컨텍스트 조회 시 자동으로 활용됩니다", "Connected notes are automatically used in agent context queries"),
    ],
  },
  notebooklm: {
    title: tl("NotebookLM 가이드", "NotebookLM Guide", "NotebookLMガイド", "NotebookLM指南"),
    items: [
      tl("NotebookLM은 공식 API가 없어 수동 스냅샷 방식으로 연동합니다", "NotebookLM has no official API — use the manual snapshot method"),
      tl("NotebookLM → 노트북 선택 → '공유 및 내보내기' → 텍스트 복사", "NotebookLM → select notebook → 'Share & export' → copy text"),
      tl("복사한 내용을 아래 텍스트 입력란에 붙여넣고 저장", "Paste the copied content into the text area below and save"),
      tl("저장된 스냅샷은 에이전트 컨텍스트로 사용됩니다 (실시간 동기화 미지원)", "Saved snapshots are used as agent context (no real-time sync)"),
    ],
  },
  figma: {
    title: tl("Figma 연동 가이드", "Figma Integration Guide", "Figma連携ガイド", "Figma集成指南"),
    items: [
      tl("Figma → 설정 → 보안 → Personal Access Token 생성", "Figma → Settings → Security → Generate a Personal Access Token"),
      tl("토큰 이름 입력 후 'Generate new token' 클릭", "Enter a token name and click 'Generate new token'"),
      tl("생성된 토큰을 복사하여 아래에 입력", "Copy the generated token and paste it below"),
      tl("연결 후 태스크 생성 시 Figma URL을 첨부하면 에이전트가 디자인 스펙을 자동으로 읽습니다", "After connecting, attach a Figma URL when creating a task and the agent will read the design spec automatically"),
    ],
  },
  rules: {
    title: tl("자동화 규칙 가이드", "Automation Rules Guide", "自動化ルールガイド", "自动化规则指南"),
    items: [
      tl("Obsidian 파일 변경 또는 Notion 페이지 업데이트 시 태스크를 자동 생성", "Auto-create tasks on Obsidian file changes or Notion page updates"),
      tl("트리거 소스: Obsidian (파일 변경) 또는 Notion (페이지 업데이트)", "Trigger source: Obsidian (file change) or Notion (page update)"),
      tl("패턴 필터: 특정 파일명/경로 패턴만 감지 (비우면 전체 감지)", "Pattern filter: detect only specific file name/path patterns (leave empty for all)"),
      tl("제목 템플릿 변수: {{filename}}, {{path}}, {{title}} 사용 가능", "Title template variables: {{filename}}, {{path}}, {{title}}"),
    ],
  },
};
