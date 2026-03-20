import type { Migration } from "./types.ts";

export const VERSIONED_MIGRATIONS_B_PROJECT_TEMPLATES: Migration[] = [
  {
    id: "2026-03-16-003-project-templates",
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS project_templates (
          id          TEXT PRIMARY KEY,
          name        TEXT NOT NULL,
          description TEXT,
          category    TEXT NOT NULL DEFAULT 'general',
          default_pack_key TEXT NOT NULL DEFAULT 'development',
          core_goal_template TEXT NOT NULL DEFAULT '',
          is_builtin  INTEGER NOT NULL DEFAULT 0,
          created_at  INTEGER NOT NULL DEFAULT (unixepoch()*1000),
          updated_at  INTEGER NOT NULL DEFAULT (unixepoch()*1000)
        )
      `);
      db.exec(`
        CREATE TABLE IF NOT EXISTS project_template_objectives (
          id          TEXT PRIMARY KEY,
          template_id TEXT NOT NULL REFERENCES project_templates(id) ON DELETE CASCADE,
          title       TEXT NOT NULL,
          description TEXT,
          order_index INTEGER NOT NULL DEFAULT 0
        )
      `);
      db.exec(`
        CREATE TABLE IF NOT EXISTS project_template_gates (
          id          TEXT PRIMARY KEY,
          template_id TEXT NOT NULL REFERENCES project_templates(id) ON DELETE CASCADE,
          title       TEXT NOT NULL,
          description TEXT,
          gate_type   TEXT NOT NULL DEFAULT 'milestone',
          order_index INTEGER NOT NULL DEFAULT 0
        )
      `);
      // Seed built-in templates
      const templates: Array<{
        id: string; name: string; description: string; category: string;
        default_pack_key: string; core_goal_template: string;
        objectives: Array<{ title: string; description: string }>;
        gates: Array<{ title: string; description: string; gate_type: string }>;
      }> = [
        {
          id: "builtin-web-app",
          name: "Web Application",
          description: "Full-stack web app development",
          category: "development",
          default_pack_key: "development",
          core_goal_template: "Build and ship a production-ready web application with well-tested frontend and backend.",
          objectives: [
            { title: "Requirements & Architecture", description: "Define technical stack, system design, and API contracts" },
            { title: "Core Feature Implementation", description: "Implement all MVP features with unit tests" },
            { title: "QA & Performance", description: "End-to-end testing, load testing, and performance tuning" },
            { title: "Deployment & Monitoring", description: "CI/CD pipeline, production deployment, and alerting setup" },
          ],
          gates: [
            { title: "Design Review", description: "Architecture and UI/UX design approved", gate_type: "review" },
            { title: "MVP Complete", description: "All core features implemented and passing tests", gate_type: "milestone" },
            { title: "Security Audit", description: "OWASP checklist and dependency vulnerability scan passed", gate_type: "review" },
            { title: "Production Release", description: "Deployed to production with monitoring active", gate_type: "milestone" },
          ],
        },
        {
          id: "builtin-research-report",
          name: "Research Report",
          description: "Deep-dive research and structured report",
          category: "research",
          default_pack_key: "web_research_report",
          core_goal_template: "Produce a comprehensive research report with data-backed findings and actionable recommendations.",
          objectives: [
            { title: "Research Scope Definition", description: "Define questions, sources, and methodology" },
            { title: "Data Collection", description: "Gather data from authoritative sources" },
            { title: "Analysis & Synthesis", description: "Identify patterns, insights, and key findings" },
            { title: "Report Writing", description: "Structure findings into a clear, actionable report" },
          ],
          gates: [
            { title: "Scope Approved", description: "Research questions and methodology validated", gate_type: "review" },
            { title: "Data Collection Complete", description: "All primary sources gathered and verified", gate_type: "milestone" },
            { title: "Draft Review", description: "First draft reviewed and feedback incorporated", gate_type: "review" },
            { title: "Final Delivery", description: "Final report approved and delivered", gate_type: "milestone" },
          ],
        },
        {
          id: "builtin-video-production",
          name: "Video Production",
          description: "Video content creation pipeline",
          category: "media",
          default_pack_key: "video_preprod",
          core_goal_template: "Produce a polished video from concept to final delivery with clear narrative and high production quality.",
          objectives: [
            { title: "Concept & Script", description: "Develop concept, script, and storyboard" },
            { title: "Pre-production", description: "Gather assets, record voiceover, prepare visuals" },
            { title: "Production & Editing", description: "Assemble footage, edit, add effects and music" },
            { title: "Review & Export", description: "Review passes, color grade, export for distribution" },
          ],
          gates: [
            { title: "Script Approved", description: "Script and storyboard signed off", gate_type: "review" },
            { title: "Assets Ready", description: "All raw assets collected and organized", gate_type: "milestone" },
            { title: "Rough Cut Review", description: "First assembly reviewed", gate_type: "review" },
            { title: "Final Export", description: "Final version exported in all required formats", gate_type: "milestone" },
          ],
        },
        {
          id: "builtin-data-analysis",
          name: "Data Analysis",
          description: "Data exploration and insights project",
          category: "data",
          default_pack_key: "development",
          core_goal_template: "Analyze datasets to surface actionable insights and deliver clear visualizations and recommendations.",
          objectives: [
            { title: "Data Acquisition & Cleaning", description: "Collect, validate, and clean source datasets" },
            { title: "Exploratory Analysis", description: "Statistical profiling and pattern discovery" },
            { title: "Modeling & Insights", description: "Build models or dashboards to answer key questions" },
            { title: "Documentation & Handoff", description: "Document methodology and deliver reproducible results" },
          ],
          gates: [
            { title: "Data Quality Sign-off", description: "Source data validated and cleaned", gate_type: "review" },
            { title: "EDA Complete", description: "Exploratory analysis finished, hypotheses formed", gate_type: "milestone" },
            { title: "Insights Review", description: "Findings reviewed with stakeholders", gate_type: "review" },
            { title: "Delivery", description: "Final analysis and documentation delivered", gate_type: "milestone" },
          ],
        },
      ];

      const insertTemplate = db.prepare(
        "INSERT OR IGNORE INTO project_templates (id, name, description, category, default_pack_key, core_goal_template, is_builtin) VALUES (?, ?, ?, ?, ?, ?, 1)"
      );
      const insertObjective = db.prepare(
        "INSERT OR IGNORE INTO project_template_objectives (id, template_id, title, description, order_index) VALUES (?, ?, ?, ?, ?)"
      );
      const insertGate = db.prepare(
        "INSERT OR IGNORE INTO project_template_gates (id, template_id, title, description, gate_type, order_index) VALUES (?, ?, ?, ?, ?, ?)"
      );

      for (const tpl of templates) {
        insertTemplate.run(tpl.id, tpl.name, tpl.description, tpl.category, tpl.default_pack_key, tpl.core_goal_template);
        tpl.objectives.forEach((obj, i) => {
          insertObjective.run(`${tpl.id}-obj-${i}`, tpl.id, obj.title, obj.description, i);
        });
        tpl.gates.forEach((gate, i) => {
          insertGate.run(`${tpl.id}-gate-${i}`, tpl.id, gate.title, gate.description, gate.gate_type, i);
        });
      }
    },
  },
];
