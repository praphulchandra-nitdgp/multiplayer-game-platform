import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { fetchGames, fetchLatestMatch, fetchRoom, forfeitMatchInRoom, leaveRoom, type Profile } from "@/lib/api";
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
    return <p className="mx-auto max-w-6xl px-4 py-12 text-eyebrow animate-pulse">Loading room</p>;
  }

  if (!room.data) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16">
        <h1 className="text-2xl font-bold">Room not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">It may have been closed by the host.</p>
        <Button className="mt-6" asChild>
          <Link to="/lobby">Back to lobby</Link>
        </Button>
      </div>
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
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-eyebrow">{game?.name ?? data.game_slug}</p>
          <h1 className="mt-2 text-3xl font-bold">{data.name}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => navigate({ to: "/lobby" })}>
            Return to Lobby
          </Button>
          {isMember ? (
            <Button variant="destructive" onClick={() => leave.mutate()} disabled={leave.isPending}>
              Leave Room (Forfeit)
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_22rem]">
        <section className="panel p-6">
          <div className="flex flex-wrap items-center gap-3">
            {Array.from({ length: capacity }).map((_, seat) => {
              const seated = data.players.find((p) => p.seat === seat);
              const isTurn = Boolean(live && seated && live.turn_user_id === seated.user_id);
              const isPresent = seated ? presentUserIds.includes(seated.user_id) : false;
              return (
                <div
                  key={seat}
                  className={`flex items-center gap-2 rounded-md border px-3 py-2 ${
                    isTurn ? "border-primary bg-accent" : "border-border"
                  }`}
                >
                  <span className="font-mono text-xs text-muted-foreground">
                    {seat === 0 ? "X" : "O"}
                  </span>
                  <span className="text-sm font-medium">
                    {seated ? seated.profile?.display_name ?? "Player" : "Open seat"}
                  </span>
                  {seated?.user_id === data.host_id ? <Badge variant="secondary">Host</Badge> : null}
                  {seated ? (
                    <Badge variant={isPresent ? "outline" : "destructive"}>
                      {isPresent ? "In room" : "Away"}
                    </Badge>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="mt-6 min-h-8">
            {isOpponentAway ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-amber-500">
                <div>
                  <p className="text-sm font-bold">⏸️ Game Paused</p>
                  <p className="text-xs opacity-90">
                    {profiles[opponentId!]?.display_name ?? "Opponent"} left the room temporarily and is in the lobby.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => forfeitOpponent.mutate()}
                  disabled={forfeitOpponent.isPending}
                >
                  Claim Victory (Forfeit Opponent)
                </Button>
              </div>
            ) : live ? (
              <p className="font-display text-lg font-semibold text-primary">{turnName}</p>
            ) : finished ? (
              <p className="font-display text-lg font-semibold">{resultText}</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                {playerIds.length < capacity
                  ? "Waiting for another player to take the open seat."
                  : isHost
                    ? "Both seats filled — start the match."
                    : "Waiting for the host to start the match."}
              </p>
            )}
          </div>

          <div className="mt-6">
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
              <p className="text-sm text-muted-foreground">
                This game isn't playable in the browser yet.
              </p>
            )}
          </div>

          <div className="mt-7 flex flex-wrap gap-2">
            {isHost && !live && !finished ? (
              <Button
                onClick={() => start.mutate()}
                disabled={start.isPending || playerIds.length < capacity}
              >
                Start match
              </Button>
            ) : null}
            {isHost && finished ? (
              <Button onClick={() => rematch.mutate()} disabled={rematch.isPending}>
                Rematch
              </Button>
            ) : null}
          </div>
        </section>

        <RoomChat roomId={roomId} userId={userId} profiles={profiles} canPost={isMember} />
      </div>
    </main>
  );
}

