import type { ComponentType } from "react";

import { TicTacToeBoard } from "./tic-tac-toe-board";
import type { GameBoardProps } from "./types";

/** Register the board UI for each game slug. */
const BOARDS: Record<string, ComponentType<GameBoardProps>> = {
  "tic-tac-toe": TicTacToeBoard,
};

export function getGameBoard(slug: string): ComponentType<GameBoardProps> | null {
  return BOARDS[slug] ?? null;
}

export type { GameBoardProps };
