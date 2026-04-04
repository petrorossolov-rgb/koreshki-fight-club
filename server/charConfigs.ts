import type { CharacterConfig } from "@shared/types.ts";

interface ManifestEntry {
  id: string;
  file: string;
}

const charConfigs = new Map<string, CharacterConfig>();

export async function loadAllConfigs(baseUrl: string | URL): Promise<void> {
  const manifestText = await Deno.readTextFile(
    new URL("../public/data/characters/manifest.json", baseUrl),
  );
  const manifest = JSON.parse(manifestText) as { characters: ManifestEntry[] };

  for (const entry of manifest.characters) {
    const configText = await Deno.readTextFile(
      new URL(`../public/${entry.file}`, baseUrl),
    );
    const config: CharacterConfig = JSON.parse(configText);
    charConfigs.set(entry.id, config);
  }

  console.log(`[server] loaded ${charConfigs.size} character configs: ${[...charConfigs.keys()].join(", ")}`);
}

export function getCharConfig(id: string): CharacterConfig | undefined {
  return charConfigs.get(id);
}

export function getDefaultConfig(): CharacterConfig {
  return charConfigs.values().next().value!;
}

export function getAllCharIds(): string[] {
  return [...charConfigs.keys()];
}
