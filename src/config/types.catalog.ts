import type { AgentDefaultsConfig } from "./types.agent-defaults.js";

export type ModelPresetConfig = {
  /** Primary model (provider/model). */
  model: string;
  /** Optional default thinking level for this preset. */
  thinking?: NonNullable<AgentDefaultsConfig["thinkingDefault"]>;
};

export type PersonaConfig = {
  /** Absolute or ~-expanded path to a persona SOUL.md file. */
  soulPath: string;
};

export type CatalogConfig = {
  modelPresets?: Record<string, ModelPresetConfig>;
  personas?: Record<string, PersonaConfig>;
};
