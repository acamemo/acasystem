import { readFileSync } from "node:fs";
import { PACKAGE_JSON_PATH } from "./paths.ts";
import { readProperty } from "../helpers/objects.ts";

/**
 * Versione dell'applicativo esposta da /api/health e mostrata in Sistema (REP-20261012-004):
 * `ACASYSTEM_VERSION` dal file .env del compose (progetto/.env), altrimenti quella di
 * `backend/package.json`; 'unknown' se illeggibile.
 */
export const resolveAppVersion = (
  packageJsonPath: string = PACKAGE_JSON_PATH,
  env: NodeJS.ProcessEnv = process.env,
): string => {
  const release = env.ACASYSTEM_VERSION?.trim();
  if (release) return release;
  try {
    const pkg: unknown = JSON.parse(readFileSync(packageJsonPath, "utf8"));
    const version = readProperty(pkg, "version");
    return typeof version === "string" && version ? version : "unknown";
  } catch {
    return "unknown";
  }
};
