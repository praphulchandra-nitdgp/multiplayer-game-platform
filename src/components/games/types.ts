export interface GameBoardProps {
  state: unknown;
  /** Player ids ordered by seat. */
  playerIds: string[];
  myUserId: string | null;
  turnUserId: string | null;
  busy: boolean;
  onPlay: (move: unknown) => void;
}
