import { useEffect, useState } from "react";
import * as api from "../../api";
import type { TFunction } from "./types";

export default function GitHubOAuthAppConfig({ t }: { t: TFunction }) {
  const [ghClientId, setGhClientId] = useState("");
  const [ghClientIdSaved, setGhClientIdSaved] = useState(false);
  const [ghClientIdLoaded, setGhClientIdLoaded] = useState(false);

  useEffect(() => {
    api
      .getSettingsRaw()
      .then((settings) => {
        const val = settings?.github_oauth_client_id;
        if (val) setGhClientId(String(val).replace(/^"|"$/g, ""));
        setGhClientIdLoaded(true);
      })
      .catch(() => setGhClientIdLoaded(true));
  }, []);

  const saveClientId = () => {
    const val = ghClientId.trim();
    api
      .saveSettingsPatch({ github_oauth_client_id: val || null })
      .then(() => {
        setGhClientIdSaved(true);
        setTimeout(() => setGhClientIdSaved(false), 2000);
      })
      .catch(() => {});
  };

  return (
    <div className="space-y-2 p-4" style={{ borderRadius: "4px", border: "1px solid var(--th-border)", background: "var(--th-bg-surface)" }}>
      <div className="flex items-center gap-2">
        <h4 className="text-xs font-semibold font-mono uppercase tracking-wider" style={{ color: "var(--th-text-muted)" }}>
          {t({
            ko: "GitHub OAuth App (Private 리포 접근)",
            en: "GitHub OAuth App (Private repo access)",
            ja: "GitHub OAuth App（プライベートリポアクセス）",
            zh: "GitHub OAuth App（私有仓库访问）",
          })}
        </h4>
        {ghClientIdSaved && (
          <span className="text-[10px] font-mono" style={{ color: "rgb(167,243,208)" }}>
            {t({ ko: "저장됨", en: "Saved", ja: "保存済み", zh: "已保存" })}
          </span>
        )}
      </div>
      <p className="text-[11px] font-mono leading-relaxed" style={{ color: "var(--th-text-muted)" }}>
        {t({
          ko: "기본 GitHub 연결은 Copilot OAuth를 사용하여 Private 리포 접근이 제한됩니다. 자체 OAuth App을 등록하면 모든 리포에 접근 가능합니다.",
          en: "Default GitHub uses Copilot OAuth which limits private repo access. Register your own OAuth App for full access.",
          ja: "デフォルトの GitHub 接続は Copilot OAuth を使用し、プライベートリポへのアクセスが制限されます。自前の OAuth App を登録すると全リポにアクセスできます。",
          zh: "默认 GitHub 使用 Copilot OAuth，限制私有仓库访问。注册自己的 OAuth App 可获取完整访问权限。",
        })}
      </p>
      <details className="text-[11px] font-mono" style={{ color: "var(--th-text-muted)" }}>
        <summary className="cursor-pointer font-mono" style={{ color: "var(--th-accent)" }}>
          {t({
            ko: "OAuth App 만들기 가이드",
            en: "How to create OAuth App",
            ja: "OAuth App 作成ガイド",
            zh: "如何创建 OAuth App",
          })}
        </summary>
        <ol className="mt-2 ml-4 list-decimal space-y-1 font-mono" style={{ color: "var(--th-text-secondary)" }}>
          <li>GitHub → Settings → Developer settings → OAuth Apps → New OAuth App</li>
          <li>
            {t({
              ko: "Application name: 아무 이름 (예: My Climpire)",
              en: "Application name: any name (e.g. My Climpire)",
              ja: "Application name: 任意の名前（例: My Climpire）",
              zh: "Application name: 任意名称（如 My Climpire）",
            })}
          </li>
          <li>Homepage URL: http://localhost:8800</li>
          <li>Callback URL: http://localhost:8800/oauth/callback</li>
          <li>
            {t({
              ko: "☑ Enable Device Flow 체크",
              en: "☑ Check 'Enable Device Flow'",
              ja: "☑ Enable Device Flow にチェック",
              zh: "☑ 勾选 Enable Device Flow",
            })}
          </li>
          <li>
            {t({
              ko: "Register → Client ID를 아래에 붙여넣기",
              en: "Register → Paste Client ID below",
              ja: "Register → Client ID を下に貼り付け",
              zh: "Register → 将 Client ID 粘贴到下方",
            })}
          </li>
        </ol>
      </details>
      {ghClientIdLoaded && (
        <div className="flex gap-2 items-center">
          <input
            type="text"
            placeholder="Iv23li..."
            value={ghClientId}
            onChange={(e) => setGhClientId(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveClientId();
            }}
            className="flex-1 px-3 py-1.5 text-xs font-mono outline-none" style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-input-bg)", color: "var(--th-text-primary)" }}
          />
          <button
            onClick={saveClientId}
            className="shrink-0 px-3 py-1.5 text-[11px] font-mono font-medium transition" style={{ borderRadius: "2px", background: "var(--th-accent)", color: "#000" }}
          >
            {t({ ko: "저장", en: "Save", ja: "保存", zh: "保存" })}
          </button>
        </div>
      )}
      {ghClientId.trim() && (
        <p className="text-[10px] text-amber-400">
          {t({
            ko: "저장 후 GitHub 계정을 재연결하세요 (위의 '연결하기' 또는 '계정 추가' 버튼).",
            en: "After saving, reconnect your GitHub account using the 'Connect' or 'Add Account' button above.",
            ja: "保存後、上の「接続」または「アカウント追加」ボタンで GitHub アカウントを再接続してください。",
            zh: "保存后，使用上方的'连接'或'添加账号'按钮重新连接 GitHub 账号。",
          })}
        </p>
      )}
    </div>
  );
}
