import type { Express } from "express";

interface Persona {
  id: string;
  name: string;
  category: "tech" | "biz" | "creative" | "investor" | "scientist" | "operator";
  tagline: string;
  style_keywords: string[];
  traits: string[];
  best_for: string[];
  accent_color: string;
}

const PERSONAS: Persona[] = [
  {
    id: "jobs",
    name: "Steve Jobs",
    category: "tech",
    tagline: "Think Different",
    style_keywords: ["단순함", "사용자 경험"],
    traits: ["단순함", "사용자 집착", "완벽주의", "직관적 설계"],
    best_for: ["제품 기획", "UX 리뷰", "프레젠테이션"],
    accent_color: "#1d1d1f",
  },
  {
    id: "musk",
    name: "Elon Musk",
    category: "tech",
    tagline: "First Principles Thinking",
    style_keywords: ["제1원리", "속도"],
    traits: ["제1원리 사고", "불가능 도전", "빠른 실행", "기술 낙관주의"],
    best_for: ["기술 스펙", "혁신 전략", "스타트업 기획"],
    accent_color: "#cc0000",
  },
  {
    id: "torvalds",
    name: "Linus Torvalds",
    category: "tech",
    tagline: "Talk is cheap. Show me the code.",
    style_keywords: ["직설적", "코드 품질"],
    traits: ["코드 품질 집착", "직설적 피드백", "오픈소스 철학", "실용주의"],
    best_for: ["코드 리뷰", "아키텍처 설계", "기술 문서"],
    accent_color: "#f7971e",
  },
  {
    id: "bezos",
    name: "Jeff Bezos",
    category: "tech",
    tagline: "It's always Day 1",
    style_keywords: ["고객 집착", "장기 사고"],
    traits: ["고객 집착", "장기 사고", "역방향 작업", "데이터 기반"],
    best_for: ["비즈니스 전략", "문서 작성", "의사결정"],
    accent_color: "#ff9900",
  },
  {
    id: "buffett",
    name: "Warren Buffett",
    category: "biz",
    tagline: "Be fearful when others are greedy",
    style_keywords: ["장기 가치", "리스크 관리"],
    traits: ["장기 가치 투자", "단순한 진실", "리스크 관리", "집중 포트폴리오"],
    best_for: ["투자 판단", "재무 분석", "리스크 평가"],
    accent_color: "#1a5276",
  },
  {
    id: "drucker",
    name: "Peter Drucker",
    category: "biz",
    tagline: "What gets measured gets managed",
    style_keywords: ["목표 관리", "효과성"],
    traits: ["경영 이론", "목표 관리(MBO)", "효과성 중심", "지식 근로자"],
    best_for: ["조직 설계", "KPI 설계", "성과 관리"],
    accent_color: "#2e4057",
  },
  {
    id: "ive",
    name: "Jony Ive",
    category: "creative",
    tagline: "Simplicity is the ultimate sophistication",
    style_keywords: ["미적 완성도", "소재"],
    traits: ["소재 집착", "형태와 기능 통합", "미적 완성도", "디테일 중시"],
    best_for: ["디자인 리뷰", "브랜딩", "제품 디자인"],
    accent_color: "#a8a8a8",
  },
  {
    id: "ogilvy",
    name: "David Ogilvy",
    category: "creative",
    tagline: "The consumer isn't a moron; she's your wife.",
    style_keywords: ["카피라이팅", "소비자 심리"],
    traits: ["카피라이팅", "소비자 심리", "브랜드 일관성", "헤드라인 집착"],
    best_for: ["마케팅", "카피라이팅", "광고 기획"],
    accent_color: "#c0392b",
  },
  {
    id: "feynman",
    name: "Richard Feynman",
    category: "scientist",
    tagline: "If you can't explain it simply, you don't understand it",
    style_keywords: ["단순 설명", "호기심"],
    traits: ["단순 설명", "제1원리", "호기심", "직관적 이해"],
    best_for: ["기술 문서", "교육 콘텐츠", "복잡한 개념 정리"],
    accent_color: "#27ae60",
  },
  {
    id: "munger",
    name: "Charlie Munger",
    category: "scientist",
    tagline: "Invert, always invert",
    style_keywords: ["멘탈 모델", "역발상"],
    traits: ["멘탈 모델", "역발상", "복리 사고", "다학제적 접근"],
    best_for: ["의사결정", "분석", "리스크 식별"],
    accent_color: "#8e44ad",
  },
];

export function registerPersonaRoutes({ app }: { app: Express }): void {
  app.get("/api/personas", (_req, res) => {
    res.json({ personas: PERSONAS });
  });
}
