import fs from "node:fs/promises";
import path from "node:path";

import type { OpenClawConfig } from "../config/config.js";
import { resolveUserPath } from "../utils.js";
import { isSubagentSessionKey } from "../routing/session-key.js";
import { applyBootstrapHookOverrides } from "./bootstrap-hooks.js";
import {
  filterBootstrapFilesForSession,
  loadWorkspaceBootstrapFiles,
  DEFAULT_MEMORY_ALT_FILENAME,
  DEFAULT_MEMORY_FILENAME,
  DEFAULT_SOUL_FILENAME,
  type WorkspaceBootstrapFile,
} from "./workspace.js";
import { buildBootstrapContextFiles, resolveBootstrapMaxChars } from "./pi-embedded-helpers.js";
import type { EmbeddedContextFile } from "./pi-embedded-helpers.js";
import {
  resolveAgentDir,
  resolveAgentProfileMemoryPath,
  resolveAgentProfilePersonaId,
} from "./agent-scope.js";

export function makeBootstrapWarn(params: {
  sessionLabel: string;
  warn?: (message: string) => void;
}): ((message: string) => void) | undefined {
  if (!params.warn) return undefined;
  return (message: string) => params.warn?.(`${message} (sessionKey=${params.sessionLabel})`);
}

async function loadBootstrapFileFromPath(params: {
  name: WorkspaceBootstrapFile["name"];
  filePath: string;
}): Promise<WorkspaceBootstrapFile> {
  const resolvedPath = resolveUserPath(params.filePath);
  try {
    const content = await fs.readFile(resolvedPath, "utf-8");
    return {
      name: params.name,
      path: resolvedPath,
      content,
      missing: false,
    };
  } catch {
    return {
      name: params.name,
      path: resolvedPath,
      missing: true,
    };
  }
}

function shouldInjectProfileBootstrap(params: {
  sessionKey?: string;
  sessionId?: string;
  agentId?: string;
  config?: OpenClawConfig;
}): params is { sessionKey?: string; sessionId?: string; agentId: string; config: OpenClawConfig } {
  if (!params.agentId) return false;
  if (!params.config) return false;
  const label = params.sessionKey ?? params.sessionId;
  return !isSubagentSessionKey(label);
}

async function applyAgentProfileBootstrapOverrides(params: {
  files: WorkspaceBootstrapFile[];
  cfg: OpenClawConfig;
  agentId: string;
}): Promise<WorkspaceBootstrapFile[]> {
  const personaId = resolveAgentProfilePersonaId(params.cfg, params.agentId);
  const personaSoulPath = personaId
    ? String(params.cfg.catalog?.personas?.[personaId]?.soulPath ?? "").trim()
    : "";

  const hasPersona = Boolean(personaId && personaSoulPath);

  const explicitMemoryPath = resolveAgentProfileMemoryPath(params.cfg, params.agentId);
  const memoryPath =
    explicitMemoryPath ??
    path.join(resolveAgentDir(params.cfg, params.agentId), DEFAULT_MEMORY_FILENAME);
  const hasAgentMemory = Boolean(memoryPath && (hasPersona || explicitMemoryPath));

  if (!hasPersona && !hasAgentMemory) return params.files;

  const filtered = params.files.filter((file) => {
    if (hasPersona && file.name === DEFAULT_SOUL_FILENAME) return false;
    if (hasAgentMemory && (file.name === DEFAULT_MEMORY_FILENAME || file.name === DEFAULT_MEMORY_ALT_FILENAME)) return false;
    return true;
  });

  const injected: WorkspaceBootstrapFile[] = [];

  if (hasPersona) {
    injected.push(
      await loadBootstrapFileFromPath({
        name: DEFAULT_SOUL_FILENAME,
        filePath: personaSoulPath,
      }),
    );
  }

  if (hasAgentMemory) {
    injected.push(
      await loadBootstrapFileFromPath({
        name: DEFAULT_MEMORY_FILENAME,
        filePath: memoryPath,
      }),
    );
  }

  return [...injected, ...filtered];
}

export async function resolveBootstrapFilesForRun(params: {
  workspaceDir: string;
  config?: OpenClawConfig;
  sessionKey?: string;
  sessionId?: string;
  agentId?: string;
}): Promise<WorkspaceBootstrapFile[]> {
  const sessionKey = params.sessionKey ?? params.sessionId;
  let bootstrapFiles = filterBootstrapFilesForSession(
    await loadWorkspaceBootstrapFiles(params.workspaceDir),
    sessionKey,
  );

  if (shouldInjectProfileBootstrap(params)) {
    bootstrapFiles = await applyAgentProfileBootstrapOverrides({
      files: bootstrapFiles,
      cfg: params.config,
      agentId: params.agentId,
    });
  }

  return applyBootstrapHookOverrides({
    files: bootstrapFiles,
    workspaceDir: params.workspaceDir,
    config: params.config,
    sessionKey: params.sessionKey,
    sessionId: params.sessionId,
    agentId: params.agentId,
  });
}

export async function resolveBootstrapContextForRun(params: {
  workspaceDir: string;
  config?: OpenClawConfig;
  sessionKey?: string;
  sessionId?: string;
  agentId?: string;
  warn?: (message: string) => void;
}): Promise<{
  bootstrapFiles: WorkspaceBootstrapFile[];
  contextFiles: EmbeddedContextFile[];
}> {
  const bootstrapFiles = await resolveBootstrapFilesForRun(params);
  const contextFiles = buildBootstrapContextFiles(bootstrapFiles, {
    maxChars: resolveBootstrapMaxChars(params.config),
    warn: params.warn,
  });
  return { bootstrapFiles, contextFiles };
}
