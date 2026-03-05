import path from "node:path";

const PPT_KEYWORDS = /ppt|pptx|powerpoint|프레젠테이션|발표\s*자료|슬라이드\s*제작|slide\s*deck|presentation/i;
const EXCEL_KEYWORDS = /xlsx|excel|스프레드시트|spreadsheet|엑셀|통계\s*표|데이터\s*표|시트\s*작성/i;
const PDF_KEYWORDS = /pdf\s*(파일|생성|출력|변환|만들|작성|export|generat|creat|convert|output)/i;
const WORD_KEYWORDS = /docx|워드\s*(문서|파일)|word\s*(doc|file)|한글\s*문서/i;

/**
 * Detects whether a task involves office document creation and returns
 * conversion pipeline guidance for the agent.
 */
export function buildPptExecutionGuidance(
  taskTitle: string,
  taskDescription: string | null,
  lang: string,
): string {
  const haystack = `${taskTitle} ${taskDescription ?? ""}`;
  const blocks: string[] = [];

  if (PPT_KEYWORDS.test(haystack)) blocks.push(buildPptBlock(lang));
  if (EXCEL_KEYWORDS.test(haystack)) blocks.push(buildExcelBlock(lang));
  if (PDF_KEYWORDS.test(haystack)) blocks.push(buildPdfBlock(lang));
  if (WORD_KEYWORDS.test(haystack)) blocks.push(buildWordBlock(lang));

  return blocks.join("\n\n");
}

// ── PPT ──

function buildPptBlock(lang: string): string {
  const converterPath = path.resolve(process.cwd(), "slides", "html2pptx.cjs")
    .replace(/\\/g, "/");
  const templatePath = path.resolve(process.cwd(), "slides", "generate-pptx.mjs")
    .replace(/\\/g, "/");

  if (lang.startsWith("ko")) {
    return [
      "[PPT 생성 파이프라인 - 필수]",
      "HTML 슬라이드만 만들면 미완성입니다. 반드시 .pptx 파일까지 생성하세요.",
      "",
      "1단계: HTML 슬라이드 작성",
      "  - 슬라이드별 개별 HTML 파일 생성 (slide-01.html, slide-02.html, ...)",
      "  - body 크기를 반드시 16:9 비율로 설정: width: 960px; height: 540px;",
      "  - 텍스트는 <p>, <h1>-<h6>, <ul>, <ol> 태그로 감싸세요 (div 안의 텍스트 직접 배치 금지)",
      "  - CSS gradient는 지원되지 않음 → PNG 이미지로 대체",
      "  - 한글은 Pretendard 또는 Noto Sans KR 폰트 사용",
      "",
      "2단계: .pptx 변환 스크립트 작성",
      `  - 변환기 경로: ${converterPath}`,
      `  - 참고 템플릿: ${templatePath}`,
      "  - 프로젝트에 generate-pptx.mjs를 만들어 아래 패턴으로 작성:",
      "    ```",
      '    import PptxGenJS from "pptxgenjs";',
      '    import { createRequire } from "module";',
      "    const require = createRequire(import.meta.url);",
      `    const html2pptx = require("${converterPath}");`,
      "    const pres = new PptxGenJS();",
      '    pres.layout = "LAYOUT_16x9";',
      '    for (const f of ["slide-01.html", ...]) {',
      "      await html2pptx(f, pres);",
      "    }",
      '    await pres.writeFile({ fileName: "output.pptx" });',
      "    ```",
      "",
      "3단계: 실행 및 검증",
      "  - pptxgenjs가 없으면 설치: pnpm add -D pptxgenjs",
      "  - 스크립트 실행: node generate-pptx.mjs",
      "  - 변환 에러 발생 시 HTML을 수정하고 재실행",
      "  - 최종 .pptx 파일 존재 여부와 파일 크기를 확인하세요",
    ].join("\n");
  }

  return [
    "[PPT Generation Pipeline - Required]",
    "Creating HTML slides alone is NOT complete. You MUST produce a .pptx file.",
    "",
    "Step 1: Create HTML slides",
    "  - Create individual HTML files per slide (slide-01.html, slide-02.html, ...)",
    "  - Body dimensions MUST be 16:9: width: 960px; height: 540px;",
    "  - Wrap text in <p>, <h1>-<h6>, <ul>, <ol> tags (no bare text inside divs)",
    "  - CSS gradients are not supported — use PNG images instead",
    "",
    "Step 2: Write .pptx conversion script",
    `  - Converter path: ${converterPath}`,
    `  - Reference template: ${templatePath}`,
    "  - Create a generate-pptx.mjs in the project following this pattern:",
    "    ```",
    '    import PptxGenJS from "pptxgenjs";',
    '    import { createRequire } from "module";',
    "    const require = createRequire(import.meta.url);",
    `    const html2pptx = require("${converterPath}");`,
    "    const pres = new PptxGenJS();",
    '    pres.layout = "LAYOUT_16x9";',
    '    for (const f of ["slide-01.html", ...]) {',
    "      await html2pptx(f, pres);",
    "    }",
    '    await pres.writeFile({ fileName: "output.pptx" });',
    "    ```",
    "",
    "Step 3: Execute and verify",
    "  - Install pptxgenjs if missing: pnpm add -D pptxgenjs",
    "  - Run the script: node generate-pptx.mjs",
    "  - If conversion errors occur, fix the HTML and re-run",
    "  - Verify the final .pptx file exists and has non-zero size",
  ].join("\n");
}

