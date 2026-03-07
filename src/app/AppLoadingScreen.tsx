import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { I18nProvider } from "../i18n";

interface AppLoadingScreenProps {
  language: string;
  title: string;
  subtitle: string;
}

const BOOT_LINES = [
  { type: "title",   text: "AgentDesk" },
  { type: "divider", text: "━━━━━━━━━━━━━━━━━━━━━━━━━━━━" },
  { type: "cmd",     text: "Initializing agent runtime",  ok: true },
  { type: "cmd",     text: "Loading departments",         ok: true },
  { type: "cmd",     text: "Connecting to CLI",           ok: true },
  { type: "cmd",     text: "Starting office view",        ok: true },
  { type: "divider", text: "━━━━━━━━━━━━━━━━━━━━━━━━━━━━" },
  { type: "ready",   text: "Ready." },
];

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.13 } },
};

const lineVariants = {
  hidden: { opacity: 0, x: -10 },
  show:   { opacity: 1, x: 0, transition: { duration: 0.08, ease: "linear" as const } },
};

export default function AppLoadingScreen({ language, title, subtitle }: AppLoadingScreenProps) {
  const [showSubtitle, setShowSubtitle] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShowSubtitle(true), BOOT_LINES.length * 130 + 200);
    return () => clearTimeout(t);
  }, []);

  return (
    <I18nProvider language={language}>
      <div
        className="h-screen flex items-center justify-center"
        style={{ background: "#0c0c0c" }}
      >
        <div style={{ minWidth: 320 }}>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            {BOOT_LINES.map((line, i) => (
              <motion.div key={i} variants={lineVariants} className="boot-line">
                {line.type === "title" && (
                  <span className="boot-line-title">{line.text}</span>
                )}
                {line.type === "divider" && (
                  <span className="boot-line-divider">{line.text}</span>
                )}
                {line.type === "cmd" && (
                  <span>
                    <span className="boot-line-prompt">{">"} </span>
                    <span>{line.text}...</span>
                    {line.ok && (
                      <span className="boot-line-ok" style={{ marginLeft: 8 }}>[OK]</span>
                    )}
                  </span>
                )}
                {line.type === "ready" && (
                  <span className="boot-line-ready terminal-cursor">{line.text}</span>
                )}
              </motion.div>
            ))}
          </motion.div>

          <AnimatePresence>
            {showSubtitle && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.15, ease: "linear" }}
                className="boot-line"
                style={{ marginTop: 16, color: "var(--th-text-muted)", fontSize: "0.75rem" }}
              >
                {subtitle}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </I18nProvider>
  );
}
