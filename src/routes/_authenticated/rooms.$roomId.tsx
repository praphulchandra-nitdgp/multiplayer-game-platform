import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

import {
  fetchGames,
  fetchLatestMatch,
  fetchRoom,
  forfeitMatchInRoom,
  leaveRoom,
  type Profile,
} from "@/lib/api";
import { makeMove, startMatch, startRematch } from "@/lib/match.functions";
import { getGameBoard } from "@/components/games";
import { RoomChat } from "@/components/room-chat";
import { useRealtime } from "@/hooks/useRealtime";
import { useUserId } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/rooms/$roomId")({
  head: () => ({
    meta: [
      { title: "Match room — GameHub" },
      { name: "description", content: "Play your live GameHub match and chat with your opponent." },
      { property: "og:title", content: "Match room — GameHub" },
      {
        property: "og:description",
        content: "Play your live GameHub match and chat with your opponent.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RoomPage,
});

function RoomPage() {
  const { roomId } = Route.useParams();
  const userId = useUserId();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [presentUserIds, setPresentUserIds] = useState<string[]>([]);

  const room = useQuery({ queryKey: ["room", roomId], queryFn: () => fetchRoom(roomId) });
  const match = useQuery({ queryKey: ["match", roomId], queryFn: () => fetchLatestMatch(roomId) });
  const games = useQuery({ queryKey: ["games"], queryFn: fetchGames });

  useRealtime(
    `room-${roomId}`,
    [
      { table: "rooms", filter: `id=eq.${roomId}` },
      { table: "room_players", filter: `room_id=eq.${roomId}` },
      { table: "matches", filter: `room_id=eq.${roomId}` },
    ],
    () => {
      queryClient.invalidateQueries({ queryKey: ["room", roomId] });
      queryClient.invalidateQueries({ queryKey: ["match", roomId] });
    },
  );

  useEffect(() => {
    if (!userId || !roomId) return;
    const channel = supabase.channel(`presence-room-${roomId}`, {
      config: { presence: { key: userId } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setPresentUserIds(Object.keys(state));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ user_id: userId, online_at: new Date().toISOString() });
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [roomId, userId]);

  const startFn = useServerFn(startMatch);
  const moveFn = useServerFn(makeMove);
  const rematchFn = useServerFn(startRematch);

  const start = useMutation({
    mutationFn: () => startFn({ data: { roomId } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["match", roomId] }),
    onError: (error: Error) => toast.error(error.message),
  });

  const play = useMutation({
    mutationFn: (move: unknown) => moveFn({ data: { matchId: match.data!.id, move } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["match", roomId] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const rematch = useMutation({
    mutationFn: () => rematchFn({ data: { roomId } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["match", roomId] }),
    onError: (error: Error) => toast.error(error.message),
  });

  const leave = useMutation({
    mutationFn: async () => {
      if (!userId) return;
      await leaveRoom({ roomId, userId });
    },
    onSuccess: () => navigate({ to: "/lobby" }),
    onError: (error: Error) => toast.error(error.message),
  });

  const forfeitOpponent = useMutation({
    mutationFn: async () => {
      if (!userId) return;
      const opponentId = playerIds.find((id) => id !== userId);
      if (opponentId) {
        await forfeitMatchInRoom({ roomId, forfeiterUserId: opponentId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["match", roomId] });
      queryClient.invalidateQueries({ queryKey: ["room", roomId] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      toast.success("Match ended: Opponent forfeited.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (room.isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-eyebrow animate-pulse text-lg">Initializing arena...</p>
      </div>
    );
  }

  if (!room.data) {
    return (
      <motion.div
        className="mx-auto max-w-6xl px-4 py-16 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-4xl font-bold text-destructive">Room closed</h1>
        <p className="mt-4 text-base text-muted-foreground">
          It may have been closed by the host or timed out.
        </p>
        <Button className="mt-8 rounded-full" asChild>
          <Link to="/lobby">Back to lobby</Link>
        </Button>
      </motion.div>
    );
  }

  const data = room.data;
  const game = (games.data ?? []).find((g) => g.slug === data.game_slug);
  const capacity = game?.max_players ?? 2;
  const playerIds = data.players.map((p) => p.user_id);
  const profiles: Record<string, Profile> = Object.fromEntries(
    data.players.filter((p) => p.profile).map((p) => [p.user_id, p.profile as Profile]),
  );
  const isMember = playerIds.includes(userId ?? "");
  const isHost = data.host_id === userId;
  const Board = getGameBoard(data.game_slug);

  const live = match.data && match.data.status === "active" ? match.data : null;
  const finished = match.data && match.data.status === "finished" ? match.data : null;

  const opponentId = playerIds.find((id) => id !== userId);
  const isOpponentAway = Boolean(live && opponentId && !presentUserIds.includes(opponentId));

  const turnName = live?.turn_user_id
    ? live.turn_user_id === userId
      ? "Your turn"
      : `${profiles[live.turn_user_id]?.display_name ?? "Opponent"}'s turn`
    : null;

  const resultText = finished
    ? finished.is_draw
      ? "Draw — nobody takes it."
      : finished.winner_id === userId
        ? "You win!"
        : `${profiles[finished.winner_id ?? ""]?.display_name ?? "Opponent"} wins.`
    : null;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 relative">
      {/* Decorative background glow */}
      <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[100px] pointer-events-none" />

      <motion.div
        className="flex flex-wrap items-end justify-between gap-4 relative z-10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <p className="text-eyebrow tracking-[0.3em]">{game?.name ?? data.game_slug}</p>
          <h1 className="mt-2 text-4xl font-bold">{data.name}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            className="rounded-full hover:bg-white/5"
            onClick={() => navigate({ to: "/lobby" })}
          >
            Return to Lobby
          </Button>
          {isMember ? (
            <Button
              variant="destructive"
              className="rounded-full shadow-glow-destructive"
              onClick={() => leave.mutate()}
              disabled={leave.isPending}
            >
              Leave Room (Forfeit)
            </Button>
          ) : null}
        </div>
      </motion.div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_22rem] relative z-10">
        <motion.section
          className="panel p-6 relative overflow-hidden"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex flex-wrap items-center gap-4">
            {Array.from({ length: capacity }).map((_, seat) => {
              const seated = data.players.find((p) => p.seat === seat);
              const isTurn = Boolean(live && seated && live.turn_user_id === seated.user_id);
              const isPresent = seated ? presentUserIds.includes(seated.user_id) : false;

              return (
                <motion.div
                  key={seat}
                  animate={isTurn ? { scale: 1.05 } : { scale: 1 }}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-all duration-300 ${
                    isTurn
                      ? "border-primary bg-primary/10 shadow-[0_0_15px_oklch(0.85_0.15_190/0.3)]"
                      : "border-border/50 bg-background/50"
                  }`}
                >
                  <span
                    className={`font-mono text-lg font-bold ${seat === 0 ? "text-[var(--mark-x)]" : "text-[var(--mark-o)]"}`}
                  >
                    {seat === 0 ? "X" : "O"}
                  </span>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold">
                      {seated ? (seated.profile?.display_name ?? "Player") : "Open seat"}
                    </span>
                    <div className="flex gap-2 mt-1">
                      {seated?.user_id === data.host_id ? (
                        <Badge variant="secondary" className="text-[10px] h-4 px-1.5 bg-white/10">
                          Host
                        </Badge>
                      ) : null}
                      {seated ? (
                        <Badge
                          variant={isPresent ? "outline" : "destructive"}
                          className={`text-[10px] h-4 px-1.5 ${isPresent ? "border-primary/50 text-primary" : ""}`}
                        >
                          {isPresent ? "In room" : "Away"}
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="mt-10 min-h-12 flex items-center justify-center text-center">
            <AnimatePresence mode="wait">
              {isOpponentAway ? (
                <motion.div
                  key="away"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 w-full"
                >
                  <div className="text-left text-amber-500">
                    <p className="text-base font-bold flex items-center gap-2">
                      <span className="animate-pulse">⚠️</span> Game Paused
                    </p>
                    <p className="text-sm opacity-90 mt-1">
                      {profiles[opponentId!]?.display_name ?? "Opponent"} left the room temporarily.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="rounded-full shadow-glow-destructive"
                    onClick={() => forfeitOpponent.mutate()}
                    disabled={forfeitOpponent.isPending}
                  >
                    Claim Victory (Forfeit Opponent)
                  </Button>
                </motion.div>
              ) : live ? (
                <motion.p
                  key="live"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`font-display text-2xl font-bold tracking-wide ${live.turn_user_id === userId ? "text-primary drop-shadow-[0_0_8px_oklch(0.85_0.15_190/0.8)]" : "text-muted-foreground"}`}
                >
                  {turnName}
                </motion.p>
              ) : finished ? (
                <motion.p
                  key="finished"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="font-display text-4xl font-bold text-gradient drop-shadow-[0_0_15px_oklch(0.85_0.15_190/0.5)]"
                >
                  {resultText}
                </motion.p>
              ) : (
                <motion.p
                  key="waiting"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-base text-muted-foreground"
                >
                  {playerIds.length < capacity
                    ? "Waiting for another player to take the open seat."
                    : isHost
                      ? "Both seats filled — start the match."
                      : "Waiting for the host to start the match."}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <div className="mt-10">
            {Board ? (
              <Board
                state={match.data?.state ?? null}
                playerIds={playerIds}
                myUserId={userId}
                turnUserId={live?.turn_user_id ?? null}
                busy={play.isPending || isOpponentAway}
                onPlay={(move) => play.mutate(move)}
              />
            ) : (
              <p className="text-sm text-muted-foreground text-center">
                This game isn't playable in the browser yet.
              </p>
            )}
          </div>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            {isHost && !live && !finished ? (
              <Button
                size="lg"
                className="rounded-full px-12 glow-ring text-lg font-semibold"
                onClick={() => start.mutate()}
                disabled={start.isPending || playerIds.length < capacity}
              >
                Start match
              </Button>
            ) : null}
            {isHost && finished ? (
              <Button
                size="lg"
                className="rounded-full px-12 glow-ring text-lg font-semibold"
                onClick={() => rematch.mutate()}
                disabled={rematch.isPending}
              >
                Rematch
              </Button>
            ) : null}
          </div>
        </motion.section>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <RoomChat roomId={roomId} userId={userId} profiles={profiles} canPost={isMember} />
        </motion.div>
      </div>
    </main>
  );
}
