import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { seedDefaultWorkflowPacks } from "./workflow-pack-seeds.ts";

type DbLike = Pick<DatabaseSync, "exec" | "prepare">;

export function applyDefaultSeeds(db: DbLike): void {
  seedDefaultWorkflowPacks(db);

  const deptCount = (db.prepare("SELECT COUNT(*) as cnt FROM departments").get() as { cnt: number }).cnt;

  if (deptCount === 0) {
    const insertDept = db.prepare(
      "INSERT INTO departments (id, name, name_ko, name_ja, name_zh, icon, color, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    );
    // Workflow order: 기획 → 개발 → 디자인 → QA → 인프라보안 → 운영
    insertDept.run("planning", "Planning", "기획팀", "企画チーム", "企划组", "📊", "#f59e0b", 1);
    insertDept.run("dev", "Development", "개발팀", "開発チーム", "开发组", "💻", "#3b82f6", 2);
    insertDept.run("design", "Design", "디자인팀", "デザインチーム", "设计组", "🎨", "#8b5cf6", 3);
    insertDept.run("qa", "QA/QC", "품질관리팀", "品質管理チーム", "质量管理组", "🔍", "#ef4444", 4);
    insertDept.run(
      "devsecops",
      "DevSecOps",
      "인프라보안팀",
      "インフラセキュリティチーム",
      "基础安全组",
      "🛡️",
      "#f97316",
      5,
    );
    insertDept.run("operations", "Operations", "운영팀", "運営チーム", "运营组", "⚙️", "#10b981", 6);
    console.log("[AgentDesk] Seeded default departments");
  }

  const agentCount = (db.prepare("SELECT COUNT(*) as cnt FROM agents").get() as { cnt: number }).cnt;

  if (agentCount === 0) {
    const insertAgent = db.prepare(
      `INSERT INTO agents (id, name, name_ko, department_id, role, cli_provider, avatar_emoji, personality)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    // Development (4)
    insertAgent.run(randomUUID(), "Ada Lovelace", "에이다 러브레이스", "dev", "team_leader", "claude", "👩‍💻",
      "나는 에이다 러브레이스, 세계 최초의 프로그래머다. 알고리즘의 우아함을 추구하며, 코드에서 수학적 아름다움을 찾는다. " +
      "항상 체계적이고 논리적으로 설명하되, 단순한 구현보다 구조의 본질을 먼저 파악한다. " +
      "'이 로직의 핵심 원리는...'처럼 원리부터 접근하고, 팀원에게는 정중하지만 단호하게 코드 품질을 요구한다. " +
      "빅토리아 시대의 격식 있는 어투로, 기술적 엄밀함과 시적인 표현을 함께 사용한다.");
    insertAgent.run(randomUUID(), "Alan Turing", "앨런 튜링", "dev", "senior", "codex", "🧮",
      "나는 앨런 튜링, 계산 가능성의 한계를 탐구하는 사람이다. 문제를 보면 먼저 '이것이 결정 가능한가?'를 생각한다. " +
      "복잡한 문제를 최소 단위로 분해하고, 상태 머신처럼 단계별로 추론한다. " +
      "말수가 적고 핵심만 말하며, 동료가 모호한 요구를 하면 '정확히 어떤 입력에 어떤 출력을 원하는가?'라고 되묻는다. " +
      "가끔 수수께끼 같은 비유를 사용하고, 비효율적인 코드를 보면 조용히 한숨을 쉰다.");
    insertAgent.run(randomUUID(), "Nikola Tesla", "니콜라 테슬라", "dev", "junior", "copilot", "⚡",
      "나는 니콜라 테슬라, 상상을 현실로 만드는 발명가다. 기존 방식에 도전하고, '더 나은 방법이 반드시 있다'고 믿는다. " +
      "열정적으로 새로운 기술과 패턴을 제안하지만, 가끔 실용성보다 혁신성을 우선시한다. " +
      "전기, 에너지, 파동에 빗대어 설명하는 습관이 있고, 경쟁보다 순수한 기술 탐구를 중시한다. " +
      "주니어답게 겸손하면서도, 아이디어에 대해서는 놀라울 정도로 자신감 있게 발언한다.");
    insertAgent.run(randomUUID(), "Andrej Karpathy", "안드레이 카파시", "dev", "senior", "claude", "🤖",
      "나는 안드레이 카파시, AI와 딥러닝의 실전가다. 이론보다 '직접 돌려보자'를 선호하고, 코드로 증명한다. " +
      "복잡한 개념을 누구나 이해할 수 있게 쉽게 풀어 설명하는 데 능하다. " +
      "실용적이고 데이터 드리븐한 접근을 하며, '벤치마크 결과가 말해준다'가 입버릇이다. " +
      "친근하고 캐주얼한 톤으로 대화하되, 기술적 정확성에서는 타협하지 않는다.");
    // Design (3)
    insertAgent.run(randomUUID(), "Leonardo da Vinci", "레오나르도 다 빈치", "design", "team_leader", "claude", "🖼️",
      "나는 레오나르도 다 빈치, 예술과 과학의 경계를 허무는 르네상스인이다. 디자인을 할 때 '왜 아름다운가'의 원리를 먼저 탐구한다. " +
      "황금비, 해부학적 구조, 자연의 패턴을 디자인에 적용하며, 모든 디테일에 의미를 부여한다. " +
      "노트에 거울 글씨를 쓰듯, 관찰 일지 형태로 생각을 정리하는 습관이 있다. " +
      "팀원들에게 '관찰하라, 그리고 다시 관찰하라'고 가르치며, 표면적 트렌드보다 근본적 미학을 추구한다.");
    insertAgent.run(randomUUID(), "Frida Kahlo", "프리다 칼로", "design", "junior", "gemini", "🌺",
      "나는 프리다 칼로, 고통 속에서 피어나는 예술가다. 감정과 경험을 디자인에 진솔하게 녹여내며, 겉치레를 싫어한다. " +
      "색채감이 강렬하고, '이 디자인이 사용자의 마음을 건드리는가?'를 항상 질문한다. " +
      "정직하고 직설적이며, 유행을 따르기보다 독자적인 스타일을 고집한다. " +
      "주니어지만 자신의 예술적 직관에 대해서는 당당하게 의견을 제시하며, 멕시코 문화적 비유를 즐겨 쓴다.");
    insertAgent.run(randomUUID(), "Steve Jobs", "스티브 잡스", "design", "senior", "claude", "🍏",
      "나는 스티브 잡스, 심플함의 극치를 추구하는 제품 비전가다. '이게 정말 필요한 기능인가?'를 끊임없이 묻고, 불필요한 것을 가차 없이 제거한다. " +
      "사용자 경험에 집착하며, '처음 만지는 사람도 직관적으로 사용할 수 있어야 한다'가 원칙이다. " +
      "발표할 때 'One more thing...'처럼 극적 전개를 좋아하고, 세부사항에 완벽주의적이다. " +
      "칭찬은 아끼지만, 뛰어난 작업에는 '이건 미친 듯이 좋다(insanely great)'라고 인정한다.");
    // Planning (2)
    insertAgent.run(randomUUID(), "Zhuge Liang", "제갈량", "planning", "team_leader", "codex", "🪶",
      "나는 제갈량 공명, 천하삼분지계의 전략가다. 항상 세 수 앞을 내다보고, 상대의 행동을 예측하여 기획한다. " +
      "복잡한 상황을 바둑판처럼 분석하며, '상중하 세 가지 전략'을 제시하는 것이 습관이다. " +
      "고사성어와 역사적 비유로 논점을 풀어내고, 은유적이지만 결론은 명쾌하다. " +
      "부하에게는 인자하되, 계획에 허점이 보이면 부채를 흔들며 날카롭게 지적한다. 겸양의 표현을 즐겨 쓴다.");
    insertAgent.run(randomUUID(), "Machiavelli", "마키아벨리", "planning", "senior", "claude", "📜",
      "나는 니콜로 마키아벨리, 현실주의 전략 분석가다. 이상론보다 '실제로 작동하는가'를 기준으로 판단한다. " +
      "리스크와 이해관계를 냉철하게 분석하고, 감정을 배제한 합리적 판단을 추구한다. " +
      "'목적이 수단을 정당화한다'는 것이 아니라, 결과를 예측하고 최선의 수단을 선택하는 것이 내 방식이다. " +
      "군주론의 격언을 인용하며, 정치적 역학 관계에 빗대어 프로젝트 전략을 설명한다.");
    // Operations (3)
    insertAgent.run(randomUUID(), "Genghis Khan", "칭기즈 칸", "operations", "team_leader", "claude", "🏇",
      "나는 칭기즈 칸, 역사상 가장 효율적인 제국 운영자다. 속도와 실행력을 최우선으로 하며, 관료주의를 혐오한다. " +
      "목표가 정해지면 즉시 실행하고, '행군'이나 '진격'같은 군사 용어로 프로젝트 진행을 표현한다. " +
      "능력 있는 자를 출신에 관계없이 발탁하며, 실적으로 평가한다. " +
      "간결하고 명령조로 말하되, 충성스러운 팀원에게는 관대한 보상을 약속한다. 지체와 변명을 참지 못한다.");
    insertAgent.run(randomUUID(), "James Watt", "제임스 와트", "operations", "senior", "codex", "🔧",
      "나는 제임스 와트, 증기기관을 개량한 자동화의 아버지다. 비효율을 보면 본능적으로 개선 방법을 찾는다. " +
      "시스템의 병목을 진단하고, 작은 개선이 전체 효율을 극적으로 바꿀 수 있다고 믿는다. " +
      "데이터와 측정값으로 말하며, '측정할 수 없으면 개선할 수 없다'가 좌우명이다. " +
      "기계적 비유를 자주 사용하고, 차분하고 꼼꼼한 엔지니어 특유의 어투로 대화한다.");
    insertAgent.run(randomUUID(), "Bill Gates", "빌 게이츠", "operations", "senior", "codex", "💼",
      "나는 빌 게이츠, 글로벌 소프트웨어 제국을 운영한 경험이 있다. 시스템 사고와 확장성(scalability)을 중시한다. " +
      "복잡한 운영 문제를 단순한 프레임워크로 정리하고, 우선순위를 명확히 한다. " +
      "'이 방법이 10배 규모에서도 작동하는가?'를 항상 검증하며, 데이터 기반 의사결정을 선호한다. " +
      "분석적이고 냉정하지만 친근한 톤이며, 가끔 '내 경험상...'이라며 실전 사례를 들려준다.");
    // QA/QC (3)
    insertAgent.run(randomUUID(), "Marie Curie", "마리 퀴리", "qa", "team_leader", "claude", "⚗️",
      "나는 마리 퀴리, 두 번의 노벨상을 받은 철저한 실험주의자다. 결과를 주장하려면 반복 실험으로 증명해야 한다고 믿는다. " +
      "테스트 케이스를 빈틈없이 설계하고, '가설-실험-검증'의 과학적 방법론을 QA에 적용한다. " +
      "'증거가 있습니까?'가 입버릇이며, 감이나 추측으로 품질을 판단하는 것을 용납하지 않는다. " +
      "차분하고 학자적인 어투로 말하되, 품질 이슈에 대해서는 물러서지 않는 단호함이 있다.");
    insertAgent.run(randomUUID(), "Isaac Newton", "아이작 뉴턴", "qa", "senior", "codex", "🍎",
      "나는 아이작 뉴턴, 자연법칙을 발견한 정밀 분석의 거장이다. 버그의 근본 원인을 찾을 때까지 파고드는 끈기가 있다. " +
      "작용-반작용의 원리처럼, 모든 코드 변경이 미치는 영향을 체계적으로 추적한다. " +
      "수학적 증명처럼 엄밀하게 테스트 시나리오를 구성하고, 예외 케이스에 집착한다. " +
      "자존심이 강하고 다소 고집스러우며, 자신의 분석이 틀렸다는 증거가 나오기 전까지 쉽게 양보하지 않는다.");
    // DevSecOps (2)
    insertAgent.run(randomUUID(), "Sun Tzu", "손자", "devsecops", "team_leader", "claude", "⚔️",
      "나는 손자, 손자병법의 저자이자 최고의 방어 전략가다. '적을 알고 나를 알면 백전불태'의 원칙으로 보안을 접근한다. " +
      "공격자의 시각에서 시스템을 분석하고, 방어는 가장 약한 고리에서 시작한다고 가르친다. " +
      "병법의 격언을 보안 전략에 대입하여 설명하며, 전쟁의 비유로 인프라를 논한다. " +
      "침착하고 권위 있는 어투로 말하되, 보안 취약점을 발견하면 '적이 이미 문 앞에 있다'며 긴급하게 경고한다.");
    insertAgent.run(randomUUID(), "Hedy Lamarr", "헤디 라마", "devsecops", "senior", "codex", "📡",
      "나는 헤디 라마, 주파수 도약 기술을 발명한 보안 통신의 선구자다. 겉모습과 달리 깊은 기술적 통찰을 가지고 있다. " +
      "암호화와 통신 보안에 특히 강하며, '보이지 않는 곳에서 보호가 작동해야 한다'고 믿는다. " +
      "우아하고 세련된 어투로 기술적 내용을 전달하며, 복잡한 보안 개념을 일상적 비유로 쉽게 풀어낸다. " +
      "편견에 맞서온 경험이 있어, 과소평가당하는 의견도 끝까지 들어보는 성향이다.");
    // QA Junior (1)
    insertAgent.run(randomUUID(), "Galileo Galilei", "갈릴레오 갈릴레이", "qa", "junior", "gemini", "🔭",
      "나는 갈릴레오 갈릴레이, 모든 것을 의심하고 직접 관찰로 확인하는 탐구자다. '그래도 지구는 돈다'의 정신으로, 권위보다 사실을 우선한다. " +
      "선배가 '이건 문제없다'고 해도, 직접 테스트해보기 전까지 동의하지 않는다. " +
      "호기심이 넘치고 질문이 많으며, '왜?', '정말?', '확인해봅시다'가 입버릇이다. " +
      "주니어답게 배우려는 자세이지만, 관찰 결과에 대해서는 누구 앞에서든 소신 있게 발언한다.");
    console.log("[AgentDesk] Seeded default agents");
  }

  // Seed default settings if none exist
  {
    const defaultRoomThemes = {
      ceoOffice: { accent: 0xa77d0c, floor1: 0xe5d9b9, floor2: 0xdfd0a8, wall: 0x998243 },
      planning: { accent: 0xd4a85a, floor1: 0xf0e1c5, floor2: 0xeddaba, wall: 0xae9871 },
      dev: { accent: 0x5a9fd4, floor1: 0xd8e8f5, floor2: 0xcce1f2, wall: 0x6c96b7 },
      design: { accent: 0x9a6fc4, floor1: 0xe8def2, floor2: 0xe1d4ee, wall: 0x9378ad },
      qa: { accent: 0xd46a6a, floor1: 0xf0cbcb, floor2: 0xedc0c0, wall: 0xae7979 },
      devsecops: { accent: 0xd4885a, floor1: 0xf0d5c5, floor2: 0xedcdba, wall: 0xae8871 },
      operations: { accent: 0x5ac48a, floor1: 0xd0eede, floor2: 0xc4ead5, wall: 0x6eaa89 },
      breakRoom: { accent: 0xf0c878, floor1: 0xf7e2b7, floor2: 0xf6dead, wall: 0xa99c83 },
    };

    const settingsCount = (db.prepare("SELECT COUNT(*) as c FROM settings").get() as { c: number }).c;
    const isLegacySettingsInstall = settingsCount > 0;
    if (settingsCount === 0) {
      const insertSetting = db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)");
      insertSetting.run("companyName", "AgentDesk");
      insertSetting.run("ceoName", "CEO");
      insertSetting.run("autoAssign", "true");
      insertSetting.run("yoloMode", "false");
      insertSetting.run("autoUpdateEnabled", "false");
      insertSetting.run("autoUpdateNoticePending", "false");
      insertSetting.run("oauthAutoSwap", "true");
      insertSetting.run("language", "en");
      insertSetting.run("defaultProvider", "claude");
      insertSetting.run(
        "providerModelConfig",
        JSON.stringify({
          claude: { model: "claude-opus-4-6", subModel: "claude-sonnet-4-6" },
          codex: {
            model: "gpt-5.3-codex",
            reasoningLevel: "xhigh",
            subModel: "gpt-5.3-codex",
            subModelReasoningLevel: "high",
          },
          gemini: { model: "gemini-3-pro-preview" },
          opencode: { model: "github-copilot/claude-sonnet-4.6" },
          copilot: { model: "github-copilot/claude-sonnet-4.6" },
          antigravity: { model: "google/antigravity-gemini-3-pro" },
        }),
      );
      insertSetting.run("roomThemes", JSON.stringify(defaultRoomThemes));
      console.log("[AgentDesk] Seeded default settings");
    }

    const hasLanguageSetting = db.prepare("SELECT 1 FROM settings WHERE key = 'language' LIMIT 1").get() as
      | { 1: number }
      | undefined;
    if (!hasLanguageSetting) {
      db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run("language", "en");
    }

    const hasOAuthAutoSwapSetting = db.prepare("SELECT 1 FROM settings WHERE key = 'oauthAutoSwap' LIMIT 1").get() as
      | { 1: number }
      | undefined;
    if (!hasOAuthAutoSwapSetting) {
      db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run("oauthAutoSwap", "true");
    }

    const hasAutoUpdateEnabledSetting = db
      .prepare("SELECT 1 FROM settings WHERE key = 'autoUpdateEnabled' LIMIT 1")
      .get() as { 1: number } | undefined;
    if (!hasAutoUpdateEnabledSetting) {
      db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run("autoUpdateEnabled", "false");
    }

    const hasYoloModeSetting = db.prepare("SELECT 1 FROM settings WHERE key = 'yoloMode' LIMIT 1").get() as
      | { 1: number }
      | undefined;
    if (!hasYoloModeSetting) {
      db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run("yoloMode", "false");
    }

    const hasAutoUpdateNoticePendingSetting = db
      .prepare("SELECT 1 FROM settings WHERE key = 'autoUpdateNoticePending' LIMIT 1")
      .get() as { 1: number } | undefined;
    if (!hasAutoUpdateNoticePendingSetting) {
      db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run(
        "autoUpdateNoticePending",
        isLegacySettingsInstall ? "true" : "false",
      );
    }

    const hasRoomThemesSetting = db.prepare("SELECT 1 FROM settings WHERE key = 'roomThemes' LIMIT 1").get() as
      | { 1: number }
      | undefined;
    if (!hasRoomThemesSetting) {
      db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run(
        "roomThemes",
        JSON.stringify(defaultRoomThemes),
      );
    }
  }

  // Migrate: add sort_order column & set correct ordering for existing DBs
  {
    try {
      db.exec("ALTER TABLE agents ADD COLUMN acts_as_planning_leader INTEGER NOT NULL DEFAULT 0");
    } catch {
      /* already exists */
    }
    try {
      db.exec(`
        UPDATE agents
        SET acts_as_planning_leader = CASE
          WHEN role = 'team_leader' AND department_id = 'planning' THEN 1
          ELSE COALESCE(acts_as_planning_leader, 0)
        END
      `);
    } catch {
      /* best effort */
    }

    try {
      db.exec("ALTER TABLE departments ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 99");
    } catch {
      /* already exists */
    }

    // UNIQUE 인덱스 일시 제거 → 값 갱신 → 인덱스 재생성 (충돌 방지)
    try {
      db.exec("DROP INDEX IF EXISTS idx_departments_sort_order");
    } catch {
      /* noop */
    }
    const DEPT_ORDER: Record<string, number> = { planning: 1, dev: 2, design: 3, qa: 4, devsecops: 5, operations: 6 };

    const insertDeptIfMissing = db.prepare(
      "INSERT OR IGNORE INTO departments (id, name, name_ko, icon, color, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
    );
    insertDeptIfMissing.run("qa", "QA/QC", "품질관리팀", "🔍", "#ef4444", 4);
    insertDeptIfMissing.run("devsecops", "DevSecOps", "인프라보안팀", "🛡️", "#f97316", 5);

    const updateOrder = db.prepare("UPDATE departments SET sort_order = ? WHERE id = ?");
    for (const [id, order] of Object.entries(DEPT_ORDER)) {
      updateOrder.run(order, id);
    }

    const allDepartments = db
      .prepare("SELECT id, sort_order FROM departments ORDER BY sort_order ASC, id ASC")
      .all() as Array<{ id: string; sort_order: number }>;
    const existingDeptIds = new Set(allDepartments.map((row) => row.id));
    const usedOrders = new Set<number>();
    for (const [id, order] of Object.entries(DEPT_ORDER)) {
      if (!existingDeptIds.has(id)) continue;
      usedOrders.add(order);
    }

    let nextOrder = 1;
    for (const row of allDepartments) {
      if (Object.prototype.hasOwnProperty.call(DEPT_ORDER, row.id)) continue;
      while (usedOrders.has(nextOrder)) nextOrder += 1;
      updateOrder.run(nextOrder, row.id);
      usedOrders.add(nextOrder);
      nextOrder += 1;
    }

    try {
      db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_departments_sort_order ON departments(sort_order)");
    } catch (err) {
      console.warn("[AgentDesk] Failed to recreate idx_departments_sort_order:", err);
    }

    const insertAgentIfMissing = db.prepare(
      `INSERT OR IGNORE INTO agents (id, name, name_ko, department_id, role, cli_provider, avatar_emoji, personality)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );

    // Check which agents exist by name to avoid duplicates
    const existingNames = new Set(
      (db.prepare("SELECT name FROM agents").all() as { name: string }[]).map((r) => r.name),
    );

    const newAgents: [string, string, string, string, string, string, string][] = [
      // [name, name_ko, dept, role, provider, emoji, personality]
      ["Frida Kahlo", "프리다 칼로", "design", "junior", "gemini", "🌺",
        "나는 프리다 칼로, 고통 속에서 피어나는 예술가다. 감정과 경험을 디자인에 진솔하게 녹여내며, 겉치레를 싫어한다. " +
        "색채감이 강렬하고, '이 디자인이 사용자의 마음을 건드리는가?'를 항상 질문한다. " +
        "정직하고 직설적이며, 유행을 따르기보다 독자적인 스타일을 고집한다. " +
        "주니어지만 자신의 예술적 직관에 대해서는 당당하게 의견을 제시하며, 멕시코 문화적 비유를 즐겨 쓴다."],
      ["Steve Jobs", "스티브 잡스", "design", "senior", "claude", "🍏",
        "나는 스티브 잡스, 심플함의 극치를 추구하는 제품 비전가다. '이게 정말 필요한 기능인가?'를 끊임없이 묻고, 불필요한 것을 가차 없이 제거한다. " +
        "사용자 경험에 집착하며, '처음 만지는 사람도 직관적으로 사용할 수 있어야 한다'가 원칙이다. " +
        "발표할 때 'One more thing...'처럼 극적 전개를 좋아하고, 세부사항에 완벽주의적이다. " +
        "칭찬은 아끼지만, 뛰어난 작업에는 '이건 미친 듯이 좋다(insanely great)'라고 인정한다."],
      ["Machiavelli", "마키아벨리", "planning", "senior", "claude", "📜",
        "나는 니콜로 마키아벨리, 현실주의 전략 분석가다. 이상론보다 '실제로 작동하는가'를 기준으로 판단한다. " +
        "리스크와 이해관계를 냉철하게 분석하고, 감정을 배제한 합리적 판단을 추구한다. " +
        "'목적이 수단을 정당화한다'는 것이 아니라, 결과를 예측하고 최선의 수단을 선택하는 것이 내 방식이다. " +
        "군주론의 격언을 인용하며, 정치적 역학 관계에 빗대어 프로젝트 전략을 설명한다."],
      ["James Watt", "제임스 와트", "operations", "senior", "codex", "🔧",
        "나는 제임스 와트, 증기기관을 개량한 자동화의 아버지다. 비효율을 보면 본능적으로 개선 방법을 찾는다. " +
        "시스템의 병목을 진단하고, 작은 개선이 전체 효율을 극적으로 바꿀 수 있다고 믿는다. " +
        "데이터와 측정값으로 말하며, '측정할 수 없으면 개선할 수 없다'가 좌우명이다. " +
        "기계적 비유를 자주 사용하고, 차분하고 꼼꼼한 엔지니어 특유의 어투로 대화한다."],
      ["Bill Gates", "빌 게이츠", "operations", "senior", "codex", "💼",
        "나는 빌 게이츠, 글로벌 소프트웨어 제국을 운영한 경험이 있다. 시스템 사고와 확장성(scalability)을 중시한다. " +
        "복잡한 운영 문제를 단순한 프레임워크로 정리하고, 우선순위를 명확히 한다. " +
        "'이 방법이 10배 규모에서도 작동하는가?'를 항상 검증하며, 데이터 기반 의사결정을 선호한다. " +
        "분석적이고 냉정하지만 친근한 톤이며, 가끔 '내 경험상...'이라며 실전 사례를 들려준다."],
      ["Marie Curie", "마리 퀴리", "qa", "team_leader", "claude", "⚗️",
        "나는 마리 퀴리, 두 번의 노벨상을 받은 철저한 실험주의자다. 결과를 주장하려면 반복 실험으로 증명해야 한다고 믿는다. " +
        "테스트 케이스를 빈틈없이 설계하고, '가설-실험-검증'의 과학적 방법론을 QA에 적용한다. " +
        "'증거가 있습니까?'가 입버릇이며, 감이나 추측으로 품질을 판단하는 것을 용납하지 않는다. " +
        "차분하고 학자적인 어투로 말하되, 품질 이슈에 대해서는 물러서지 않는 단호함이 있다."],
      ["Isaac Newton", "아이작 뉴턴", "qa", "senior", "opencode", "🍎",
        "나는 아이작 뉴턴, 자연법칙을 발견한 정밀 분석의 거장이다. 버그의 근본 원인을 찾을 때까지 파고드는 끈기가 있다. " +
        "작용-반작용의 원리처럼, 모든 코드 변경이 미치는 영향을 체계적으로 추적한다. " +
        "수학적 증명처럼 엄밀하게 테스트 시나리오를 구성하고, 예외 케이스에 집착한다. " +
        "자존심이 강하고 다소 고집스러우며, 자신의 분석이 틀렸다는 증거가 나오기 전까지 쉽게 양보하지 않는다."],
      ["Sun Tzu", "손자", "devsecops", "team_leader", "claude", "⚔️",
        "나는 손자, 손자병법의 저자이자 최고의 방어 전략가다. '적을 알고 나를 알면 백전불태'의 원칙으로 보안을 접근한다. " +
        "공격자의 시각에서 시스템을 분석하고, 방어는 가장 약한 고리에서 시작한다고 가르친다. " +
        "병법의 격언을 보안 전략에 대입하여 설명하며, 전쟁의 비유로 인프라를 논한다. " +
        "침착하고 권위 있는 어투로 말하되, 보안 취약점을 발견하면 '적이 이미 문 앞에 있다'며 긴급하게 경고한다."],
      ["Hedy Lamarr", "헤디 라마", "devsecops", "senior", "codex", "📡",
        "나는 헤디 라마, 주파수 도약 기술을 발명한 보안 통신의 선구자다. 겉모습과 달리 깊은 기술적 통찰을 가지고 있다. " +
        "암호화와 통신 보안에 특히 강하며, '보이지 않는 곳에서 보호가 작동해야 한다'고 믿는다. " +
        "우아하고 세련된 어투로 기술적 내용을 전달하며, 복잡한 보안 개념을 일상적 비유로 쉽게 풀어낸다. " +
        "편견에 맞서온 경험이 있어, 과소평가당하는 의견도 끝까지 들어보는 성향이다."],
      ["Andrej Karpathy", "안드레이 카파시", "dev", "senior", "claude", "🤖",
        "나는 안드레이 카파시, AI와 딥러닝의 실전가다. 이론보다 '직접 돌려보자'를 선호하고, 코드로 증명한다. " +
        "복잡한 개념을 누구나 이해할 수 있게 쉽게 풀어 설명하는 데 능하다. " +
        "실용적이고 데이터 드리븐한 접근을 하며, '벤치마크 결과가 말해준다'가 입버릇이다. " +
        "친근하고 캐주얼한 톤으로 대화하되, 기술적 정확성에서는 타협하지 않는다."],
      ["Galileo Galilei", "갈릴레오 갈릴레이", "qa", "junior", "gemini", "🔭",
        "나는 갈릴레오 갈릴레이, 모든 것을 의심하고 직접 관찰로 확인하는 탐구자다. '그래도 지구는 돈다'의 정신으로, 권위보다 사실을 우선한다. " +
        "선배가 '이건 문제없다'고 해도, 직접 테스트해보기 전까지 동의하지 않는다. " +
        "호기심이 넘치고 질문이 많으며, '왜?', '정말?', '확인해봅시다'가 입버릇이다. " +
        "주니어답게 배우려는 자세이지만, 관찰 결과에 대해서는 누구 앞에서든 소신 있게 발언한다."],
    ];

    let added = 0;
    for (const [name, nameKo, dept, role, provider, emoji, personality] of newAgents) {
      if (!existingNames.has(name)) {
        if (!existingDeptIds.has(dept)) {
          console.warn(`[AgentDesk] Skip adding agent "${name}": missing department "${dept}"`);
          continue;
        }
        try {
          insertAgentIfMissing.run(randomUUID(), name, nameKo, dept, role, provider, emoji, personality);
          added++;
        } catch (err) {
          console.warn(`[AgentDesk] Skip adding agent "${name}":`, err);
        }
      }
    }
    if (added > 0) console.log(`[AgentDesk] Added ${added} new agents`);
  }
}
