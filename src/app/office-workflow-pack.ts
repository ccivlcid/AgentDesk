import type { Agent, AgentRole, CliProvider, Department, RoomTheme, WorkflowPackKey } from "../types";

export type UiLanguageLike = "ko" | "en" | "ja" | "zh";

type Localized = { ko: string; en: string; ja: string; zh: string };
type DeptPreset = {
  name: Localized;
  icon: string;
  agentPrefix: Localized;
  avatarPool: string[];
};

type StaffPreset = {
  nonLeaderDeptCycle: string[];
  roleTitles?: Partial<Record<AgentRole, Localized>>;
  planningLeadDeptIds?: string[];
};

type SeedProfile = {
  nameOffset: number;
  tone: Localized;
};

type PackPreset = {
  key: WorkflowPackKey;
  slug: string;
  label: Localized;
  summary: Localized;
  roomThemes: Record<string, RoomTheme>;
  departments: Partial<Record<string, DeptPreset>>;
  staff?: StaffPreset;
};

type OfficePackPresentation = {
  departments: Department[];
  agents: Agent[];
  roomThemes: Record<string, RoomTheme>;
};

export type OfficePackStarterAgentDraft = {
  name: string;
  name_ko: string;
  name_ja: string;
  name_zh: string;
  department_id: string | null;
  seed_order_in_department: number;
  role: AgentRole;
  acts_as_planning_leader: number;
  avatar_emoji: string;
  sprite_number: number;
  personality: string | null;
};

type OfficePackSeedProvider = Extract<CliProvider, "claude" | "codex">;
const OFFICE_SEED_SPRITE_POOL = Array.from({ length: 13 }, (_, idx) => idx + 1);

const DEV_THEMES: Record<string, RoomTheme> = {
  ceoOffice: { floor1: 0xe5d9b9, floor2: 0xdfd0a8, wall: 0x998243, accent: 0xa77d0c },
  planning: { floor1: 0xf0e1c5, floor2: 0xeddaba, wall: 0xae9871, accent: 0xd4a85a },
  dev: { floor1: 0xd8e8f5, floor2: 0xcce1f2, wall: 0x6c96b7, accent: 0x5a9fd4 },
  design: { floor1: 0xe8def2, floor2: 0xe1d4ee, wall: 0x9378ad, accent: 0x9a6fc4 },
  qa: { floor1: 0xf0cbcb, floor2: 0xedc0c0, wall: 0xae7979, accent: 0xd46a6a },
  devsecops: { floor1: 0xf0d5c5, floor2: 0xedcdba, wall: 0xae8871, accent: 0xd4885a },
  operations: { floor1: 0xd0eede, floor2: 0xc4ead5, wall: 0x6eaa89, accent: 0x5ac48a },
  breakRoom: { floor1: 0xf7e2b7, floor2: 0xf6dead, wall: 0xa99c83, accent: 0xf0c878 },
};

