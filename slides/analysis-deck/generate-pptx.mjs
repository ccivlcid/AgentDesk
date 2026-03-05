import PptxGenJS from "pptxgenjs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const html2pptx = require("../html2pptx.cjs");

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const pres = new PptxGenJS();
  pres.layout = "LAYOUT_16x9"; // 10" x 5.625" = 720pt x 405pt
  pres.author = "Document Design Team";
  pres.company = "AgentDesk";
  pres.subject = "AgentDesk Analysis Report";
  pres.title = "AgentDesk - Codebase Analysis & Architecture Review";

  const slides = [
    "slide-01.html", // Cover
    "slide-02.html", // Table of Contents
    "slide-03.html", // Executive Summary
    "slide-04.html", // Architecture Analysis
    "slide-05.html", // Department Structure
    "slide-06.html", // AI Provider Ecosystem
    "slide-07.html", // Core Features
    "slide-08.html", // Technology Stack
    "slide-09.html", // Security & Data Architecture
    "slide-10.html", // Quantitative Analysis
    "slide-11.html", // Risk Assessment & Roadmap
    "slide-12.html", // Closing
  ];

  for (const slideFile of slides) {
    const filePath = path.join(__dirname, slideFile);
    console.log(`Converting ${slideFile}...`);
    try {
      await html2pptx(filePath, pres);
      console.log(`  ✓ ${slideFile} done`);
    } catch (err) {
      console.error(`  ✗ ${slideFile} error: ${err.message}`);
    }
  }

  const outputPath = path.join(
    __dirname,
    "..",
    "..",
    "docs",
    "reports",
    "AgentDesk-Analysis-Report.pptx",
  );
  await pres.writeFile({ fileName: outputPath });
  console.log(`\nPPTX saved to: ${outputPath}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
