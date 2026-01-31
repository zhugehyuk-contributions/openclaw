import { describe, expect, it } from "vitest";

import type { OpenClawConfig } from "../../config/config.js";
import { createModelSelectionState } from "./model-selection.js";

describe("createModelSelectionState preset thinking", () => {
  it("uses modelPreset.thinking when the selected model matches the preset", async () => {
    const cfg: OpenClawConfig = {
      catalog: {
        modelPresets: {
          gpt: { model: "openai/gpt-4o", thinking: "xhigh" },
        },
      },
      agents: {
        list: [{ id: "oracle", profile: { modelPreset: "gpt" } }],
      },
    } as OpenClawConfig;

    const state = await createModelSelectionState({
      cfg,
      agentId: "oracle",
      agentCfg: cfg.agents?.defaults,
      defaultProvider: "openai",
      defaultModel: "gpt-4o",
      provider: "openai",
      model: "gpt-4o",
      hasModelDirective: false,
    });

    await expect(state.resolveDefaultThinkingLevel()).resolves.toBe("xhigh");
  });
});