const DEPARTMENT_PERSON_NAME_POOL: Partial<Record<string, Localized[]>> = {
  planning: [
    { ko: "세이지", en: "Sage", ja: "セージ", zh: "赛吉" },
    { ko: "미나", en: "Mina", ja: "ミナ", zh: "米娜" },
    { ko: "주노", en: "Juno", ja: "ジュノ", zh: "朱诺" },
    { ko: "리안", en: "Rian", ja: "リアン", zh: "里安" },
    { ko: "하루", en: "Haru", ja: "ハル", zh: "晴" },
    { ko: "노아", en: "Noa", ja: "ノア", zh: "诺亚" },
  ],
  dev: [
    { ko: "아리아", en: "Aria", ja: "アリア", zh: "阿莉娅" },
    { ko: "테오", en: "Theo", ja: "テオ", zh: "西奥" },
    { ko: "카이", en: "Kai", ja: "カイ", zh: "凯" },
    { ko: "리암", en: "Liam", ja: "リアム", zh: "利亚姆" },
    { ko: "세나", en: "Sena", ja: "セナ", zh: "塞娜" },
    { ko: "로완", en: "Rowan", ja: "ローワン", zh: "罗恩" },
  ],
  design: [
    { ko: "도로", en: "Doro", ja: "ドロ", zh: "多罗" },
    { ko: "루나", en: "Luna", ja: "ルナ", zh: "露娜" },
    { ko: "픽셀", en: "Pixel", ja: "ピクセル", zh: "像素" },
    { ko: "유나", en: "Yuna", ja: "ユナ", zh: "优娜" },
    { ko: "미로", en: "Miro", ja: "ミロ", zh: "米洛" },
    { ko: "아이리스", en: "Iris", ja: "アイリス", zh: "爱丽丝" },
  ],
  qa: [
    { ko: "스피키", en: "Speaky", ja: "スピーキー", zh: "斯皮奇" },
    { ko: "호크", en: "Hawk", ja: "ホーク", zh: "霍克" },
    { ko: "베라", en: "Vera", ja: "ヴェラ", zh: "薇拉" },
    { ko: "퀸", en: "Quinn", ja: "クイン", zh: "奎因" },
    { ko: "토리", en: "Tori", ja: "トリ", zh: "托莉" },
    { ko: "하윤", en: "Hayoon", ja: "ハユン", zh: "夏允" },
  ],
  operations: [
    { ko: "아틀라스", en: "Atlas", ja: "アトラス", zh: "阿特拉斯" },
    { ko: "나리", en: "Nari", ja: "ナリ", zh: "娜莉" },
    { ko: "오웬", en: "Owen", ja: "オーウェン", zh: "欧文" },
    { ko: "다미", en: "Dami", ja: "ダミ", zh: "达米" },
    { ko: "키라", en: "Kira", ja: "キラ", zh: "琪拉" },
    { ko: "솔", en: "Sol", ja: "ソル", zh: "索尔" },
  ],
  devsecops: [
    { ko: "볼트S", en: "VoltS", ja: "ボルトS", zh: "伏特S" },
    { ko: "시온", en: "Sion", ja: "シオン", zh: "锡安" },
    { ko: "녹스", en: "Knox", ja: "ノックス", zh: "诺克斯" },
    { ko: "레이븐", en: "Raven", ja: "レイヴン", zh: "渡鸦" },
    { ko: "미라", en: "Mira", ja: "ミラ", zh: "米拉" },
    { ko: "알렉스", en: "Alex", ja: "アレックス", zh: "亚历克斯" },
  ],
  // Asset Management — 투자전략실 (Investment Strategy)
  "asset_management:planning": [
    { ko: "워런 버핏", en: "Warren Buffett", ja: "ウォーレン・バフェット", zh: "沃伦·巴菲特" },
    { ko: "조지 소로스", en: "George Soros", ja: "ジョージ・ソロス", zh: "乔治·索罗斯" },
    { ko: "레이 달리오", en: "Ray Dalio", ja: "レイ・ダリオ", zh: "瑞·达利欧" },
    { ko: "피터 린치", en: "Peter Lynch", ja: "ピーター・リンチ", zh: "彼得·林奇" },
    { ko: "벤저민 그레이엄", en: "Benjamin Graham", ja: "ベンジャミン・グレアム", zh: "本杰明·格雷厄姆" },
    { ko: "찰리 멍거", en: "Charlie Munger", ja: "チャーリー・マンガー", zh: "查理·芒格" },
  ],
  // Asset Management — 퀀트분석팀 (Quant Analysis)
  "asset_management:dev": [
    { ko: "짐 사이먼스", en: "Jim Simons", ja: "ジム・サイモンズ", zh: "詹姆斯·西蒙斯" },
    { ko: "에드 소프", en: "Ed Thorp", ja: "エド・ソープ", zh: "爱德华·索普" },
    { ko: "피셔 블랙", en: "Fischer Black", ja: "フィッシャー・ブラック", zh: "费希尔·布莱克" },
    { ko: "마이런 숄스", en: "Myron Scholes", ja: "マイロン・ショールズ", zh: "迈伦·斯科尔斯" },
    { ko: "이매뉴얼 더먼", en: "Emanuel Derman", ja: "エマニュエル・ダーマン", zh: "伊曼纽尔·德曼" },
    { ko: "데이비드 쇼", en: "David Shaw", ja: "デビッド・ショー", zh: "大卫·肖" },
  ],
  // Asset Management — 리서치팀 (Investment Research)
  "asset_management:design": [
    { ko: "필립 피셔", en: "Philip Fisher", ja: "フィリップ・フィッシャー", zh: "菲利普·费雪" },
    { ko: "존 템플턴", en: "John Templeton", ja: "ジョン・テンプルトン", zh: "约翰·邓普顿" },
    { ko: "하워드 막스", en: "Howard Marks", ja: "ハワード・マークス", zh: "霍华德·马克斯" },
    { ko: "캐시 우드", en: "Cathie Wood", ja: "キャシー・ウッド", zh: "凯西·伍德" },
    { ko: "메리 미커", en: "Mary Meeker", ja: "メアリー・ミーカー", zh: "玛丽·米克尔" },
    { ko: "애비 코언", en: "Abby Cohen", ja: "アビー・コーエン", zh: "阿比·科恩" },
  ],
  // Asset Management — 리스크관리팀 (Risk Management)
  "asset_management:qa": [
    { ko: "나심 탈레브", en: "Nassim Taleb", ja: "ナシーム・タレブ", zh: "纳西姆·塔勒布" },
    { ko: "해리 마코위츠", en: "Harry Markowitz", ja: "ハリー・マーコウィッツ", zh: "哈里·马科维茨" },
    { ko: "로버트 머튼", en: "Robert Merton", ja: "ロバート・マートン", zh: "罗伯特·默顿" },
    { ko: "다니엘 카너먼", en: "Daniel Kahneman", ja: "ダニエル・カーネマン", zh: "丹尼尔·卡尼曼" },
    { ko: "프랭크 나이트", en: "Frank Knight", ja: "フランク・ナイト", zh: "弗兰克·奈特" },
    { ko: "존 헐", en: "John Hull", ja: "ジョン・ハル", zh: "约翰·赫尔" },
  ],
  // Asset Management — 컴플라이언스팀 (Compliance)
  "asset_management:devsecops": [
    { ko: "폴 볼커", en: "Paul Volcker", ja: "ポール・ボルカー", zh: "保罗·沃尔克" },
    { ko: "재닛 옐런", en: "Janet Yellen", ja: "ジャネット・イエレン", zh: "珍妮特·耶伦" },
    { ko: "벤 버냉키", en: "Ben Bernanke", ja: "ベン・バーナンキ", zh: "本·伯南克" },
    { ko: "브룩슬리 본", en: "Brooksley Born", ja: "ブルックスリー・ボーン", zh: "布鲁克斯利·博恩" },
    { ko: "게리 겐슬러", en: "Gary Gensler", ja: "ゲイリー・ゲンスラー", zh: "加里·根斯勒" },
    { ko: "아서 레빗", en: "Arthur Levitt", ja: "アーサー・レビット", zh: "阿瑟·莱维特" },
  ],
  // Asset Management — 펀드운용팀 (Fund Operations)
  "asset_management:operations": [
    { ko: "존 보글", en: "John Bogle", ja: "ジョン・ボーグル", zh: "约翰·博格" },
    { ko: "래리 핑크", en: "Larry Fink", ja: "ラリー・フィンク", zh: "拉里·芬克" },
    { ko: "데이비드 스웬슨", en: "David Swensen", ja: "デビッド・スウェンセン", zh: "大卫·斯文森" },
    { ko: "애비게일 존슨", en: "Abigail Johnson", ja: "アビゲイル・ジョンソン", zh: "阿比盖尔·约翰逊" },
    { ko: "켄 그리핀", en: "Kenneth Griffin", ja: "ケネス・グリフィン", zh: "肯尼斯·格里芬" },
    { ko: "칼 아이칸", en: "Carl Icahn", ja: "カール・アイカーン", zh: "卡尔·伊坎" },
  ],

  // ── Report Pack (보고서 오피스) ─────────────────────────────
  // 편집기획실 — 저널리즘/출판 기획의 거장들
  "report:planning": [
    { ko: "조셉 퓰리처", en: "Joseph Pulitzer", ja: "ジョセフ・ピューリツァー", zh: "约瑟夫·普利策" },
    { ko: "캐서린 그레이엄", en: "Katharine Graham", ja: "キャサリン・グラハム", zh: "凯瑟琳·格雷厄姆" },
    { ko: "밥 우드워드", en: "Bob Woodward", ja: "ボブ・ウッドワード", zh: "鲍勃·伍德沃德" },
    { ko: "월터 리프먼", en: "Walter Lippmann", ja: "ウォルター・リップマン", zh: "沃尔特·李普曼" },
    { ko: "칼 번스타인", en: "Carl Bernstein", ja: "カール・バーンスタイン", zh: "卡尔·伯恩斯坦" },
    { ko: "호레이스 그릴리", en: "Horace Greeley", ja: "ホレス・グリーリー", zh: "霍勒斯·格里利" },
  ],
  // 리서치엔진팀 — 데이터 리서치/시각화의 선구자들
  "report:dev": [
    { ko: "한스 로슬링", en: "Hans Rosling", ja: "ハンス・ロスリング", zh: "汉斯·罗斯林" },
    { ko: "플로렌스 나이팅게일", en: "Florence Nightingale", ja: "フローレンス・ナイチンゲール", zh: "弗洛伦斯·南丁格尔" },
    { ko: "네이트 실버", en: "Nate Silver", ja: "ネイト・シルバー", zh: "内特·西尔弗" },
    { ko: "에드워드 터프티", en: "Edward Tufte", ja: "エドワード・タフティ", zh: "爱德华·塔夫特" },
    { ko: "존 스노우", en: "John Snow", ja: "ジョン・スノウ", zh: "约翰·斯诺" },
    { ko: "W.E.B. 두보이스", en: "W.E.B. Du Bois", ja: "W.E.B.デュボイス", zh: "W.E.B.杜波依斯" },
  ],
  // 문서디자인팀 — 타이포그래피/출판 디자인의 대가들
  "report:design": [
    { ko: "마시모 비넬리", en: "Massimo Vignelli", ja: "マッシモ・ヴィニェッリ", zh: "马西莫·维涅利" },
    { ko: "얀 치홀트", en: "Jan Tschichold", ja: "ヤン・チヒョルト", zh: "扬·奇肖尔德" },
    { ko: "폴 랜드", en: "Paul Rand", ja: "ポール・ランド", zh: "保罗·兰德" },
    { ko: "요제프 뮐러브로크만", en: "Josef Mueller-Brockmann", ja: "ヨゼフ・ミューラーブロックマン", zh: "约瑟夫·米勒-布罗克曼" },
    { ko: "베아트리스 워드", en: "Beatrice Warde", ja: "ベアトリス・ウォード", zh: "比阿特丽斯·沃德" },
    { ko: "에릭 슈피커만", en: "Erik Spiekermann", ja: "エリック・シュピーカーマン", zh: "埃里克·施皮克曼" },
  ],
  // 검수팀 — 문법/교정/편집의 대가들
  "report:qa": [
    { ko: "윌리엄 스트렁크", en: "William Strunk", ja: "ウィリアム・ストランク", zh: "威廉·斯特伦克" },
    { ko: "E.B. 화이트", en: "E.B. White", ja: "E.B.ホワイト", zh: "E.B.怀特" },
    { ko: "윌리엄 사파이어", en: "William Safire", ja: "ウィリアム・サファイア", zh: "威廉·萨菲尔" },
    { ko: "린 트러스", en: "Lynne Truss", ja: "リン・トラス", zh: "琳恩·特拉斯" },
    { ko: "메리 노리스", en: "Mary Norris", ja: "メアリー・ノリス", zh: "玛丽·诺里斯" },
    { ko: "벤저민 드레이어", en: "Benjamin Dreyer", ja: "ベンジャミン・ドレイヤー", zh: "本杰明·德莱尔" },
  ],
  // 운영 — 미디어 경영의 거장들
  "report:operations": [
    { ko: "테드 터너", en: "Ted Turner", ja: "テッド・ターナー", zh: "特德·特纳" },
    { ko: "루퍼트 머독", en: "Rupert Murdoch", ja: "ルパート・マードック", zh: "鲁伯特·默多克" },
    { ko: "아리아나 허핑턴", en: "Arianna Huffington", ja: "アリアナ・ハフィントン", zh: "阿里安娜·赫芬顿" },
    { ko: "윌리엄 허스트", en: "William Hearst", ja: "ウィリアム・ハースト", zh: "威廉·赫斯特" },
    { ko: "오프라 윈프리", en: "Oprah Winfrey", ja: "オプラ・ウィンフリー", zh: "奥普拉·温弗瑞" },
    { ko: "헨리 루스", en: "Henry Luce", ja: "ヘンリー・ルース", zh: "亨利·卢斯" },
  ],
  // 인프라/보안 — 언론 자유와 탐사보도의 수호자들
  "report:devsecops": [
    { ko: "에드워드 머로", en: "Edward R. Murrow", ja: "エドワード・マロー", zh: "爱德华·默罗" },
    { ko: "월터 크롱카이트", en: "Walter Cronkite", ja: "ウォルター・クロンカイト", zh: "沃尔特·克朗凯特" },
    { ko: "아이다 B. 웰스", en: "Ida B. Wells", ja: "アイダ・B・ウェルズ", zh: "艾达·B·威尔斯" },
    { ko: "넬리 블라이", en: "Nellie Bly", ja: "ネリー・ブライ", zh: "奈莉·布莱" },
    { ko: "대니얼 엘스버그", en: "Daniel Ellsberg", ja: "ダニエル・エルズバーグ", zh: "丹尼尔·埃尔斯伯格" },
    { ko: "I.F. 스톤", en: "I.F. Stone", ja: "I.F.ストーン", zh: "I.F.斯通" },
  ],

  // ── Web Research Report Pack (웹 리서치 오피스) ────────────
  // 조사전략실 — 인터넷/정보 검색의 개척자들
  "web_research_report:planning": [
    { ko: "팀 버너스리", en: "Tim Berners-Lee", ja: "ティム・バーナーズリー", zh: "蒂姆·伯纳斯-李" },
    { ko: "바네바 부시", en: "Vannevar Bush", ja: "ヴァネヴァー・ブッシュ", zh: "万尼瓦尔·布什" },
    { ko: "래리 페이지", en: "Larry Page", ja: "ラリー・ペイジ", zh: "拉里·佩奇" },
    { ko: "세르게이 브린", en: "Sergey Brin", ja: "セルゲイ・ブリン", zh: "谢尔盖·布林" },
    { ko: "지미 웨일스", en: "Jimmy Wales", ja: "ジミー・ウェールズ", zh: "吉米·威尔士" },
    { ko: "브루스터 케일", en: "Brewster Kahle", ja: "ブリュースター・ケール", zh: "布鲁斯特·卡利" },
  ],
  // 크롤링팀 — 정보 이론/네트워크의 선구자들
  "web_research_report:dev": [
    { ko: "클로드 섀넌", en: "Claude Shannon", ja: "クロード・シャノン", zh: "克劳德·香农" },
    { ko: "빈트 서프", en: "Vint Cerf", ja: "ヴィント・サーフ", zh: "温顿·瑟夫" },
    { ko: "테드 넬슨", en: "Ted Nelson", ja: "テッド・ネルソン", zh: "泰德·尼尔森" },
    { ko: "더그 엥겔바트", en: "Doug Engelbart", ja: "ダグ・エンゲルバート", zh: "道格·恩格尔巴特" },
    { ko: "레이 톰린슨", en: "Ray Tomlinson", ja: "レイ・トムリンソン", zh: "雷·汤姆林森" },
    { ko: "앨런 케이", en: "Alan Kay", ja: "アラン・ケイ", zh: "艾伦·凯" },
  ],
  // 데이터 시각화/정보 디자인
  "web_research_report:design": [
    { ko: "데이비드 맥캔들리스", en: "David McCandless", ja: "デビッド・マキャンドレス", zh: "大卫·麦坎德利斯" },
    { ko: "니콜라스 펠턴", en: "Nicholas Felton", ja: "ニコラス・フェルトン", zh: "尼古拉斯·费尔顿" },
    { ko: "조르지아 루피", en: "Giorgia Lupi", ja: "ジョルジア・ルピ", zh: "乔治亚·卢皮" },
    { ko: "알베르토 카이로", en: "Alberto Cairo", ja: "アルベルト・カイロ", zh: "阿尔贝托·开罗" },
    { ko: "아만다 콕스", en: "Amanda Cox", ja: "アマンダ・コックス", zh: "阿曼达·考克斯" },
    { ko: "페르난다 비에가스", en: "Fernanda Viegas", ja: "フェルナンダ・ヴィエガス", zh: "费尔南达·维加斯" },
  ],
  // 팩트체크팀 — 탐사보도/팩트체크의 거장들
  "web_research_report:qa": [
    { ko: "아이다 타벨", en: "Ida Tarbell", ja: "アイダ・ターベル", zh: "艾达·塔贝尔" },
    { ko: "시모어 허시", en: "Seymour Hersh", ja: "シーモア・ハーシュ", zh: "西摩·赫什" },
    { ko: "크리스티안 아만푸르", en: "Christiane Amanpour", ja: "クリスティアン・アマンプール", zh: "克里斯蒂安·阿曼普尔" },
    { ko: "글렌 그린월드", en: "Glenn Greenwald", ja: "グレン・グリーンウォルド", zh: "格伦·格林沃尔德" },
    { ko: "안나 폴리트콥스카야", en: "Anna Politkovskaya", ja: "アンナ・ポリトコフスカヤ", zh: "安娜·波利特科夫斯卡娅" },
    { ko: "칼 세이건", en: "Carl Sagan", ja: "カール・セーガン", zh: "卡尔·萨根" },
  ],
  // 운영 — 인터넷 플랫폼 운영의 거장들
  "web_research_report:operations": [
    { ko: "마크 앤드리슨", en: "Marc Andreessen", ja: "マーク・アンドリーセン", zh: "马克·安德森" },
    { ko: "제프 베이조스", en: "Jeff Bezos", ja: "ジェフ・ベゾス", zh: "杰夫·贝索斯" },
    { ko: "에브 윌리엄스", en: "Ev Williams", ja: "エヴ・ウィリアムズ", zh: "埃夫·威廉斯" },
    { ko: "잭 도시", en: "Jack Dorsey", ja: "ジャック・ドーシー", zh: "杰克·多西" },
    { ko: "리드 호프만", en: "Reid Hoffman", ja: "リード・ホフマン", zh: "里德·霍夫曼" },
    { ko: "마리사 메이어", en: "Marissa Mayer", ja: "マリッサ・メイヤー", zh: "玛丽莎·梅耶尔" },
  ],
  // 보안 — 사이버 보안/암호학의 선구자들
  "web_research_report:devsecops": [
    { ko: "브루스 슈나이어", en: "Bruce Schneier", ja: "ブルース・シュナイアー", zh: "布鲁斯·施奈尔" },
    { ko: "필 짐머먼", en: "Phil Zimmermann", ja: "フィル・ジマーマン", zh: "菲尔·齐默尔曼" },
    { ko: "휘트필드 디피", en: "Whitfield Diffie", ja: "ホイットフィールド・ディフィー", zh: "惠特菲尔德·迪菲" },
    { ko: "마틴 헬먼", en: "Martin Hellman", ja: "マーティン・ヘルマン", zh: "马丁·赫尔曼" },
    { ko: "케빈 미트닉", en: "Kevin Mitnick", ja: "ケヴィン・ミトニック", zh: "凯文·米特尼克" },
    { ko: "리누스 토르발스", en: "Linus Torvalds", ja: "リーナス・トーバルズ", zh: "林纳斯·托瓦兹" },
  ],

  // ── Novel Pack (소설 스튜디오) ─────────────────────────────
  // 세계관실 — SF/판타지 세계관 구축의 거장들
  "novel:planning": [
    { ko: "J.R.R. 톨킨", en: "J.R.R. Tolkien", ja: "J.R.R.トールキン", zh: "J.R.R.托尔金" },
    { ko: "어슐러 르 귄", en: "Ursula K. Le Guin", ja: "アーシュラ・K・ル＝グウィン", zh: "厄休拉·勒古恩" },
    { ko: "프랭크 허버트", en: "Frank Herbert", ja: "フランク・ハーバート", zh: "弗兰克·赫伯特" },
    { ko: "아이작 아시모프", en: "Isaac Asimov", ja: "アイザック・アシモフ", zh: "艾萨克·阿西莫夫" },
    { ko: "조지 R.R. 마틴", en: "George R.R. Martin", ja: "ジョージ・R・R・マーティン", zh: "乔治·R·R·马丁" },
    { ko: "H.P. 러브크래프트", en: "H.P. Lovecraft", ja: "H.P.ラヴクラフト", zh: "H.P.洛夫克拉夫特" },
  ],
  // 서사엔진팀 — 문학사 최고의 서사 작가들
  "novel:dev": [
    { ko: "윌리엄 셰익스피어", en: "William Shakespeare", ja: "ウィリアム・シェイクスピア", zh: "威廉·莎士比亚" },
    { ko: "레프 톨스토이", en: "Leo Tolstoy", ja: "レフ・トルストイ", zh: "列夫·托尔斯泰" },
    { ko: "찰스 디킨스", en: "Charles Dickens", ja: "チャールズ・ディケンズ", zh: "查尔斯·狄更斯" },
    { ko: "가브리엘 마르케스", en: "Gabriel Garcia Marquez", ja: "ガブリエル・マルケス", zh: "加布里埃尔·马尔克斯" },
    { ko: "표도르 도스토옙스키", en: "Fyodor Dostoevsky", ja: "フョードル・ドストエフスキー", zh: "费奥多尔·陀思妥耶夫斯基" },
    { ko: "무라카미 하루키", en: "Haruki Murakami", ja: "村上春樹", zh: "村上春树" },
  ],
  // 캐릭터 아트팀 — 캐릭터 창조의 거장들
  "novel:design": [
    { ko: "데즈카 오사무", en: "Osamu Tezuka", ja: "手塚治虫", zh: "手冢治虫" },
    { ko: "월트 디즈니", en: "Walt Disney", ja: "ウォルト・ディズニー", zh: "沃尔特·迪士尼" },
    { ko: "미야자키 하야오", en: "Hayao Miyazaki", ja: "宮崎駿", zh: "宫崎骏" },
    { ko: "스탠 리", en: "Stan Lee", ja: "スタン・リー", zh: "斯坦·李" },
    { ko: "토리야마 아키라", en: "Akira Toriyama", ja: "鳥山明", zh: "鸟山明" },
    { ko: "뫼비우스", en: "Moebius", ja: "メビウス", zh: "莫比斯" },
  ],
  // 톤 검수팀 — 문학 비평/문체 분석의 거장들
  "novel:qa": [
    { ko: "버지니아 울프", en: "Virginia Woolf", ja: "ヴァージニア・ウルフ", zh: "弗吉尼亚·伍尔夫" },
    { ko: "해럴드 블룸", en: "Harold Bloom", ja: "ハロルド・ブルーム", zh: "哈罗德·布鲁姆" },
    { ko: "수전 손택", en: "Susan Sontag", ja: "スーザン・ソンタグ", zh: "苏珊·桑塔格" },
    { ko: "T.S. 엘리엇", en: "T.S. Eliot", ja: "T.S.エリオット", zh: "T.S.艾略特" },
    { ko: "새뮤얼 존슨", en: "Samuel Johnson", ja: "サミュエル・ジョンソン", zh: "塞缪尔·约翰逊" },
    { ko: "에드먼드 윌슨", en: "Edmund Wilson", ja: "エドマンド・ウィルソン", zh: "埃德蒙·威尔逊" },
  ],
  // 운영 — 전설적 출판 편집자/발행인들
  "novel:operations": [
    { ko: "맥스웰 퍼킨스", en: "Maxwell Perkins", ja: "マックスウェル・パーキンズ", zh: "麦克斯韦·珀金斯" },
    { ko: "베넷 서프", en: "Bennett Cerf", ja: "ベネット・サーフ", zh: "贝内特·瑟夫" },
    { ko: "앨프레드 노프", en: "Alfred Knopf", ja: "アルフレッド・クノップフ", zh: "阿尔弗雷德·克诺夫" },
    { ko: "앨런 레인", en: "Allen Lane", ja: "アレン・レーン", zh: "艾伦·莱恩" },
    { ko: "바니 로셋", en: "Barney Rosset", ja: "バーニー・ロゼット", zh: "巴尼·罗塞特" },
    { ko: "제이슨 엡스타인", en: "Jason Epstein", ja: "ジェイソン・エプスタイン", zh: "杰森·爱泼斯坦" },
  ],
  // 검열/자유 — 표현의 자유를 수호한 작가들
  "novel:devsecops": [
    { ko: "볼테르", en: "Voltaire", ja: "ヴォルテール", zh: "伏尔泰" },
    { ko: "조지 오웰", en: "George Orwell", ja: "ジョージ・オーウェル", zh: "乔治·奥威尔" },
    { ko: "레이 브래드버리", en: "Ray Bradbury", ja: "レイ・ブラッドベリ", zh: "雷·布拉德伯里" },
    { ko: "살만 루시디", en: "Salman Rushdie", ja: "サルマン・ラシュディ", zh: "萨尔曼·拉什迪" },
    { ko: "존 밀턴", en: "John Milton", ja: "ジョン・ミルトン", zh: "约翰·弥尔顿" },
    { ko: "솔제니친", en: "Aleksandr Solzhenitsyn", ja: "アレクサンドル・ソルジェニーツィン", zh: "亚历山大·索尔仁尼琴" },
  ],

  // ── Video Pre-production Pack (영상 프리프로덕션) ──────────
  // 프리프로덕션팀 — 전설적 영화 감독/프로듀서들
  "video_preprod:planning": [
    { ko: "스티븐 스필버그", en: "Steven Spielberg", ja: "スティーヴン・スピルバーグ", zh: "史蒂文·斯皮尔伯格" },
    { ko: "캐슬린 케네디", en: "Kathleen Kennedy", ja: "キャスリーン・ケネディ", zh: "凯瑟琳·肯尼迪" },
    { ko: "케빈 파이기", en: "Kevin Feige", ja: "ケヴィン・ファイギ", zh: "凯文·费奇" },
    { ko: "봉준호", en: "Bong Joon-ho", ja: "ポン・ジュノ", zh: "奉俊昊" },
    { ko: "제리 브룩하이머", en: "Jerry Bruckheimer", ja: "ジェリー・ブラッカイマー", zh: "杰瑞·布鲁克海默" },
    { ko: "데이비드 핀처", en: "David Fincher", ja: "デヴィッド・フィンチャー", zh: "大卫·芬奇" },
  ],
  // 씬 엔진팀 — 영화사 최고의 연출가들
  "video_preprod:dev": [
    { ko: "앨프레드 히치콕", en: "Alfred Hitchcock", ja: "アルフレッド・ヒッチコック", zh: "阿尔弗雷德·希区柯克" },
    { ko: "스탠리 큐브릭", en: "Stanley Kubrick", ja: "スタンリー・キューブリック", zh: "斯坦利·库布里克" },
    { ko: "구로사와 아키라", en: "Akira Kurosawa", ja: "黒澤明", zh: "黑泽明" },
    { ko: "크리스토퍼 놀란", en: "Christopher Nolan", ja: "クリストファー・ノーラン", zh: "克里斯托弗·诺兰" },
    { ko: "마틴 스코세이지", en: "Martin Scorsese", ja: "マーティン・スコセッシ", zh: "马丁·斯科塞斯" },
    { ko: "박찬욱", en: "Park Chan-wook", ja: "パク・チャヌク", zh: "朴赞郁" },
  ],
  // 아트/촬영팀 — 전설적 촬영감독들
  "video_preprod:design": [
    { ko: "로저 디킨스", en: "Roger Deakins", ja: "ロジャー・ディーキンス", zh: "罗杰·迪金斯" },
    { ko: "에마뉘엘 루베즈키", en: "Emmanuel Lubezki", ja: "エマニュエル・ルベツキ", zh: "埃曼努尔·卢贝兹基" },
    { ko: "비토리오 스토라로", en: "Vittorio Storaro", ja: "ヴィットリオ・ストラーロ", zh: "维托里奥·斯托拉罗" },
    { ko: "야누스 카민스키", en: "Janusz Kaminski", ja: "ヤヌス・カミンスキー", zh: "雅努什·卡明斯基" },
    { ko: "월리 피스터", en: "Wally Pfister", ja: "ウォーリー・フィスター", zh: "沃利·菲斯特" },
    { ko: "호이테 반 호이테마", en: "Hoyte van Hoytema", ja: "ホイテ・ヴァン・ホイテマ", zh: "霍伊特·范·霍特马" },
  ],
  // 컷 검수팀 — 전설적 영화 편집자들
  "video_preprod:qa": [
    { ko: "월터 머치", en: "Walter Murch", ja: "ウォルター・マーチ", zh: "沃尔特·默奇" },
    { ko: "셀마 스쿤메이커", en: "Thelma Schoonmaker", ja: "セルマ・スクーンメイカー", zh: "塞尔玛·斯库梅克" },
    { ko: "리 스미스", en: "Lee Smith", ja: "リー・スミス", zh: "李·史密斯" },
    { ko: "마이클 칸", en: "Michael Kahn", ja: "マイケル・カーン", zh: "迈克尔·卡恩" },
    { ko: "샐리 멩케", en: "Sally Menke", ja: "サリー・メンケ", zh: "萨莉·门克" },
    { ko: "앤 V. 코츠", en: "Anne V. Coates", ja: "アン・V・コーツ", zh: "安·V·科茨" },
  ],
  // 운영 — 할리우드 스튜디오 경영의 전설들
  "video_preprod:operations": [
    { ko: "어빙 탈버그", en: "Irving Thalberg", ja: "アーヴィング・タルバーグ", zh: "欧文·塔尔伯格" },
    { ko: "데이비드 셀즈닉", en: "David O. Selznick", ja: "デヴィッド・セルズニック", zh: "大卫·塞尔兹尼克" },
    { ko: "셰리 랜싱", en: "Sherry Lansing", ja: "シェリー・ランシング", zh: "雪莉·兰辛" },
    { ko: "잭 워너", en: "Jack Warner", ja: "ジャック・ワーナー", zh: "杰克·华纳" },
    { ko: "루이스 B. 메이어", en: "Louis B. Mayer", ja: "ルイス・B・メイヤー", zh: "路易斯·B·梅耶" },
    { ko: "루 와서먼", en: "Lew Wasserman", ja: "ルー・ワッサーマン", zh: "卢·瓦瑟曼" },
  ],
  // VFX/기술 — 특수효과/시각효과의 선구자들
  "video_preprod:devsecops": [
    { ko: "레이 해리하우젠", en: "Ray Harryhausen", ja: "レイ・ハリーハウゼン", zh: "雷·哈里豪森" },
    { ko: "더글러스 트럼불", en: "Douglas Trumbull", ja: "ダグラス・トランブル", zh: "道格拉斯·特朗布尔" },
    { ko: "존 딕스트라", en: "John Dykstra", ja: "ジョン・ダイクストラ", zh: "约翰·戴克斯特拉" },
    { ko: "데니스 뮤런", en: "Dennis Muren", ja: "デニス・ミューレン", zh: "丹尼斯·缪伦" },
    { ko: "스탠 윈스턴", en: "Stan Winston", ja: "スタン・ウィンストン", zh: "斯坦·温斯顿" },
    { ko: "필 티펫", en: "Phil Tippett", ja: "フィル・ティペット", zh: "菲尔·蒂贝特" },
  ],

  // ── Roleplay Pack (롤플레이 스튜디오) ─────────────────────
  // 캐릭터기획실 — 게임/캐릭터 창조의 거장들
  "roleplay:planning": [
    { ko: "게리 가이객스", en: "Gary Gygax", ja: "ゲイリー・ガイギャックス", zh: "加里·吉盖克斯" },
    { ko: "미야모토 시게루", en: "Shigeru Miyamoto", ja: "宮本茂", zh: "宫本茂" },
    { ko: "코지마 히데오", en: "Hideo Kojima", ja: "小島秀夫", zh: "小岛秀夫" },
    { ko: "사카구치 히로노부", en: "Hironobu Sakaguchi", ja: "坂口博信", zh: "坂口博信" },
    { ko: "토드 하워드", en: "Todd Howard", ja: "トッド・ハワード", zh: "托德·霍华德" },
    { ko: "윌 라이트", en: "Will Wright", ja: "ウィル・ライト", zh: "威尔·赖特" },
  ],
  // 대사엔진팀 — 대사/시나리오의 대가들
  "roleplay:dev": [
    { ko: "아론 소킨", en: "Aaron Sorkin", ja: "アーロン・ソーキン", zh: "阿伦·索金" },
    { ko: "쿠엔틴 타란티노", en: "Quentin Tarantino", ja: "クエンティン・タランティーノ", zh: "昆汀·塔伦蒂诺" },
    { ko: "노라 에프런", en: "Nora Ephron", ja: "ノーラ・エフロン", zh: "诺拉·艾芙隆" },
    { ko: "찰리 카우프만", en: "Charlie Kaufman", ja: "チャーリー・カウフマン", zh: "查理·考夫曼" },
    { ko: "패디 차예프스키", en: "Paddy Chayefsky", ja: "パディ・チャイエフスキー", zh: "帕迪·查耶夫斯基" },
    { ko: "데이비드 매밋", en: "David Mamet", ja: "デヴィッド・マメット", zh: "大卫·马梅特" },
  ],
  // 연출아트팀 — 무대/의상/비주얼 디자인의 거장들
  "roleplay:design": [
    { ko: "이시오카 에이코", en: "Eiko Ishioka", ja: "石岡瑛子", zh: "石冈瑛子" },
    { ko: "콜린 앳우드", en: "Colleen Atwood", ja: "コリーン・アトウッド", zh: "柯琳·阿特伍德" },
    { ko: "H.R. 기거", en: "H.R. Giger", ja: "H.R.ギーガー", zh: "H.R.吉格尔" },
    { ko: "시드 미드", en: "Syd Mead", ja: "シド・ミード", zh: "席德·米德" },
    { ko: "릭 베이커", en: "Rick Baker", ja: "リック・ベイカー", zh: "里克·贝克" },
    { ko: "줄리 테이머", en: "Julie Taymor", ja: "ジュリー・テイモア", zh: "朱莉·泰莫" },
  ],
  // 캐릭터검수팀 — 서사 구조/원형 분석의 거장들
  "roleplay:qa": [
    { ko: "조셉 캠벨", en: "Joseph Campbell", ja: "ジョセフ・キャンベル", zh: "约瑟夫·坎贝尔" },
    { ko: "칼 융", en: "Carl Jung", ja: "カール・ユング", zh: "卡尔·荣格" },
    { ko: "블라디미르 프롭", en: "Vladimir Propp", ja: "ウラジーミル・プロップ", zh: "弗拉基米尔·普罗普" },
    { ko: "크리스토퍼 보글러", en: "Christopher Vogler", ja: "クリストファー・ヴォグラー", zh: "克里斯托弗·沃格勒" },
    { ko: "로버트 맥키", en: "Robert McKee", ja: "ロバート・マッキー", zh: "罗伯特·麦基" },
    { ko: "블레이크 스나이더", en: "Blake Snyder", ja: "ブレイク・スナイダー", zh: "布莱克·斯奈德" },
  ],
  // 운영 — 게임 산업 경영의 전설들
  "roleplay:operations": [
    { ko: "게이브 뉴얼", en: "Gabe Newell", ja: "ゲイブ・ニューウェル", zh: "加布·纽维尔" },
    { ko: "이와타 사토루", en: "Satoru Iwata", ja: "岩田聡", zh: "岩田聪" },
    { ko: "필 스펜서", en: "Phil Spencer", ja: "フィル・スペンサー", zh: "菲尔·斯宾塞" },
    { ko: "레지 피서메", en: "Reggie Fils-Aime", ja: "レジー・フィサメ", zh: "雷吉·菲尔斯-埃梅" },
    { ko: "시드 마이어", en: "Sid Meier", ja: "シド・マイヤー", zh: "席德·梅尔" },
    { ko: "리처드 게리엇", en: "Richard Garriott", ja: "リチャード・ギャリオット", zh: "理查德·盖瑞特" },
  ],
  // 엔진/기술 — 게임 엔진/기술의 선구자들
  "roleplay:devsecops": [
    { ko: "존 카맥", en: "John Carmack", ja: "ジョン・カーマック", zh: "约翰·卡马克" },
    { ko: "팀 스위니", en: "Tim Sweeney", ja: "ティム・スウィーニー", zh: "蒂姆·斯威尼" },
    { ko: "켄 레빈", en: "Ken Levine", ja: "ケン・レヴィン", zh: "肯·莱文" },
    { ko: "마르쿠스 페르손", en: "Markus Persson", ja: "マルクス・ペルソン", zh: "马库斯·佩尔松" },
    { ko: "이와이 토시오", en: "Toshio Iwai", ja: "岩井俊雄", zh: "岩井俊雄" },
    { ko: "제시 셸", en: "Jesse Schell", ja: "ジェシー・シェル", zh: "杰西·谢尔" },
  ],
};

