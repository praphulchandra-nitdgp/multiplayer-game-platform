import { motion, AnimatePresence } from "framer-motion";
import type { GameBoardProps } from "./types";
import type { TicTacToeState } from "@/lib/games/ticTacToe";

const MARKS = ["X", "O"] as const;

export function TicTacToeBoard({
  state,
  playerIds,
  myUserId,
  turnUserId,
  onPlay,
  busy,
}: GameBoardProps) {
  const board = ((state as TicTacToeState | null)?.board ??
    Array.from({ length: 9 }, () => null)) as (0 | 1 | null)[];
  const winningLine = (state as TicTacToeState | null)?.winningLine ?? null;

  const mySeat = myUserId ? playerIds.indexOf(myUserId) : -1;
  const myTurn = Boolean(myUserId) && turnUserId === myUserId;

  return (
    <div className="mx-auto w-full max-w-sm relative p-4 rounded-3xl bg-surface backdrop-blur-xl border border-border/30 shadow-panel">
      {/* Decorative background glow for the board itself */}
      <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-mark-o/5 rounded-3xl pointer-events-none" />

      <div className="grid grid-cols-3 gap-3 relative z-10">
        {board.map((cell, index) => {
          const isWinning = winningLine?.includes(index) ?? false;
          const playable = myTurn && mySeat >= 0 && cell === null && !busy;

          return (
            <motion.button
              key={index}
              type="button"
              disabled={!playable && cell === null}
              onClick={() => onPlay({ index })}
              aria-label={`Square ${index + 1}`}
              whileHover={playable ? { scale: 1.05 } : {}}
              whileTap={playable ? { scale: 0.95 } : {}}
              className={`aspect-square rounded-2xl border-2 text-6xl font-display font-bold transition-colors duration-300 relative overflow-hidden flex items-center justify-center ${
                isWinning
                  ? "border-primary bg-primary/20 shadow-[0_0_20px_oklch(0.85_0.15_190/0.4)] z-10"
                  : "border-border/20 bg-background/40 shadow-inner"
              } ${playable ? "hover:border-primary/50 hover:bg-white/5 cursor-pointer" : "cursor-default"} ${
                cell === 0 ? "text-[var(--mark-x)]" : cell === 1 ? "text-[var(--mark-o)]" : ""
              }`}
            >
              {/* Subtle hover gradient for playable cells */}
              {playable && (
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 hover:opacity-100 transition-opacity" />
              )}

              <AnimatePresence>
                {cell !== null && (
                  <motion.span
                    initial={{ scale: 0.2, opacity: 0, rotate: -45 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className={isWinning ? "drop-shadow-[0_0_10px_currentColor]" : ""}
                  >
                    {MARKS[cell]}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
