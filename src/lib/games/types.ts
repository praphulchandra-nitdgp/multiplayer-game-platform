/**
 * Generic game-module contract.
 *
 * Adding a new game to GameHub means two things and nothing else:
 *   1. a row in the `games` table (the Game Definition), and
 *   2. a GameModule registered in `src/lib/games/registry.ts`.
 *
 * The lobby, rooms, live match loop, chat and leaderboard are game-agnostic and
 * never need to change.
 */

export type MatchStatus = "active" | "finished";

export interface MoveResult<TState> {
  state: TState;
  /** Whose turn it is next; null when the match is over. */
  nextUserId: string | null;
  status: MatchStatus;
  winnerId: string | null;
  isDraw: boolean;
}

export interface GameModule<TState = unknown, TMove = unknown> {
  slug: string;
  seats: number;
  /** Fresh state for a match; `playerIds` is ordered by seat. */
  createInitialState(playerIds: string[]): TState;
  /** Who moves first. */
  firstTurn(playerIds: string[]): string;
  /** Narrow untrusted client input; throw on anything invalid. */
  parseMove(input: unknown): TMove;
  /** Validate and apply a move. Throw with a readable message when illegal. */
  applyMove(args: {
    state: TState;
    playerIds: string[];
    userId: string;
    move: TMove;
  }): MoveResult<TState>;
}