const PACK_SEED_PROFILE: Partial<Record<WorkflowPackKey, SeedProfile>> = {
  report: {
    nameOffset: 0,
    tone: {
      ko: "근거와 문서 완성도를 최우선으로 판단합니다.",
      en: "Prioritizes evidence quality and document completeness.",
      ja: "根拠の確かさと文書の完成度を最優先します。",
      zh: "以证据质量与文档完整度为最高优先级。",
    },
  },
  web_research_report: {
    nameOffset: 1,
    tone: {
      ko: "출처 신뢰도와 사실 검증을 중심으로 움직입니다.",
      en: "Focused on source credibility and fact verification.",
      ja: "情報源の信頼性と事実検証を中心に進めます。",
      zh: "聚焦来源可信度与事实核验。",
    },
  },
  novel: {
    nameOffset: 2,
    tone: {
      ko: "서사 몰입도와 캐릭터 일관성을 가장 중시합니다.",
      en: "Values narrative immersion and character consistency the most.",
      ja: "物語への没入感とキャラクターの一貫性を最重視します。",
      zh: "最重视叙事沉浸感与角色一致性。",
    },
  },
  video_preprod: {
    nameOffset: 3,
    tone: {
      ko: "콘티, 샷 구성, 제작 효율을 우선합니다.",
      en: "Prioritizes storyboard quality, shot composition, and production efficiency.",
      ja: "コンテ品質、ショット構成、制作効率を優先します。",
      zh: "优先保证分镜质量、镜头构成与制作效率。",
    },
  },
  roleplay: {
    nameOffset: 4,
    tone: {
      ko: "캐릭터 몰입감과 대화 리듬을 우선합니다.",
      en: "Prioritizes character immersion and dialogue rhythm.",
      ja: "キャラクター没入感と会話のテンポを優先します。",
      zh: "优先保障角色沉浸感与对话节奏。",
    },
  },
  asset_management: {
    nameOffset: 5,
    tone: {
      ko: "리스크 대비 수익률과 규제 준수를 최우선으로 판단합니다.",
      en: "Prioritizes risk-adjusted returns and regulatory compliance.",
      ja: "リスク調整済みリターンと規制遵守を最優先します。",
      zh: "以风险调整回报和监管合规为最高优先级。",
    },
  },
};

