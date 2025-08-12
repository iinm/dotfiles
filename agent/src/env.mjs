import path from "node:path";
import { fileURLToPath } from "node:url";

const filename = fileURLToPath(import.meta.url);
export const AGENT_ROOT = path.dirname(path.dirname(filename));

export const AGENT_CACHE_DIR = path.join(AGENT_ROOT, ".cache");
export const TRUSTED_CONFIG_HASHES_DIR = path.join(
  AGENT_CACHE_DIR,
  "trusted-config-hashes",
);

export const AGENT_PROJECT_METADATA_DIR =
  process.env.AGENT_PROJECT_METADATA_DIR || ".agent";

export const AGENT_MODEL = process.env.AGENT_MODEL || "";

export const AGENT_NOTIFY_CMD_DEFAULT = path.join(
  AGENT_ROOT,
  "bin",
  "agent-notify",
);

export const USER_NAME = process.env.USER || "unknown";
