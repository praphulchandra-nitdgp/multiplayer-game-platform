import type { GameModule } from "./types";

/** Seat index that owns each cell, or null when empty. */
export type TicTacToeState = { board: (0 | 1 | null)[]; winningLine: number[] | null };
export type TicTacToeMove = { index: number };

export const TIC_TAC_TOE_LINES: number[][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export const ticTacToe: GameModule<TicTacToeState, TicTacToeMove> = {
  slug: "tic-tac-toe",
  seats: 2,

  createInitialState() {
    return { board: Array.from({ length: 9 }, () => null), winningLine: null };
  },

  firstTurn(playerIds) {
    return playerIds[0]!;
  },

  parseMove(input) {
    const index = (input as { index?: unknown } | null)?.index;
    if (typeof index !== "number" || !Number.isInteger(index) || index < 0 || index > 8) {
      throw new Error("Invalid square.");
    }
    return { index };
  },

  applyMove({ state, playerIds, userId, move }) {
    const seat = playerIds.indexOf(userId);
    if (seat !== 0 && seat !== 1) throw new Error("You are not a player in this match.");

    const board = [...(state.board ?? [])] as (0 | 1 | null)[];
    if (board.length !== 9) throw new Error("Corrupt board state.");
    if (board[move.index] !== null) throw new Error("That square is already taken.");

    board[move.index] = seat as 0 | 1;

    const line = TIC_TAC_TOE_LINES.find(
      (l) =>
        board[l[0]!] !== null && board[l[0]!] === board[l[1]!] && board[l[1]!] === board[l[2]!],
    );

    if (line) {
      return {
        state: { board, winningLine: line },
        nextUserId: null,
        status: "finished",
        winnerId: userId,
        isDraw: false,
      };
    }

    if (board.every((cell) => cell !== null)) {
      return {
        state: { board, winningLine: null },
        nextUserId: null,
        status: "finished",
        winnerId: null,
        isDraw: true,
      };
    }

    return {
      state: { board, winningLine: null },
      nextUserId: playerIds[seat === 0 ? 1 : 0]!,
      status: "active",
      winnerId: null,
      isDraw: false,
    };
  },
};
