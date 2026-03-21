#!/usr/bin/env node
/**
 * db:reset — AgentDesk DB 초기화 스크립트
 * agentdesk.sqlite (및 WAL/SHM 파일) 삭제 후 서버 기동 시 마이그레이션이 자동 재실행됩니다.
 */

import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";

const DB_PATH = process.env.DB_PATH ?? path.join(process.cwd(), "agentdesk.sqlite");
const targets = [DB_PATH, `${DB_PATH}-wal`, `${DB_PATH}-shm`];

function deleteFiles() {
  let deleted = 0;
  for (const f of targets) {
    if (fs.existsSync(f)) {
      fs.rmSync(f, { force: true });
      console.log(`  deleted: ${f}`);
      deleted++;
    }
  }
  if (deleted === 0) {
    console.log("  DB 파일이 존재하지 않습니다 — 이미 초기화된 상태입니다.");
  } else {
    console.log(`\n✓ DB 초기화 완료 (${deleted}개 파일 삭제)`);
    console.log("  다음 pnpm dev 실행 시 마이그레이션이 자동으로 재실행됩니다.");
  }
}

// --force 플래그가 있으면 확인 없이 즉시 삭제
if (process.argv.includes("--force") || process.argv.includes("-f")) {
  console.log("DB 초기화 중...");
  deleteFiles();
  process.exit(0);
}

// 대화형 확인
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
console.log(`\n⚠️  AgentDesk DB를 초기화합니다.`);
console.log(`   경로: ${DB_PATH}`);
console.log("   모든 에이전트·태스크·설정 데이터가 삭제됩니다.\n");
rl.question("계속하시겠습니까? (y/N) ", (answer) => {
  rl.close();
  if (answer.trim().toLowerCase() === "y") {
    deleteFiles();
  } else {
    console.log("취소되었습니다.");
  }
  process.exit(0);
});