const PACK_PRESETS: Record<WorkflowPackKey, PackPreset> = {
  development: {
    key: "development",
    slug: "DEV",
    label: {
      ko: "개발 오피스",
      en: "Development Office",
      ja: "開発オフィス",
      zh: "开发办公室",
    },
    summary: {
      ko: "기본 개발 조직 구조",
      en: "Default engineering organization",
      ja: "標準の開発組織",
      zh: "默认开发组织",
    },
    roomThemes: DEV_THEMES,
    departments: {},
  },
  report: {
    key: "report",
    slug: "RPT",
    label: {
      ko: "보고서 오피스",
      en: "Report Office",
      ja: "レポートオフィス",
      zh: "报告办公室",
    },
    summary: {
      ko: "리서치/문서화 중심 팀 구성",
      en: "Research and documentation focused crew",
      ja: "調査・文書化中心の構成",
      zh: "以调研与文档为核心的团队",
    },
    roomThemes: {
      ceoOffice: { floor1: 0xf0e8dc, floor2: 0xebdfce, wall: 0x8f7a63, accent: 0xbd8b57 },
      planning: { floor1: 0xe6ecf6, floor2: 0xdde5f1, wall: 0x5f7394, accent: 0x7090bd },
      dev: { floor1: 0xe7f0ed, floor2: 0xddeae5, wall: 0x5c7d73, accent: 0x6ea495 },
      design: { floor1: 0xf4ecf4, floor2: 0xece2ed, wall: 0x82658a, accent: 0xa076ab },
      qa: { floor1: 0xf8efe9, floor2: 0xf0e3d8, wall: 0x8c6c5f, accent: 0xb67b63 },
      devsecops: { floor1: 0xe8edf0, floor2: 0xdee5ea, wall: 0x596778, accent: 0x6f85a0 },
      operations: { floor1: 0xe9f1e7, floor2: 0xe0ebdc, wall: 0x5f7d5b, accent: 0x76a06b },
      breakRoom: { floor1: 0xf5efe4, floor2: 0xede4d3, wall: 0x8f866d, accent: 0xc2a26b },
    },
    departments: {
      planning: {
        name: { ko: "편집기획실", en: "Editorial Planning", ja: "編集企画室", zh: "编辑企划室" },
        icon: "📚",
        agentPrefix: { ko: "편집 PM", en: "Editorial PM", ja: "編集PM", zh: "编辑PM" },
        avatarPool: ["📚", "🗂️", "🧭"],
      },
      dev: {
        name: { ko: "리서치엔진팀", en: "Research Engine", ja: "リサーチエンジン", zh: "调研引擎组" },
        icon: "🧠",
        agentPrefix: { ko: "리서처", en: "Researcher", ja: "リサーチャー", zh: "研究员" },
        avatarPool: ["🧠", "📊", "📝"],
      },
      design: {
        name: { ko: "문서디자인팀", en: "Doc Design", ja: "ドキュメントデザイン", zh: "文档设计组" },
        icon: "🧾",
        agentPrefix: { ko: "문서 디자이너", en: "Doc Designer", ja: "資料デザイナー", zh: "文档设计师" },
        avatarPool: ["🧾", "🎨", "📐"],
      },
      qa: {
        name: { ko: "검수팀", en: "Review Desk", ja: "レビュー班", zh: "审校组" },
        icon: "🔎",
        agentPrefix: { ko: "검수관", en: "Reviewer", ja: "レビュア", zh: "审校员" },
        avatarPool: ["🔎", "✅", "🧪"],
      },
    },
    staff: {
      nonLeaderDeptCycle: ["planning", "planning", "dev", "qa", "design", "planning", "dev", "qa", "operations"],
    },
  },
  web_research_report: {
    key: "web_research_report",
    slug: "WEB",
    label: {
      ko: "웹 리서치 오피스",
      en: "Web Research Office",
      ja: "Web調査オフィス",
      zh: "网页调研办公室",
    },
    summary: {
      ko: "소스 수집과 근거 검증 중심",
      en: "Source collection and citation verification",
      ja: "情報源収集と根拠検証中心",
      zh: "以来源收集与证据校验为核心",
    },
    roomThemes: {
      ceoOffice: { floor1: 0xddebf1, floor2: 0xd2e3eb, wall: 0x4e6f7f, accent: 0x3d90b5 },
      planning: { floor1: 0xe2eef6, floor2: 0xd8e7f1, wall: 0x55728d, accent: 0x5f95c6 },
      dev: { floor1: 0xe2f1ef, floor2: 0xd8ebe8, wall: 0x4d7a72, accent: 0x4fa69a },
      design: { floor1: 0xeceff7, floor2: 0xe2e8f2, wall: 0x606c88, accent: 0x748ec5 },
      qa: { floor1: 0xf0f3f7, floor2: 0xe6ecf2, wall: 0x5d6f80, accent: 0x7a93b0 },
      devsecops: { floor1: 0xe4edf5, floor2: 0xd9e4ef, wall: 0x4e617a, accent: 0x5f7fa5 },
      operations: { floor1: 0xe5f3ec, floor2: 0xdbeadf, wall: 0x52755d, accent: 0x5fa777 },
      breakRoom: { floor1: 0xe8f0f4, floor2: 0xdce8ef, wall: 0x5f7380, accent: 0x7ca0b9 },
    },
    departments: {
      planning: {
        name: { ko: "조사전략실", en: "Research Strategy", ja: "調査戦略室", zh: "调研战略室" },
        icon: "🧭",
        agentPrefix: { ko: "전략 분석가", en: "Strategy Analyst", ja: "戦略アナリスト", zh: "策略分析师" },
        avatarPool: ["🧭", "🗺️", "📌"],
      },
      dev: {
        name: { ko: "크롤링팀", en: "Crawler Team", ja: "クロール班", zh: "爬取组" },
        icon: "🕸️",
        agentPrefix: { ko: "수집 엔지니어", en: "Collection Engineer", ja: "収集エンジニア", zh: "采集工程师" },
        avatarPool: ["🕸️", "🔗", "🧠"],
      },
      qa: {
        name: { ko: "팩트체크팀", en: "Fact Check", ja: "ファクトチェック", zh: "事实核验组" },
        icon: "✅",
        agentPrefix: { ko: "검증관", en: "Verifier", ja: "検証官", zh: "核验员" },
        avatarPool: ["✅", "🔍", "📎"],
      },
    },
    staff: {
      nonLeaderDeptCycle: ["planning", "dev", "qa", "dev", "planning", "qa", "operations", "devsecops"],
    },
  },
  novel: {
    key: "novel",
    slug: "NOV",
    label: {
      ko: "소설 스튜디오",
      en: "Novel Studio",
      ja: "小説スタジオ",
      zh: "小说工作室",
    },
    summary: {
      ko: "세계관/캐릭터/서사 중심 구성",
      en: "Worldbuilding, character and narrative setup",
      ja: "世界観・キャラ・物語中心",
      zh: "世界观/角色/叙事导向",
    },
    roomThemes: {
      ceoOffice: { floor1: 0xefe3d8, floor2: 0xe7d6c9, wall: 0x7c5d4b, accent: 0xb86b45 },
      planning: { floor1: 0xf2e7dc, floor2: 0xebddcf, wall: 0x7f624e, accent: 0xb97c4f },
      dev: { floor1: 0xe8e0f2, floor2: 0xdfd6eb, wall: 0x6e5a90, accent: 0x8d76bb },
      design: { floor1: 0xf6e3ea, floor2: 0xf0d8e1, wall: 0x885a6d, accent: 0xbc708f },
      qa: { floor1: 0xf3ece4, floor2: 0xece1d7, wall: 0x7f6b5a, accent: 0xa88468 },
      devsecops: { floor1: 0xe8e6ef, floor2: 0xddd9e8, wall: 0x5f5f7f, accent: 0x7b7ca8 },
      operations: { floor1: 0xe6efe8, floor2: 0xdce8e0, wall: 0x58735f, accent: 0x6b9a79 },
      breakRoom: { floor1: 0xf0e3cf, floor2: 0xe8d6bd, wall: 0x8a6f55, accent: 0xbc8b58 },
    },
    departments: {
      planning: {
        name: { ko: "세계관실", en: "Worldbuilding", ja: "世界観室", zh: "世界观组" },
        icon: "🌌",
        agentPrefix: { ko: "세계관 작가", en: "Lore Writer", ja: "設定作家", zh: "设定作者" },
        avatarPool: ["🌌", "📜", "🧭"],
      },
      dev: {
        name: { ko: "서사엔진팀", en: "Narrative Engine", ja: "物語エンジン", zh: "叙事引擎组" },
        icon: "✍️",
        agentPrefix: { ko: "서사 설계자", en: "Narrative Architect", ja: "物語設計者", zh: "叙事架构师" },
        avatarPool: ["✍️", "🖋️", "📘"],
      },
      design: {
        name: { ko: "캐릭터 아트팀", en: "Character Art", ja: "キャラアート", zh: "角色美术组" },
        icon: "🎭",
        agentPrefix: { ko: "캐릭터 디자이너", en: "Character Designer", ja: "キャラデザ", zh: "角色设计师" },
        avatarPool: ["🎭", "🧵", "🎨"],
      },
      qa: {
        name: { ko: "톤 검수팀", en: "Tone QA", ja: "トーン検証", zh: "语气审校组" },
        icon: "🪶",
        agentPrefix: { ko: "문체 검수관", en: "Style Reviewer", ja: "文体レビュア", zh: "文风审校员" },
        avatarPool: ["🪶", "📖", "✅"],
      },
    },
    staff: {
      nonLeaderDeptCycle: ["planning", "design", "dev", "design", "planning", "qa", "design", "operations"],
    },
  },
  video_preprod: {
    key: "video_preprod",
    slug: "VID",
    label: {
      ko: "영상 프리프로덕션",
      en: "Video Pre-production",
      ja: "映像プリプロ",
      zh: "视频前期策划",
    },
    summary: {
      ko: "콘티/샷리스트/편집 노트 중심",
      en: "Storyboard and shot-list focused setup",
      ja: "コンテ・ショットリスト中心",
      zh: "分镜与镜头清单导向",
    },
    roomThemes: {
      ceoOffice: { floor1: 0x1f1f25, floor2: 0x17171c, wall: 0x343748, accent: 0xd18d35 },
      planning: { floor1: 0x25212b, floor2: 0x1c1923, wall: 0x44405b, accent: 0xbc7d47 },
      dev: { floor1: 0x1d2631, floor2: 0x17202a, wall: 0x334961, accent: 0x4c8fca },
      design: { floor1: 0x2a2230, floor2: 0x211a27, wall: 0x544063, accent: 0xc274b7 },
      qa: { floor1: 0x2a2425, floor2: 0x211d1f, wall: 0x5a494b, accent: 0xb98862 },
      devsecops: { floor1: 0x1f242c, floor2: 0x182028, wall: 0x3b4d62, accent: 0x6f8fb0 },
      operations: { floor1: 0x1f2a25, floor2: 0x18211d, wall: 0x3e5d50, accent: 0x62a789 },
      breakRoom: { floor1: 0x2a2622, floor2: 0x211d1a, wall: 0x564c43, accent: 0xbd8a49 },
    },
    departments: {
      planning: {
        name: { ko: "프리프로덕션팀", en: "Pre-production", ja: "プリプロ班", zh: "前期策划组" },
        icon: "🎬",
        agentPrefix: { ko: "프로듀서", en: "Producer", ja: "プロデューサ", zh: "制片" },
        avatarPool: ["🎬", "📽️", "🧭"],
      },
      dev: {
        name: { ko: "씬 엔진팀", en: "Scene Engine", ja: "シーン設計", zh: "场景引擎组" },
        icon: "🎞️",
        agentPrefix: { ko: "씬 디렉터", en: "Scene Director", ja: "シーン監督", zh: "场景导演" },
        avatarPool: ["🎞️", "🧱", "🔧"],
      },
      design: {
        name: { ko: "아트/촬영팀", en: "Art & Camera", ja: "アート撮影", zh: "美术摄影组" },
        icon: "📷",
        agentPrefix: { ko: "촬영 디자이너", en: "Camera Designer", ja: "撮影デザイナ", zh: "摄影设计师" },
        avatarPool: ["📷", "🎨", "💡"],
      },
      qa: {
        name: { ko: "컷 검수팀", en: "Cut QA", ja: "カット検証", zh: "镜头审校组" },
        icon: "🧪",
        agentPrefix: { ko: "컷 검수관", en: "Cut Reviewer", ja: "カットレビュア", zh: "镜头审校员" },
        avatarPool: ["🧪", "✅", "📌"],
      },
    },
    staff: {
      nonLeaderDeptCycle: ["planning", "design", "operations", "dev", "design", "planning", "qa", "operations"],
    },
  },
  roleplay: {
    key: "roleplay",
    slug: "RPG",
    label: {
      ko: "롤플레이 스튜디오",
      en: "Roleplay Studio",
      ja: "ロールプレイスタジオ",
      zh: "角色扮演工作室",
    },
    summary: {
      ko: "캐릭터 연기와 대사 몰입 중심",
      en: "Character role and dialogue immersion",
      ja: "キャラ演技と会話没入",
      zh: "角色演绎与对话沉浸",
    },
    roomThemes: {
      ceoOffice: { floor1: 0xf3e7dc, floor2: 0xebdbc9, wall: 0x7d5c4d, accent: 0xbe6f53 },
      planning: { floor1: 0xefe6f6, floor2: 0xe5dbef, wall: 0x6a5d91, accent: 0x8a74c0 },
      dev: { floor1: 0xe6edf8, floor2: 0xdce6f4, wall: 0x576d91, accent: 0x6f8fd1 },
      design: { floor1: 0xf6e3f2, floor2: 0xefd8e9, wall: 0x835b80, accent: 0xc36eb4 },
      qa: { floor1: 0xf5efe6, floor2: 0xeee3d8, wall: 0x7f6d5c, accent: 0xb7956d },
      devsecops: { floor1: 0xe8ecf5, floor2: 0xdde4ef, wall: 0x566479, accent: 0x6d86ab },
      operations: { floor1: 0xe9f2ea, floor2: 0xdfeadf, wall: 0x5b7660, accent: 0x6fae7e },
      breakRoom: { floor1: 0xf4e8d5, floor2: 0xecdcc3, wall: 0x8a7458, accent: 0xc59a5e },
    },
    departments: {
      planning: {
        name: { ko: "캐릭터기획실", en: "Character Planning", ja: "キャラ企画室", zh: "角色企划室" },
        icon: "🎭",
        agentPrefix: { ko: "캐릭터 플래너", en: "Character Planner", ja: "キャラ企画", zh: "角色策划" },
        avatarPool: ["🎭", "🧠", "📜"],
      },
      dev: {
        name: { ko: "대사엔진팀", en: "Dialogue Engine", ja: "会話エンジン", zh: "对话引擎组" },
        icon: "🗣️",
        agentPrefix: { ko: "대사 연출가", en: "Dialogue Director", ja: "台詞演出", zh: "台词导演" },
        avatarPool: ["🗣️", "💬", "🎙️"],
      },
      design: {
        name: { ko: "연출아트팀", en: "Stage Art", ja: "演出アート", zh: "演出美术组" },
        icon: "🎨",
        agentPrefix: { ko: "연출 디자이너", en: "Stage Designer", ja: "演出デザイナ", zh: "演出设计师" },
        avatarPool: ["🎨", "✨", "🎬"],
      },
      qa: {
        name: { ko: "캐릭터검수팀", en: "Character QA", ja: "キャラ検証", zh: "角色审校组" },
        icon: "🔐",
        agentPrefix: { ko: "설정 검수관", en: "Lore Reviewer", ja: "設定レビュア", zh: "设定审校员" },
        avatarPool: ["🔐", "✅", "🧪"],
      },
    },
    staff: {
      nonLeaderDeptCycle: ["planning", "design", "dev", "design", "qa", "planning", "operations", "design"],
    },
  },
  asset_management: {
    key: "asset_management",
    slug: "AMC",
    label: {
      ko: "자산운용 오피스",
      en: "Asset Management Office",
      ja: "資産運用オフィス",
      zh: "资产管理办公室",
    },
    summary: {
      ko: "투자 전략 및 포트폴리오 운용 중심",
      en: "Investment strategy and portfolio management",
      ja: "投資戦略とポートフォリオ運用中心",
      zh: "投资策略与组合管理为核心",
    },
    roomThemes: {
      ceoOffice: { floor1: 0xe8dcc8, floor2: 0xe0d1b8, wall: 0x7a6844, accent: 0xc9a84c },
      planning: { floor1: 0xdce5ef, floor2: 0xd2dce8, wall: 0x4a5f7a, accent: 0x2e5090 },
      dev: { floor1: 0xdde8e6, floor2: 0xd3e0dd, wall: 0x4a6b65, accent: 0x1a7a5c },
      design: { floor1: 0xe4e1ee, floor2: 0xdad6e7, wall: 0x5c5680, accent: 0x6b5ba8 },
      qa: { floor1: 0xeee0d8, floor2: 0xe6d4c8, wall: 0x7a5540, accent: 0xb05030 },
      devsecops: { floor1: 0xe0e4ea, floor2: 0xd5dbe3, wall: 0x4e5a6e, accent: 0x3a506b },
      operations: { floor1: 0xdceae0, floor2: 0xd2e2d6, wall: 0x4a6e58, accent: 0x2a7850 },
      breakRoom: { floor1: 0xf0e8d8, floor2: 0xe8ddc8, wall: 0x8a7a5a, accent: 0xd4a84a },
    },
    departments: {
      planning: {
        name: { ko: "투자전략실", en: "Investment Strategy", ja: "投資戦略室", zh: "投资战略室" },
        icon: "📈",
        agentPrefix: { ko: "투자 전략가", en: "Investment Strategist", ja: "投資ストラテジスト", zh: "投资策略师" },
        avatarPool: ["📈", "🧭", "💡"],
      },
      dev: {
        name: { ko: "퀀트분석팀", en: "Quant Analysis", ja: "クオンツ分析", zh: "量化分析组" },
        icon: "🔢",
        agentPrefix: { ko: "퀀트 애널리스트", en: "Quant Analyst", ja: "クオンツアナリスト", zh: "量化分析师" },
        avatarPool: ["🔢", "📊", "🧠"],
      },
      design: {
        name: { ko: "리서치팀", en: "Investment Research", ja: "投資リサーチ", zh: "投研组" },
        icon: "📋",
        agentPrefix: { ko: "리서치 애널리스트", en: "Research Analyst", ja: "リサーチアナリスト", zh: "研究分析师" },
        avatarPool: ["📋", "🔍", "📝"],
      },
      qa: {
        name: { ko: "리스크관리팀", en: "Risk Management", ja: "リスク管理", zh: "风控组" },
        icon: "⚠️",
        agentPrefix: { ko: "리스크 매니저", en: "Risk Manager", ja: "リスクマネージャー", zh: "风控经理" },
        avatarPool: ["⚠️", "🛡️", "📉"],
      },
      devsecops: {
        name: { ko: "컴플라이언스팀", en: "Compliance", ja: "コンプライアンス", zh: "合规组" },
        icon: "⚖️",
        agentPrefix: { ko: "컴플라이언스 담당", en: "Compliance Officer", ja: "コンプライアンス担当", zh: "合规专员" },
        avatarPool: ["⚖️", "📜", "🔒"],
      },
      operations: {
        name: { ko: "펀드운용팀", en: "Fund Operations", ja: "ファンド運用", zh: "基金运营组" },
        icon: "💰",
        agentPrefix: { ko: "펀드 매니저", en: "Fund Manager", ja: "ファンドマネージャー", zh: "基金经理" },
        avatarPool: ["💰", "🏦", "⚙️"],
      },
    },
    staff: {
      nonLeaderDeptCycle: ["planning", "dev", "qa", "design", "planning", "dev", "operations", "devsecops"],
    },
  },
};

