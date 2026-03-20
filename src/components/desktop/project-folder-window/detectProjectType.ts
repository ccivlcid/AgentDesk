import type { ProjectRunInfo } from "./types";

export function detectProjectType(rootFiles: Set<string>, pkgJson: Record<string, unknown> | null): ProjectRunInfo | null {
  const has = (f: string) => rootFiles.has(f);

  if (has("package.json")) {
    const scripts = (pkgJson?.scripts ?? {}) as Record<string, string>;
    const mgr = has("pnpm-lock.yaml") ? "pnpm" : has("yarn.lock") ? "yarn" : "npm";
    const devCmd = scripts["dev"] ? `${mgr} run dev` : scripts["start"] ? `${mgr} start` : null;
    return {
      type: "Node.js / JavaScript",
      icon: "⬡",
      color: "#f7df1e",
      sections: [
        {
          title: "의존성 설치",
          commands: [{ label: "install", cmd: `${mgr} install`, description: "node_modules 설치" }],
        },
        {
          title: "개발 서버 실행",
          commands: [
            ...(devCmd ? [{ label: "dev", cmd: devCmd, description: "개발 모드 (hot reload)" }] : []),
            ...(scripts["build"] ? [{ label: "build", cmd: `${mgr} run build`, description: "프로덕션 빌드" }] : []),
            ...(scripts["test"] ? [{ label: "test", cmd: `${mgr} test`, description: "테스트 실행" }] : []),
            ...(scripts["lint"] ? [{ label: "lint", cmd: `${mgr} run lint`, description: "코드 린트" }] : []),
          ],
        },
      ],
    };
  }

  if (has("pyproject.toml") || has("requirements.txt") || has("setup.py") || has("setup.cfg")) {
    const hasFastapi = has("main.py") || has("app.py");
    return {
      type: "Python",
      icon: "🐍",
      color: "#3572A5",
      sections: [
        {
          title: "환경 설정",
          commands: [
            { label: "venv 생성", cmd: "python -m venv venv", description: "가상환경 생성" },
            { label: "venv 활성화 (Win)", cmd: ".\\venv\\Scripts\\activate" },
            { label: "deps 설치", cmd: has("requirements.txt") ? "pip install -r requirements.txt" : "pip install -e .", description: "패키지 설치" },
          ],
        },
        {
          title: "실행",
          commands: [
            ...(has("main.py") ? [{ label: "main.py", cmd: "python main.py" }] : []),
            ...(has("app.py") ? [{ label: "app.py", cmd: "python app.py" }] : []),
            ...(hasFastapi ? [{ label: "FastAPI dev", cmd: "uvicorn main:app --reload", description: "FastAPI 개발 서버" }] : []),
            ...(has("manage.py") ? [{ label: "Django dev", cmd: "python manage.py runserver" }] : []),
          ],
        },
      ],
    };
  }

  if (has("Cargo.toml")) {
    return {
      type: "Rust",
      icon: "🦀",
      color: "#dea584",
      sections: [
        {
          title: "빌드 & 실행",
          commands: [
            { label: "run", cmd: "cargo run", description: "빌드 후 실행" },
            { label: "build", cmd: "cargo build --release", description: "릴리즈 빌드" },
            { label: "test", cmd: "cargo test" },
            { label: "check", cmd: "cargo check" },
          ],
        },
      ],
    };
  }

  if (has("go.mod")) {
    return {
      type: "Go",
      icon: "🐹",
      color: "#00ADD8",
      sections: [
        {
          title: "실행",
          commands: [
            { label: "run", cmd: "go run .", description: "현재 디렉토리 실행" },
            { label: "build", cmd: "go build -o app .", description: "바이너리 빌드" },
            { label: "test", cmd: "go test ./..." },
            { label: "mod tidy", cmd: "go mod tidy" },
          ],
        },
      ],
    };
  }

  if (has("docker-compose.yml") || has("docker-compose.yaml")) {
    return {
      type: "Docker Compose",
      icon: "🐳",
      color: "#2496ED",
      sections: [
        {
          title: "Docker Compose",
          commands: [
            { label: "up", cmd: "docker-compose up", description: "컨테이너 시작" },
            { label: "up -d", cmd: "docker-compose up -d", description: "백그라운드 실행" },
            { label: "down", cmd: "docker-compose down" },
            { label: "logs", cmd: "docker-compose logs -f" },
          ],
        },
      ],
    };
  }

  if (has("pom.xml")) {
    return {
      type: "Java (Maven)",
      icon: "☕",
      color: "#b07219",
      sections: [
        {
          title: "빌드 & 실행",
          commands: [
            { label: "compile", cmd: "mvn compile", description: "소스 컴파일" },
            { label: "package", cmd: "mvn package", description: "JAR/WAR 빌드" },
            { label: "spring-boot run", cmd: "mvn spring-boot:run", description: "Spring Boot 실행" },
            { label: "test", cmd: "mvn test" },
            { label: "clean install", cmd: "mvn clean install", description: "클린 빌드" },
          ],
        },
      ],
    };
  }

  if (has("build.gradle") || has("build.gradle.kts")) {
    const wrapper = has("gradlew");
    const g = wrapper ? ".\\gradlew" : "gradle";
    return {
      type: "Java (Gradle)",
      icon: "☕",
      color: "#b07219",
      sections: [
        {
          title: "빌드 & 실행",
          commands: [
            { label: "build", cmd: `${g} build`, description: "프로젝트 빌드" },
            { label: "bootRun", cmd: `${g} bootRun`, description: "Spring Boot 실행" },
            { label: "run", cmd: `${g} run`, description: "애플리케이션 실행" },
            { label: "test", cmd: `${g} test` },
            { label: "clean", cmd: `${g} clean` },
          ],
        },
      ],
    };
  }

  if (has("Makefile")) {
    return {
      type: "Make",
      icon: "⚙",
      color: "#6e7681",
      sections: [
        {
          title: "Make",
          commands: [
            { label: "make", cmd: "make", description: "기본 타겟 실행" },
            { label: "make build", cmd: "make build" },
            { label: "make test", cmd: "make test" },
            { label: "make clean", cmd: "make clean" },
          ],
        },
      ],
    };
  }

  return null;
}
