import type { Logger } from "../../src/logger";

/** Double de test pour `Logger` (Pino) — aucune sortie réelle, aucune I/O. */
export function fakeLogger(): Logger {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  } as unknown as Logger;
}
