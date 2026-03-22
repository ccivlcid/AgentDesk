/**
 * 카카오톡 느낌의 메신저 UI 토큰 (전사 공지 / 단톡방 공통).
 * 다크 테마 위에도 “채팅방” 구역만 밝은 톤으로 띄워 가독성을 유지합니다.
 */
export const KAKAO_MSG = {
  /** 클래식 카톡 채팅방 배경 (블루그레이) */
  roomBg: "#A8C0D8",
  roomBgGradient: "linear-gradient(180deg, #B4C9DE 0%, #9BB5CE 100%)",
  /** 말풍선(내 메시지) */
  bubbleMine: "#FEE500",
  bubbleMineText: "#191919",
  /** 말풍선(상대) */
  bubbleOther: "#FFFFFF",
  bubbleOtherText: "#191919",
  bubbleShadow: "0 1px 2px rgba(0, 0, 0, 0.07)",
  /** 패널·사이드·입력 바 */
  surface: "#FFFFFF",
  surfaceMuted: "#F5F5F5",
  borderLight: "#E6E6E6",
  borderHairline: "rgba(0,0,0,0.06)",
  /** 리스트 선택 하이라이트 (연노랑) */
  rowSelected: "#FFF8E6",
  rowHover: "#F8F8F8",
  /** 전송 버튼 (비활성은 회색) */
  sendActive: "#FEE500",
  sendActiveIcon: "#191919",
  sendDisabled: "#E5E5E5",
  /** 보조 텍스트 */
  meta: "#8E8E93",
  /** 폰트: 본문은 산세리프 (카톡과 유사) */
  fontSans: `system-ui, "Apple SD Gothic Neo", "Malgun Gothic", "Segoe UI", sans-serif`,
  fontMono: "var(--th-font-mono)",
  radiusBubble: 18,
  radiusInput: 22,
} as const;