export function normalizeOfficeWorkflowPack(value: unknown): WorkflowPackKey {
  if (typeof value !== "string") return "development";
  return value in PACK_PRESETS ? (value as WorkflowPackKey) : "development";
}

function pickText(locale: UiLanguageLike, text: Localized): string {
  switch (locale) {
    case "ko":
      return text.ko;
    case "ja":
      return text.ja || text.en;
    case "zh":
      return text.zh || text.en;
    case "en":
    default:
      return text.en;
  }
}

function localizedNumberedName(
  locale: UiLanguageLike,
  prefix: Localized,
  order: number,
): { name: string; name_ko: string; name_ja: string; name_zh: string } {
  return {
    name: `${prefix.en} ${order}`,
    name_ko: `${prefix.ko} ${order}`,
    name_ja: `${prefix.ja} ${order}`,
    name_zh: `${prefix.zh} ${order}`,
  };
}

function localizedStaffDisplayName(params: {
  packKey: WorkflowPackKey;
  deptId: string;
  order: number;
  fallbackPrefix: Localized;
}): { name: string; name_ko: string; name_ja: string; name_zh: string } {
  const { packKey, deptId, order, fallbackPrefix } = params;
  const pool = DEPARTMENT_PERSON_NAME_POOL[`${packKey}:${deptId}`] ?? DEPARTMENT_PERSON_NAME_POOL[deptId];
  if (!pool || pool.length === 0) {
    return localizedNumberedName("en", fallbackPrefix, order);
  }
  const seedOffset = PACK_SEED_PROFILE[packKey]?.nameOffset ?? 0;
  const base = pool[(order - 1 + seedOffset) % pool.length] ?? pool[0];
  const cycle = Math.floor((order - 1) / pool.length) + 1;
  const suffix = cycle > 1 ? ` ${cycle}` : "";
  return {
    name: `${base.en}${suffix}`,
    name_ko: `${base.ko}${suffix}`,
    name_ja: `${base.ja}${suffix}`,
    name_zh: `${base.zh}${suffix}`,
  };
}

