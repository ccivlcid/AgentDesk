import React from "react";
import { Box, Text } from "ink";

const COMMANDS = [
  { cmd: "/status", desc: "프로젝트 현황" },
  { cmd: "/tasks", desc: "태스크 목록" },
  { cmd: "/agents", desc: "에이전트 목록" },
  { cmd: "/agent", desc: "에이전트 관리 (edit, list)" },
  { cmd: "/projects", desc: "프로젝트 목록" },
  { cmd: "/import", desc: "현재 디렉토리를 프로젝트로 등록" },
  { cmd: "/kickoff", desc: "프로젝트 킥오프 (PM 오케스트레이션 시작)" },
  { cmd: "/connect", desc: "LLM 프로바이더 연결 (detect, API key)" },
  { cmd: "/providers", desc: "연결된 프로바이더 목록" },
  { cmd: "/models", desc: "사용 가능한 모델 목록" },
  { cmd: "/plan", desc: "Plan 모드 전환" },
  { cmd: "/build", desc: "Build 모드 전환" },
  { cmd: "/yolo", desc: "YOLO 모드 전환" },
  { cmd: "/inbox", desc: "의사결정 수신함" },
  { cmd: "/approve", desc: "대기 중인 결정 승인" },
  { cmd: "/revise", desc: "대기 중인 결정 수정 요청" },
  { cmd: "/cost", desc: "토큰 비용 요약" },
  { cmd: "/usage", desc: "사용량 통계" },
  { cmd: "/logs", desc: "최근 태스크 로그" },
  { cmd: "/skills", desc: "에이전트 스킬" },
  { cmd: "/rules", desc: "에이전트 규칙" },
  { cmd: "/memory", desc: "에이전트 메모리" },
  { cmd: "/hooks", desc: "워크플로우 훅" },
  { cmd: "/sessions", desc: "세션 목록" },
  { cmd: "/fork", desc: "현재 세션 분기" },
  { cmd: "/resume", desc: "세션 재개" },
  { cmd: "/new", desc: "새 세션" },
  { cmd: "/setup", desc: "설정 가이드" },
  { cmd: "/details", desc: "상세 보기 토글" },
  { cmd: "/lang", desc: "언어 변경" },
  { cmd: "/open", desc: "GUI 열기" },
  { cmd: "/help", desc: "도움말" },
  { cmd: "/quit", desc: "종료" },
];

interface Props {
  filter: string;
}

export function CommandPalette({ filter }: Props): React.ReactElement | null {
  const prefix = filter.toLowerCase();
  const display = filter === "/" ? COMMANDS : COMMANDS.filter((c) => c.cmd.startsWith(prefix));
  if (display.length === 0) return null;

  return (
    <Box flexDirection="column" paddingX={2}>
      {display.map((c) => (
        <Box key={c.cmd}>
          <Text color="cyan">{c.cmd.padEnd(12)}</Text>
          <Text dimColor>{c.desc}</Text>
        </Box>
      ))}
    </Box>
  );
}
