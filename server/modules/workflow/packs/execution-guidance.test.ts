import { describe, expect, it } from "vitest";
import { buildWorkflowPackExecutionGuidance } from "./execution-guidance.ts";

describe("buildWorkflowPackExecutionGuidance", () => {
  it("video_preprod 한국어: Remotion 렌더링 규칙과 아티팩트 경로를 포함한다", () => {
    const guidance = buildWorkflowPackExecutionGuidance("video_preprod", "ko", {
      videoArtifactRelativePath: "video_output/VID_기획팀_final.mp4",
    });
    expect(guidance).toContain("video_output/VID_기획팀_final.mp4");
    expect(guidance).toContain("실행 순서");
    expect(guidance).toContain("remotion render");
    expect(guidance).toContain("pnpm exec remotion browser ensure");
    expect(guidance).toContain("고품질 연출 지침");
    expect(guidance).toContain("8~12개 이상 샷");
  });

  it("video_preprod 영어: Remotion rendering rules and artifact path", () => {
    const guidance = buildWorkflowPackExecutionGuidance("video_preprod", "en", {
      videoArtifactRelativePath: "video_output/VID_final.mp4",
    });
    expect(guidance).toContain("video_output/VID_final.mp4");
    expect(guidance).toContain("Execution Order");
    expect(guidance).toContain("remotion render");
    expect(guidance).toContain("High Quality Direction");
    expect(guidance).toContain("8-12 shots");
  });

  it("각 팩은 실행 모드·QA 요건·출력 형식을 포함한다", () => {
    const packs = ["development", "novel", "report", "web_research_report", "roleplay", "asset_management"] as const;
    for (const pack of packs) {
      const guidance = buildWorkflowPackExecutionGuidance(pack, "ko");
      expect(guidance.length, `${pack} should return non-empty guidance`).toBeGreaterThan(50);
      expect(guidance).toContain("QA");
      expect(guidance).toContain("출력 형식");
    }
  });

  it("언어 정보가 없으면 영어로 폴백한다", () => {
    const guidance = buildWorkflowPackExecutionGuidance("video_preprod", null);
    expect(guidance).toContain("Execution Order");
    expect(guidance).toContain("Remotion");
  });

  it("{{ARTIFACT_PATH}} 템플릿 변수가 실제 경로로 치환된다", () => {
    const path = "my_project/dept_final.mp4";
    const guidance = buildWorkflowPackExecutionGuidance("video_preprod", "en", {
      videoArtifactRelativePath: path,
    });
    expect(guidance).toContain(path);
    expect(guidance).not.toContain("{{ARTIFACT_PATH}}");
  });

  it("아티팩트 경로가 없으면 기본값을 사용한다", () => {
    const guidance = buildWorkflowPackExecutionGuidance("video_preprod", "en", {});
    expect(guidance).toContain("video_output/final.mp4");
  });

  it("알 수 없는 팩 키는 development 팩으로 폴백한다", () => {
    const guidance = buildWorkflowPackExecutionGuidance("unknown_pack", "en");
    expect(guidance).toContain("Engineering");
  });
});
