import { registerRoot, Composition } from "remotion";
import { AgentDeskVideo, TOTAL_FRAMES } from "./AgentDeskVideo";
import React from "react";

const FPS = 30;

function Root() {
  return (
    <>
      <Composition
        id="AgentDesk"
        component={AgentDeskVideo}
        durationInFrames={TOTAL_FRAMES}
        fps={FPS}
        width={1920}
        height={1080}
      />
    </>
  );
}

registerRoot(Root);
