#!/usr/bin/env node
/**
 * db:reset — AgentDesk DB 초기화 스크립트
 * 1. 포트 8790에서 실행 중인 서버를 자동 종료
 * 2. agentdesk.sqlite (및 WAL/SHM 파일) 삭제
 * 3. 다음 pnpm dev 실행 시 마이그레이션 자동 재실행
 */

import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { execSync } from "node:child_process";

const DB_PATH = process.env.DB_PATH ?? path.join(process.cwd(), "agentdesk.sqlite");
const targets = [DB_PATH, `${DB_PATH}-wal`, `${DB_PATH}-shm`];
const PORT = 8790;

async function killServer() {
  try {
    if (process.platform === "win32") {
      // Windows: netstat로 PID 찾고 taskkill
      const out = execSync(`netstat -ano | findstr ":${PORT}.*LISTENING"`, { encoding: "utf8", timeout: 5000 }).trim();
      const lines = out.split("\n").filter(Boolean);
      const pids = new Set();
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && pid !== "0") pids.add(pid);
      }
      for (const pid of pids) {
        try {
          execSync(`taskkill /F /PID ${pid}`, { timeout: 5000 });
          console.log(`  서버 프로세스 종료 (PID: ${pid})`);
        } catch { /* already dead */ }
      }
      if (pids.size > 0) {
        // 파일 잠금 해제 대기
        await new Promise((r) => setTimeout(r, 1500));
      }
    } else {
      // Unix: lsof로 PID 찾고 kill
      const out = execSync(`lsof -ti :${PORT}`, { encoding: "utf8", timeout: 5000 }).trim();
      if (out) {
        for (const pid of out.split("\n").filter(Boolean)) {
          try {
            execSync(`kill -9 ${pid}`, { timeout: 5000 });
            console.log(`  서버 프로세스 종료 (PID: ${pid})`);
          } catch { /* already dead */ }
        }
      }
    }
  } catch {
    // 서버가 실행 중이 아님 — 정상
  }
}

function deleteFiles() {
  let deleted = 0;
  for (const f of targets) {
    if (fs.existsSync(f)) {
      try {
        fs.rmSync(f, { force: true });
        console.log(`  deleted: ${f}`);
        deleted++;
      } catch (err) {
        console.error(`  삭제 실패: ${f} — ${err.message}`);
      }
    }
  }

  // prompts/agents/ 디렉토리 정리 (고아 페르소나 파일 제거)
  const agentsDir = path.join(process.cwd(), "prompts", "agents");
  if (fs.existsSync(agentsDir)) {
    try {
      const files = fs.readdirSync(agentsDir).filter((f) => f.endsWith(".md"));
      if (files.length > 0) {
        for (const f of files) {
          fs.rmSync(path.join(agentsDir, f), { force: true });
        }
        console.log(`  cleaned: prompts/agents/ (${files.length}개 페르소나 파일)`);
      }
    } catch (err) {
      console.error(`  prompts/agents 정리 실패: ${err.message}`);
    }
  }

  if (deleted === 0) {
    console.log("  DB 파일이 존재하지 않습니다 — 이미 초기화된 상태입니다.");
  } else {
    console.log(`\n✓ DB 초기화 완료 (${deleted}개 파일 삭제)`);
    console.log("  다음 pnpm dev 실행 시 마이그레이션이 자동으로 재실행됩니다.");
  }
}

async function run() {
  // --force 플래그가 있으면 확인 없이 즉시 실행
  if (process.argv.includes("--force") || process.argv.includes("-f")) {
    console.log("서버 종료 중...");
    await killServer();
    console.log("DB 초기화 중...");
    deleteFiles();
    process.exit(0);
  }

  // 대화형 확인
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log(`\n⚠️  AgentDesk DB를 초기화합니다.`);
  console.log(`   경로: ${DB_PATH}`);
  console.log("   실행 중인 서버를 자동 종료하고 모든 데이터를 삭제합니다.\n");
  rl.question("계속하시겠습니까? (y/N) ", async (answer) => {
    rl.close();
    if (answer.trim().toLowerCase() === "y") {
      console.log("\n서버 종료 중...");
      await killServer();
      deleteFiles();
    } else {
      console.log("취소되었습니다.");
    }
    process.exit(0);
  });
}

run();