// ── Excel ──

function buildExcelBlock(lang: string): string {
  if (lang.startsWith("ko")) {
    return [
      "[Excel 생성 파이프라인 - 필수]",
      "JSON/CSV 데이터만 만들면 미완성입니다. 반드시 .xlsx 파일까지 생성하세요.",
      "",
      "방법: ExcelJS 패키지 사용",
      "  - 설치: pnpm add -D exceljs",
      "  - 스크립트 예시 (generate-xlsx.mjs):",
      "    ```",
      '    import ExcelJS from "exceljs";',
      "    const wb = new ExcelJS.Workbook();",
      '    const ws = wb.addWorksheet("Sheet1");',
      '    ws.columns = [{ header: "이름", key: "name" }, { header: "값", key: "value" }];',
      '    ws.addRow({ name: "항목1", value: 100 });',
      "    // 스타일링: ws.getRow(1).font = { bold: true };",
      "    // 열 너비: ws.getColumn('name').width = 20;",
      '    await wb.xlsx.writeFile("output.xlsx");',
      "    ```",
      "  - 실행: node generate-xlsx.mjs",
      "  - 차트가 필요하면 ExcelJS의 chart API 또는 별도 이미지 삽입 활용",
      "  - 최종 .xlsx 파일 존재 여부와 파일 크기를 확인하세요",
    ].join("\n");
  }

  return [
    "[Excel Generation Pipeline - Required]",
    "Creating JSON/CSV data alone is NOT complete. You MUST produce a .xlsx file.",
    "",
    "Method: Use ExcelJS package",
    "  - Install: pnpm add -D exceljs",
    "  - Example script (generate-xlsx.mjs):",
    "    ```",
    '    import ExcelJS from "exceljs";',
    "    const wb = new ExcelJS.Workbook();",
    '    const ws = wb.addWorksheet("Sheet1");',
    '    ws.columns = [{ header: "Name", key: "name" }, { header: "Value", key: "value" }];',
    '    ws.addRow({ name: "Item1", value: 100 });',
    "    // Styling: ws.getRow(1).font = { bold: true };",
    "    // Column width: ws.getColumn('name').width = 20;",
    '    await wb.xlsx.writeFile("output.xlsx");',
    "    ```",
    "  - Run: node generate-xlsx.mjs",
    "  - For charts, use ExcelJS chart API or embed images",
    "  - Verify the final .xlsx file exists and has non-zero size",
  ].join("\n");
}

// ── PDF ──

