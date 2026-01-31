import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import type { OpenClawConfig } from "../config/config.js";
import { makeTempWorkspace, writeWorkspaceFile } from "../test-helpers/workspace.js";
import { resolveBootstrapContextForRun } from "./bootstrap-files.js";

describe("bootstrap files agent profile injection", () => {
  it("injects persona SOUL + agent MEMORY and replaces workspace SOUL/MEMORY", async () => {
    const workspaceDir = await makeTempWorkspace("openclaw-bootstrap-profile-");

    await writeWorkspaceFile({ dir: workspaceDir, name: "SOUL.md", content: "workspace soul" });
    await writeWorkspaceFile({ dir: workspaceDir, name: "MEMORY.md", content: "workspace memory" });

    const personaDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-persona-"));
    const personaSoulPath = path.join(personaDir, "SOUL.md");
    await fs.writeFile(personaSoulPath, "persona soul", "utf-8");

    const agentDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-agentdir-"));
    const agentMemoryPath = path.join(agentDir, "MEMORY.md");
    await fs.writeFile(agentMemoryPath, "agent memory", "utf-8");

    const cfg: OpenClawConfig = {
      catalog: {
        personas: {
          persona_oracle: { soulPath: personaSoulPath },
        },
      },
      agents: {
        list: [
          {
            id: "oracle",
            agentDir,
            profile: { persona: "persona_oracle" },
          },
        ],
      },
    } as OpenClawConfig;

    const result = await resolveBootstrapContextForRun({
      workspaceDir,
      config: cfg,
      agentId: "oracle",
    });

    const soul = result.contextFiles[0];
    const memory = result.contextFiles[1];

    expect(soul?.path).toBe("SOUL.md");
    expect(soul?.content).toContain("persona soul");

    expect(memory?.path).toBe("MEMORY.md");
    expect(memory?.content).toContain("agent memory");

    const soulFile = result.bootstrapFiles.find((f) => f.name === "SOUL.md");
    expect(soulFile?.path).toBe(personaSoulPath);

    const memoryFiles = result.bootstrapFiles.filter((f) => f.name === "MEMORY.md");
    expect(memoryFiles).toHaveLength(1);
    expect(memoryFiles[0]?.path).toBe(agentMemoryPath);
  });
});