function resolveSeedSpriteNumber(
  params: {
    packKey: WorkflowPackKey;
    deptId: string;
    role: AgentRole;
    order: number;
  },
  usedSpriteNumbers: Set<number>,
): number {
  const seed = `${params.packKey}:${params.deptId}:${params.role}:${params.order}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const poolSize = OFFICE_SEED_SPRITE_POOL.length;
  const start = hash % poolSize;
  for (let offset = 0; offset < poolSize; offset += 1) {
    const candidate = OFFICE_SEED_SPRITE_POOL[(start + offset) % poolSize];
    if (candidate != null && !usedSpriteNumbers.has(candidate)) {
      return candidate;
    }
  }
  return OFFICE_SEED_SPRITE_POOL[start] ?? 1;
}

function buildSeedPersonality(params: {
  packKey: WorkflowPackKey;
  deptId: string;
  role: AgentRole;
  locale: UiLanguageLike;
  defaultPrefix: Localized;
  departmentName: { ko: string; en: string; ja: string; zh: string };
}): string | null {
  if (params.packKey === "development") return null;
  const tone = PACK_SEED_PROFILE[params.packKey]?.tone;
  if (!tone) return null;
  const locale = params.locale;
  const roleLabelMap: Record<UiLanguageLike, Record<AgentRole, string>> = {
    ko: {
      team_leader: "팀 리드",
      senior: "시니어",
      junior: "주니어",
      intern: "인턴",
    },
    en: {
      team_leader: "team lead",
      senior: "senior member",
      junior: "junior member",
      intern: "intern",
    },
    ja: {
      team_leader: "チームリーダー",
      senior: "シニア",
      junior: "ジュニア",
      intern: "インターン",
    },
    zh: {
      team_leader: "团队负责人",
      senior: "高级成员",
      junior: "初级成员",
      intern: "实习成员",
    },
  };
  const focusByLocale: Record<UiLanguageLike, string> = {
    ko: params.defaultPrefix.ko?.trim() || `${params.departmentName.ko} 담당`,
    en: params.defaultPrefix.en?.trim() || `${params.departmentName.en} coverage`,
    ja: params.defaultPrefix.ja?.trim() || `${params.departmentName.ja}担当`,
    zh: params.defaultPrefix.zh?.trim() || `${params.departmentName.zh}职责`,
  };
  const roleLabel = roleLabelMap[locale][params.role];
  const focus = focusByLocale[locale];
  const toneText = pickText(locale, tone);
  if (locale === "ko") return `${toneText} ${focus} 역할의 ${roleLabel}입니다.`;
  if (locale === "ja") return `${toneText} ${focus}を担当する${roleLabel}として動きます。`;
  if (locale === "zh") return `${toneText} 作为负责${focus}的${roleLabel}推进工作。`;
  return `${toneText} Serves as a ${roleLabel} focused on ${focus}.`;
}

function buildPackDepartmentDescription(params: {
  locale: UiLanguageLike;
  packSummary: Localized;
  departmentName: Localized;
}): string {
  const { locale, packSummary, departmentName } = params;
  const summary = pickText(locale, packSummary);
  const deptName = pickText(locale, departmentName);
  if (locale === "ko") return `${deptName}입니다. ${summary} 목표를 중심으로 협업합니다.`;
  if (locale === "ja") return `${deptName}です。${summary}の目標達成に向けて連携します。`;
  if (locale === "zh") return `${deptName}团队。围绕${summary}目标协作推进。`;
  return `${deptName} team. Collaborates to deliver the ${summary.toLowerCase()} goal.`;
}

function buildPackDepartmentPrompt(params: {
  locale: UiLanguageLike;
  packSummary: Localized;
  departmentName: Localized;
}): string {
  const { locale, packSummary, departmentName } = params;
  const summary = pickText(locale, packSummary);
  const deptName = pickText(locale, departmentName);
  if (locale === "ko") {
    return `[부서 역할] ${deptName}\n[업무 기준] ${summary}\n요청을 실행 가능한 단계로 나누고, 근거와 산출물을 명확히 제시하세요.`;
  }
  if (locale === "ja") {
    return `[部署の役割] ${deptName}\n[業務基準] ${summary}\n依頼を実行可能なステップに分解し、根拠と成果物を明確に提示してください。`;
  }
  if (locale === "zh") {
    return `[部门职责] ${deptName}\n[执行基准] ${summary}\n请将请求拆分为可执行步骤，并清晰提供依据与产出物。`;
  }
  return `[Department Role] ${deptName}\n[Execution Standard] ${summary}\nBreak requests into actionable steps and clearly provide rationale and deliverables.`;
}

export function getOfficePackMeta(packKey: WorkflowPackKey): { label: Localized; summary: Localized } {
  const preset = PACK_PRESETS[packKey] ?? PACK_PRESETS.development;
  return { label: preset.label, summary: preset.summary };
}

export function getOfficePackRoomThemes(packKey: WorkflowPackKey): Record<string, RoomTheme> {
  const preset = PACK_PRESETS[packKey] ?? PACK_PRESETS.development;
  return preset.roomThemes;
}

export function listOfficePackOptions(locale: UiLanguageLike): Array<{
  key: WorkflowPackKey;
  label: string;
  summary: string;
  slug: string;
  accent: number;
}> {
  return (Object.keys(PACK_PRESETS) as WorkflowPackKey[]).map((key) => ({
    key,
    label: pickText(locale, PACK_PRESETS[key].label),
    summary: pickText(locale, PACK_PRESETS[key].summary),
    slug: PACK_PRESETS[key].slug,
    accent: PACK_PRESETS[key].roomThemes.ceoOffice?.accent ?? 0x5a9fd4,
  }));
}

export function buildOfficePackPresentation(params: {
  packKey: WorkflowPackKey;
  locale: UiLanguageLike;
  departments: Department[];
  agents: Agent[];
  customRoomThemes: Record<string, RoomTheme>;
}): OfficePackPresentation {
  const { packKey, locale, departments, agents, customRoomThemes } = params;
  if (packKey === "development") {
    return {
      departments,
      agents,
      roomThemes: customRoomThemes,
    };
  }

  const preset = PACK_PRESETS[packKey] ?? PACK_PRESETS.development;
  const transformedDepartments = departments.map((dept) => {
    const deptPreset = preset.departments[dept.id];
    if (!deptPreset) return dept;
    const localizedName: Localized = {
      ko: deptPreset.name.ko || dept.name_ko || dept.name,
      en: deptPreset.name.en || dept.name,
      ja: deptPreset.name.ja || dept.name_ja || dept.name,
      zh: deptPreset.name.zh || dept.name_zh || dept.name,
    };
    return {
      ...dept,
      icon: deptPreset.icon,
      name: deptPreset.name.en,
      name_ko: deptPreset.name.ko,
      name_ja: deptPreset.name.ja,
      name_zh: deptPreset.name.zh,
      description: buildPackDepartmentDescription({
        locale,
        packSummary: preset.summary,
        departmentName: localizedName,
      }),
      prompt: buildPackDepartmentPrompt({
        locale,
        packSummary: preset.summary,
        departmentName: localizedName,
      }),
    };
  });

  return {
    departments: transformedDepartments,
    agents,
    roomThemes: {
      ...customRoomThemes,
      ...preset.roomThemes,
    },
  };
}

export function resolveOfficePackSeedProvider(params: {
  packKey: WorkflowPackKey;
  departmentId?: string | null;
  role: AgentRole;
  seedIndex: number;
  seedOrderInDepartment?: number;
}): OfficePackSeedProvider {
  if (params.packKey === "development") return "claude";
  const dept = String(params.departmentId ?? "")
    .trim()
    .toLowerCase();
  if (dept === "planning") {
    const order = params.seedOrderInDepartment ?? params.seedIndex;
    return order % 2 === 0 ? "codex" : "claude";
  }
  if (dept === "dev" || dept === "design") return "claude";
  if (dept === "devsecops" || dept === "operations" || dept === "qa") return "codex";
  return params.seedIndex % 2 === 0 ? "codex" : "claude";
}

export function buildOfficePackStarterAgents(params: {
  packKey: WorkflowPackKey;
  departments: Department[];
  targetCount?: number;
  locale?: UiLanguageLike;
}): OfficePackStarterAgentDraft[] {
  const { packKey, departments } = params;
  const locale = params.locale ?? "en";
  if (packKey === "development") return [];
  const preset = PACK_PRESETS[packKey] ?? PACK_PRESETS.development;
  const departmentById = new Map(departments.map((department) => [department.id, department]));
  const baseDeptOrder = ["planning", "dev", "design", "qa", "operations", "devsecops"].filter((deptId) =>
    departmentById.has(deptId),
  );
  if (baseDeptOrder.length === 0) return [];

  const nonLeaderCycle = (preset.staff?.nonLeaderDeptCycle ?? []).filter((deptId) => departmentById.has(deptId)) || [];
  const planningLeadDeptIds =
    (preset.staff?.planningLeadDeptIds ?? ["planning"]).filter((deptId) => departmentById.has(deptId)) || [];
  const workerCycle = nonLeaderCycle.length > 0 ? nonLeaderCycle : baseDeptOrder;
  const rolePool: AgentRole[] = ["senior", "junior", "intern"];
  const desiredCount = Math.max(baseDeptOrder.length + 2, params.targetCount ?? Math.min(10, baseDeptOrder.length * 2));

  const perDeptCounter = new Map<string, number>();
  const usedSpriteNumbers = new Set<number>();
  const result: OfficePackStarterAgentDraft[] = [];

  const resolveDeptPrefix = (deptId: string): Localized => {
    const presetInfo = preset.departments[deptId];
    if (presetInfo) return presetInfo.agentPrefix;
    const department = departmentById.get(deptId);
    const baseName = department?.name ?? deptId;
    const baseNameKo = department?.name_ko ?? baseName;
    const baseNameJa = department?.name_ja ?? baseName;
    const baseNameZh = department?.name_zh ?? baseName;
    return {
      ko: `${baseNameKo} 팀원`,
      en: `${baseName} Member`,
      ja: `${baseNameJa} メンバー`,
      zh: `${baseNameZh} 成员`,
    };
  };

  const resolveAvatar = (deptId: string, order: number): string => {
    const presetInfo = preset.departments[deptId];
    if (presetInfo && presetInfo.avatarPool.length > 0) {
      return presetInfo.avatarPool[(order - 1) % presetInfo.avatarPool.length] ?? presetInfo.icon;
    }
    return departmentById.get(deptId)?.icon ?? "🤖";
  };

  const pushAgent = (deptId: string, role: AgentRole) => {
    const nextOrder = (perDeptCounter.get(deptId) ?? 0) + 1;
    perDeptCounter.set(deptId, nextOrder);
    const prefix = resolveDeptPrefix(deptId);
    const department = departmentById.get(deptId);
    const localizedNames = localizedStaffDisplayName({
      packKey,
      deptId,
      order: nextOrder,
      fallbackPrefix: prefix,
    });
    const spriteNumber = resolveSeedSpriteNumber(
      {
        packKey,
        deptId,
        role,
        order: nextOrder,
      },
      usedSpriteNumbers,
    );
    usedSpriteNumbers.add(spriteNumber);
    result.push({
      ...localizedNames,
      department_id: deptId,
      seed_order_in_department: nextOrder,
      role,
      acts_as_planning_leader: role === "team_leader" && planningLeadDeptIds.includes(deptId) ? 1 : 0,
      avatar_emoji: resolveAvatar(deptId, nextOrder),
      sprite_number: spriteNumber,
      personality: buildSeedPersonality({
        packKey,
        deptId,
        role,
        locale,
        defaultPrefix: prefix,
        departmentName: {
          ko: department?.name_ko || department?.name || deptId,
          en: department?.name || department?.name_ko || deptId,
          ja: department?.name_ja || department?.name || deptId,
          zh: department?.name_zh || department?.name || deptId,
        },
      }),
    });
  };

  for (const deptId of baseDeptOrder) {
    pushAgent(deptId, "team_leader");
  }

  let cursor = 0;
  while (result.length < desiredCount) {
    const deptId = workerCycle[cursor % workerCycle.length];
    const role = rolePool[cursor % rolePool.length] ?? "junior";
    if (!deptId) break;
    pushAgent(deptId, role);
    cursor += 1;
  }

  return result;
}