function buildPdfBlock(lang: string): string {
  if (lang.startsWith("ko")) {
    return [
      "[PDF 생성 파이프라인 - 필수]",
      "마크다운/HTML만 만들면 미완성입니다. 반드시 .pdf 파일까지 생성하세요.",
      "",
      "방법 A (추천): Playwright로 HTML → PDF 변환",
      "  - 스크립트 예시 (generate-pdf.mjs):",
      "    ```",
      '    import { chromium } from "playwright";',
      "    const browser = await chromium.launch();",
      "    const page = await browser.newPage();",
      '    await page.goto("file://" + process.cwd() + "/report.html");',
      '    await page.pdf({ path: "output.pdf", format: "A4",',
      "      margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' } });",
      "    await browser.close();",
      "    ```",
      "",
      "방법 B: PDFKit 사용 (프로그래밍 방식)",
      "  - 설치: pnpm add -D pdfkit",
      "  - PDFKit은 한글 폰트(.ttf)를 등록해야 한글이 깨지지 않음",
      "",
      "- 최종 .pdf 파일 존재 여부와 파일 크기를 확인하세요",
    ].join("\n");
  }

  return [
    "[PDF Generation Pipeline - Required]",
    "Creating markdown/HTML alone is NOT complete. You MUST produce a .pdf file.",
    "",
    "Method A (Recommended): HTML → PDF via Playwright",
    "  - Example script (generate-pdf.mjs):",
    "    ```",
    '    import { chromium } from "playwright";',
    "    const browser = await chromium.launch();",
    "    const page = await browser.newPage();",
    '    await page.goto("file://" + process.cwd() + "/report.html");',
    '    await page.pdf({ path: "output.pdf", format: "A4",',
    "      margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' } });",
    "    await browser.close();",
    "    ```",
    "",
    "Method B: Use PDFKit (programmatic)",
    "  - Install: pnpm add -D pdfkit",
    "  - PDFKit requires font registration (.ttf) for non-Latin text",
    "",
    "- Verify the final .pdf file exists and has non-zero size",
  ].join("\n");
}

// ── Word ──

function buildWordBlock(lang: string): string {
  if (lang.startsWith("ko")) {
    return [
      "[Word 문서 생성 파이프라인 - 필수]",
      "마크다운/텍스트만 만들면 미완성입니다. 반드시 .docx 파일까지 생성하세요.",
      "",
      "방법: docx 패키지 사용",
      "  - 설치: pnpm add -D docx",
      "  - 스크립트 예시 (generate-docx.mjs):",
      "    ```",
      '    import { Document, Paragraph, TextRun, Packer } from "docx";',
      '    import fs from "fs";',
      "    const doc = new Document({",
      "      sections: [{ children: [",
      '        new Paragraph({ children: [new TextRun({ text: "제목", bold: true, size: 32 })] }),',
      '        new Paragraph({ children: [new TextRun("본문 내용...")] }),',
      "      ]}],",
      "    });",
      "    const buffer = await Packer.toBuffer(doc);",
      '    fs.writeFileSync("output.docx", buffer);',
      "    ```",
      "  - 실행: node generate-docx.mjs",
      "  - 최종 .docx 파일 존재 여부와 파일 크기를 확인하세요",
    ].join("\n");
  }

  return [
    "[Word Document Generation Pipeline - Required]",
    "Creating markdown/text alone is NOT complete. You MUST produce a .docx file.",
    "",
    "Method: Use the docx package",
    "  - Install: pnpm add -D docx",
    "  - Example script (generate-docx.mjs):",
    "    ```",
    '    import { Document, Paragraph, TextRun, Packer } from "docx";',
    '    import fs from "fs";',
    "    const doc = new Document({",
    "      sections: [{ children: [",
    '        new Paragraph({ children: [new TextRun({ text: "Title", bold: true, size: 32 })] }),',
    '        new Paragraph({ children: [new TextRun("Body text...")] }),',
    "      ]}],",
    "    });",
    "    const buffer = await Packer.toBuffer(doc);",
    '    fs.writeFileSync("output.docx", buffer);',
    "    ```",
    "  - Run: node generate-docx.mjs",
    "  - Verify the final .docx file exists and has non-zero size",
  ].join("\n");
}
