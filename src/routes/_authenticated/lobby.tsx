import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { createRoom, fetchGames, fetchMyActiveRoom, fetchRooms, joinRoom } from "@/lib/api";
import { useRealtime } from "@/hooks/useRealtime";
import { useUserId } from "@/hooks/useSession";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/lobby")({
  head: () => ({
    meta: [
      { title: "Lobby — GameHub" },
      { name: "description", content: "Browse open GameHub rooms or create your own match." },
      { property: "og:title", content: "Lobby — GameHub" },
      {
        property: "og:description",
        content: "Browse open GameHub rooms or create your own match.",
      },
    ],
  }),
  component: Lobby,
});

const STATUS_LABEL: Record<string, string> = {
  waiting: "Waiting for players",
  playing: "Match in progress",
  finished: "Finished",
};

function Lobby() {
  const userId = useUserId();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const games = useQuery({ queryKey: ["games"], queryFn: fetchGames });
  const rooms = useQuery({ queryKey: ["rooms"], queryFn: fetchRooms });
  const myActiveRoom = useQuery({
    queryKey: ["myActiveRoom", userId],
    queryFn: () => (userId ? fetchMyActiveRoom(userId) : null),
    enabled: Boolean(userId),
  });

  useRealtime("lobby", [{ table: "rooms" }, { table: "room_players" }], () => {
    queryClient.invalidateQueries({ queryKey: ["rooms"] });
    queryClient.invalidateQueries({ queryKey: ["myActiveRoom"] });
  });

  const [open, setOpen] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [gameSlug, setGameSlug] = useState<string | null>(null);

  const activeGame = gameSlug ?? games.data?.[0]?.slug ?? null;

  const create = useMutation({
    mutationFn: async () => {
      const slug =
        gameSlug ?? queryClient.getQueryData<{ slug: string }[]>(["games"])?.[0]?.slug ?? null;
      if (!userId || !slug) throw new Error("Pick a game first.");
      return createRoom({
        name: roomName.trim() || "Quick match",
        gameSlug: slug,
        userId,
      });
    },
    onSuccess: (roomId) => {
      setOpen(false);
      setRoomName("");
      navigate({ to: "/rooms/$roomId", params: { roomId } });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const join = useMutation({
    mutationFn: async (roomId: string) => {
      if (!userId) throw new Error("Sign in first.");
      await joinRoom({ roomId, userId });
      return roomId;
    },
    onSuccess: (roomId) => navigate({ to: "/rooms/$roomId", params: { roomId } }),
    onError: (error: Error) => toast.error(error.message),
  });

  const gameBySlug = new Map((games.data ?? []).map((g) => [g.slug, g]));

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      {myActiveRoom.data ? (
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-primary/40 bg-primary/10 p-4">
          <div>
            <Badge variant="default" className="mb-1">Active Room</Badge>
            <h2 className="text-lg font-bold">{myActiveRoom.data.name}</h2>
            <p className="text-xs text-muted-foreground">
              You have a seat reserved in this room ({STATUS_LABEL[myActiveRoom.data.status] ?? myActiveRoom.data.status}).
            </p>
          </div>
          <Button
            onClick={() => navigate({ to: "/rooms/$roomId", params: { roomId: myActiveRoom.data!.id } })}
          >
            Return to Room
          </Button>
        </div>
      ) : null}

      <div className="flex flex-wrap items-end justify-between gap-4">

        <div>
          <p className="text-eyebrow">Lobby</p>
          <h1 className="mt-2 text-3xl font-bold">Open rooms</h1>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Create room</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create a room</DialogTitle>
              <DialogDescription>
                Name your room, pick a game, and share the link with your opponent.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="room-name">Room name</Label>
                <Input
                  id="room-name"
                  value={roomName}
                  placeholder="Friday night duel"
                  onChange={(e) => setRoomName(e.target.value)}
                  maxLength={48}
                />
              </div>
              <div className="space-y-2">
                <Label>Game</Label>
                <div className="grid gap-2">
                  {(games.data ?? []).map((game) => (
                    <button
                      key={game.slug}
                      type="button"
                      onClick={() => setGameSlug(game.slug)}
                      className={`rounded-md border p-3 text-left transition-colors ${
                        activeGame === game.slug
                          ? "border-primary bg-accent"
                          : "border-border hover:bg-accent"
                      }`}
                    >
                      <span className="block font-semibold">{game.name}</span>
                      <span className="block text-sm text-muted-foreground">{game.tagline}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={() => create.mutate()} disabled={create.isPending}>
                Create and open
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {rooms.isLoading ? (
        <p className="mt-10 text-eyebrow animate-pulse">Loading rooms</p>
      ) : (rooms.data ?? []).length === 0 ? (
        <div className="panel mt-8 p-10 text-center">
          <h2 className="text-xl font-semibold">No rooms yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Create the first room and invite someone to take the other seat.
          </p>
        </div>
      ) : (
        <ul className="mt-8 grid gap-3">
          {(rooms.data ?? []).map((room) => {
            const game = gameBySlug.get(room.game_slug);
            const seatsTaken = room.players.length;
            const capacity = game?.max_players ?? 2;
            const isMember = room.players.some((p) => p.user_id === userId);
            const isFull = seatsTaken >= capacity;

            return (
              <li key={room.id} className="panel flex flex-wrap items-center gap-4 p-5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-lg font-semibold">{room.name}</h2>
                    <Badge variant="secondary">{game?.name ?? room.game_slug}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {STATUS_LABEL[room.status] ?? room.status}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {seatsTaken}/{capacity} seats ·{" "}
                    {room.players.map((p) => p.profile?.display_name ?? "Player").join(" vs ") ||
                      "Empty"}
                  </p>
                </div>

                {isMember ? (
                  <Button
                    variant="outline"
                    onClick={() => navigate({ to: "/rooms/$roomId", params: { roomId: room.id } })}
                  >
                    Return to room
                  </Button>
                ) : isFull ? (
                  <Button
                    variant="ghost"
                    onClick={() => navigate({ to: "/rooms/$roomId", params: { roomId: room.id } })}
                  >
                    Watch
                  </Button>
                ) : (
                  <Button onClick={() => join.mutate(room.id)} disabled={join.isPending}>
                    Join
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
