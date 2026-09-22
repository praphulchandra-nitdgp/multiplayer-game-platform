import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";

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

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
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
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-primary/40 bg-primary/10 p-5 shadow-[0_0_20px_oklch(0.85_0.15_190/0.15)]"
        >
          <div>
            <Badge
              variant="default"
              className="mb-2 bg-primary/20 text-primary hover:bg-primary/30 border-primary/30"
            >
              Active Room
            </Badge>
            <h2 className="text-xl font-bold">{myActiveRoom.data.name}</h2>
            <p className="text-sm text-primary/80 mt-1">
              You have a seat reserved in this room (
              {STATUS_LABEL[myActiveRoom.data.status] ?? myActiveRoom.data.status}).
            </p>
          </div>
          <Button
            className="glow-ring rounded-full"
            onClick={() =>
              navigate({ to: "/rooms/$roomId", params: { roomId: myActiveRoom.data!.id } })
            }
          >
            Return to Room
          </Button>
        </motion.div>
      ) : null}

      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <p className="text-eyebrow">Lobby</p>
          <h1 className="mt-2 text-4xl font-bold text-gradient">Open rooms</h1>
        </motion.div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-full shadow-lg hover:shadow-primary/20">Create room</Button>
          </DialogTrigger>
          <DialogContent className="panel">
            <DialogHeader>
              <DialogTitle className="text-2xl">Create a room</DialogTitle>
              <DialogDescription>
                Name your room, pick a game, and share the link with your opponent.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-4">
              <div className="space-y-2">
                <Label htmlFor="room-name">Room name</Label>
                <Input
                  id="room-name"
                  value={roomName}
                  placeholder="Neon Showdown"
                  onChange={(e) => setRoomName(e.target.value)}
                  maxLength={48}
                  className="bg-background/50 border-border/50 focus:border-primary/50"
                />
              </div>
              <div className="space-y-3">
                <Label>Game</Label>
                {games.isLoading ? (
                  <p className="text-sm text-muted-foreground animate-pulse">Loading games…</p>
                ) : games.isError ? (
                  <p className="text-sm text-destructive">
                    Games could not be loaded. Refresh and try again.
                  </p>
                ) : games.data?.length ? (
                  <div className="grid gap-2">
                    {games.data.map((game) => (
                      <button
                        key={game.slug}
                        type="button"
                        onClick={() => setGameSlug(game.slug)}
                        className={`rounded-lg border p-4 text-left transition-all ${
                          activeGame === game.slug
                            ? "border-primary bg-primary/10 shadow-[0_0_15px_oklch(0.85_0.15_190/0.2)]"
                            : "border-border/50 hover:bg-white/5 hover:border-primary/30"
                        }`}
                      >
                        <span className="block font-semibold text-foreground">{game.name}</span>
                        <span className="block text-sm text-muted-foreground mt-1">
                          {game.tagline}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No games are available yet. Run the latest database migration.
                  </p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                onClick={() => create.mutate()}
                disabled={create.isPending || games.isLoading || !activeGame}
                className="rounded-full w-full sm:w-auto glow-ring"
              >
                Create and open
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {rooms.isLoading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <p className="text-eyebrow animate-pulse text-lg tracking-[0.2em]">
            Scanning for rooms...
          </p>
        </div>
      ) : (rooms.data ?? []).length === 0 ? (
        <motion.div
          className="panel mt-8 p-16 text-center relative overflow-hidden"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-mark-o/5 opacity-50" />
          <h2 className="text-3xl font-semibold relative z-10">No rooms active</h2>
          <p className="mt-3 text-base text-muted-foreground relative z-10 max-w-md mx-auto">
            The arena is quiet. Be the first to create a room and invite someone to take the other
            seat.
          </p>
        </motion.div>
      ) : (
        <motion.ul
          className="grid gap-4"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {(rooms.data ?? []).map((room) => {
            const game = gameBySlug.get(room.game_slug);
            const seatsTaken = room.players.length;
            const capacity = game?.max_players ?? 2;
            const isMember = room.players.some((p) => p.user_id === userId);
            const isFull = seatsTaken >= capacity;

            return (
              <motion.li
                key={room.id}
                className="panel flex flex-wrap items-center gap-4 p-5 hover:border-primary/40 transition-colors group"
                variants={itemVariants}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="truncate text-xl font-semibold group-hover:text-primary transition-colors">
                      {room.name}
                    </h2>
                    <Badge variant="outline" className="bg-background/50 border-border/50">
                      {game?.name ?? room.game_slug}
                    </Badge>
                    <span className="text-xs font-mono tracking-widest text-muted-foreground uppercase">
                      {STATUS_LABEL[room.status] ?? room.status}
                    </span>
                  </div>
                  <p className="mt-2 truncate text-sm text-muted-foreground">
                    <span className="text-foreground font-medium">
                      {seatsTaken}/{capacity} seats
                    </span>{" "}
                    <span className="opacity-50 mx-1">·</span>
                    {room.players.map((p) => p.profile?.display_name ?? "Player").join(" vs ") ||
                      "Empty"}
                  </p>
                </div>

                <div className="shrink-0">
                  {isMember ? (
                    <Button
                      variant="outline"
                      className="rounded-full border-primary/50 hover:bg-primary/10 hover:text-primary"
                      onClick={() =>
                        navigate({ to: "/rooms/$roomId", params: { roomId: room.id } })
                      }
                    >
                      Return to room
                    </Button>
                  ) : isFull ? (
                    <Button
                      variant="ghost"
                      className="rounded-full hover:bg-white/5"
                      onClick={() =>
                        navigate({ to: "/rooms/$roomId", params: { roomId: room.id } })
                      }
                    >
                      Watch
                    </Button>
                  ) : (
                    <Button
                      className="rounded-full hover:shadow-[0_0_15px_oklch(0.85_0.15_190/0.4)] transition-shadow"
                      onClick={() => join.mutate(room.id)}
                      disabled={join.isPending}
                    >
                      Join Match
                    </Button>
                  )}
                </div>
              </motion.li>
            );
          })}
        </motion.ul>
      )}
    </main>
  );
}
