import type { GameBoardProps } from "./types";
import type { TicTacToeState } from "@/lib/games/ticTacToe";

const MARKS = ["X", "O"] as const;

export function TicTacToeBoard({ state, playerIds, myUserId, turnUserId, onPlay, busy }: GameBoardProps) {
  const board = ((state as TicTacToeState | null)?.board ?? Array.from({ length: 9 }, () => null)) as
    | (0 | 1 | null)[];
  const winningLine = (state as TicTacToeState | null)?.winningLine ?? null;

  const mySeat = myUserId ? playerIds.indexOf(myUserId) : -1;
  const myTurn = Boolean(myUserId) && turnUserId === myUserId;

  return (
    <div className="mx-auto grid w-full max-w-sm grid-cols-3 gap-2">
      {board.map((cell, index) => {
        const isWinning = winningLine?.includes(index) ?? false;
        const playable = myTurn && mySeat >= 0 && cell === null && !busy;

        return (
          <button
            key={index}
            type="button"
            disabled={!playable}
            onClick={() => onPlay({ index })}
            aria-label={`Square ${index + 1}`}
            className={`aspect-square rounded-md border text-4xl font-bold transition-all ${
              isWinning ? "border-primary bg-accent glow-ring" : "border-border bg-card"
            } ${playable ? "hover:border-primary hover:bg-accent" : ""} ${
              cell === 0 ? "text-[var(--mark-x)]" : cell === 1 ? "text-[var(--mark-o)]" : ""
            } disabled:cursor-default`}
          >
            {cell === null ? "" : MARKS[cell]}
          </button>
        );
      })}
    </div>
  );
}
