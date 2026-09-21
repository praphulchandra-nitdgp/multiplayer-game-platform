import { ticTacToe } from "./ticTacToe";
import type { GameModule } from "./types";

/**
 * Register new game modules here. Nothing else in the platform needs to know
 * which games exist.
 */
const MODULES: GameModule<never, never>[] = [ticTacToe as unknown as GameModule<never, never>];

const BY_SLUG = new Map(MODULES.map((m) => [m.slug, m]));

export function getGameModule(slug: string): GameModule {
  const mod = BY_SLUG.get(slug);
  if (!mod) throw new Error(`No game module registered for "${slug}".`);
  return mod as unknown as GameModule;
}

export function hasGameModule(slug: string): boolean {
  return BY_SLUG.has(slug);
}
