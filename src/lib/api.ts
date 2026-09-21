import { supabase } from "@/integrations/supabase/client";

export type Game = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  min_players: number;
  max_players: number;
};

export type Profile = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
};

export type RoomSummary = {
  id: string;
  name: string;
  game_slug: string;
  host_id: string;
  status: string;
  created_at: string;
  players: { user_id: string; seat: number; profile: Profile | null }[];
};

export type MatchRow = {
  id: string;
  room_id: string;
  game_slug: string;
  state: unknown;
  turn_user_id: string | null;
  status: string;
  winner_id: string | null;
  is_draw: boolean;
  created_at: string;
};

export type ChatMessage = {
  id: string;
  room_id: string;
  user_id: string;
  body: string;
  created_at: string;
};

export type LeaderboardRow = {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  games_played: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
};

function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data as T;
}

export async function fetchGames(): Promise<Game[]> {
  return unwrap(
    await supabase
      .from("games")
      .select("slug, name, tagline, description, min_players, max_players")
      .eq("is_active", true)
      .order("name"),
  );
}

export async function fetchRooms(): Promise<RoomSummary[]> {
  const rooms = unwrap(
    await supabase
      .from("rooms")
      .select("id, name, game_slug, host_id, status, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
  );
  if (rooms.length === 0) return [];

  const seats = unwrap(
    await supabase
      .from("room_players")
      .select("room_id, user_id, seat")
      .in(
        "room_id",
        rooms.map((r) => r.id),
      )
      .order("seat"),
  );

  const profiles = await fetchProfiles(seats.map((s) => s.user_id));

  return rooms.map((room) => ({
    ...room,
    players: seats
      .filter((s) => s.room_id === room.id)
      .map((s) => ({ user_id: s.user_id, seat: s.seat, profile: profiles[s.user_id] ?? null })),
  }));
}

export async function fetchProfiles(ids: string[]): Promise<Record<string, Profile>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return {};
  const rows = unwrap(
    await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .in("id", unique),
  );
  return Object.fromEntries(rows.map((row) => [row.id, row]));
}

export async function fetchRoom(roomId: string): Promise<RoomSummary | null> {
  const room = unwrap<Omit<RoomSummary, "players"> | null>(
    await supabase
      .from("rooms")
      .select("id, name, game_slug, host_id, status, created_at")
      .eq("id", roomId)
      .maybeSingle(),
  );
  if (!room) return null;

  const seats = unwrap<{ room_id: string; user_id: string; seat: number }[]>(
    await supabase.from("room_players").select("room_id, user_id, seat").eq("room_id", roomId).order("seat"),
  );
  const profiles = await fetchProfiles([...seats.map((s) => s.user_id), room.host_id]);

  return {
    ...room,
    players: seats.map((s) => ({
      user_id: s.user_id,
      seat: s.seat,
      profile: profiles[s.user_id] ?? null,
    })),
  };
}

export async function fetchLatestMatch(roomId: string): Promise<MatchRow | null> {
  return unwrap<MatchRow | null>(
    await supabase
      .from("matches")
      .select("id, room_id, game_slug, state, turn_user_id, status, winner_id, is_draw, created_at")
      .eq("room_id", roomId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  );
}

export async function fetchMessages(roomId: string): Promise<ChatMessage[]> {
  return unwrap(
    await supabase
      .from("messages")
      .select("id, room_id, user_id, body, created_at")
      .eq("room_id", roomId)
      .order("created_at")
      .limit(200),
  );
}

export async function fetchLeaderboard(): Promise<LeaderboardRow[]> {
  const rows = unwrap(
    await supabase
      .from("leaderboard")
      .select("user_id, username, display_name, avatar_url, games_played, wins, draws, losses, points")
      .order("points", { ascending: false })
      .order("wins", { ascending: false })
      .limit(100),
  );
  return rows as LeaderboardRow[];
}

export async function createRoom(input: { name: string; gameSlug: string; userId: string }) {
  const room = unwrap<{ id: string } | null>(
    await supabase
      .from("rooms")
      .insert({ name: input.name, game_slug: input.gameSlug, host_id: input.userId })
      .select("id")
      .single(),
  );
  if (!room) throw new Error("Could not create the room.");
  const { error } = await supabase
    .from("room_players")
    .insert({ room_id: room.id, user_id: input.userId, seat: 0 });
  if (error) throw new Error(error.message);
  return room.id as string;
}

export async function joinRoom(input: { roomId: string; userId: string }) {
  const seats = unwrap(
    await supabase.from("room_players").select("user_id, seat").eq("room_id", input.roomId).order("seat"),
  );
  if (seats.some((s) => s.user_id === input.userId)) return;

  const used = new Set(seats.map((s) => s.seat));
  let seat = 0;
  while (used.has(seat)) seat += 1;

  const { error } = await supabase
    .from("room_players")
    .insert({ room_id: input.roomId, user_id: input.userId, seat });
  if (error) throw new Error(error.message);
}

export async function fetchMyActiveRoom(userId: string): Promise<RoomSummary | null> {
  const seats = unwrap<{ room_id: string }[]>(
    await supabase.from("room_players").select("room_id").eq("user_id", userId),
  );
  if (!seats || seats.length === 0) return null;

  const room = unwrap<Omit<RoomSummary, "players"> | null>(
    await supabase
      .from("rooms")
      .select("id, name, game_slug, host_id, status, created_at")
      .in(
        "id",
        seats.map((s) => s.room_id),
      )
      .in("status", ["waiting", "playing"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  );
  if (!room) return null;
  return fetchRoom(room.id);
}

export async function forfeitMatchInRoom(input: { roomId: string; forfeiterUserId: string }) {
  const { data: activeMatch } = await supabase
    .from("matches")
    .select("id, game_slug")
    .eq("room_id", input.roomId)
    .eq("status", "active")
    .maybeSingle();

  if (!activeMatch) return;

  const { data: seats } = await supabase
    .from("room_players")
    .select("user_id")
    .eq("room_id", input.roomId);

  const opponentId = seats?.find((s) => s.user_id !== input.forfeiterUserId)?.user_id;

  await supabase
    .from("matches")
    .update({
      status: "finished",
      winner_id: opponentId ?? null,
      is_draw: false,
      finished_at: new Date().toISOString(),
    })
    .eq("id", activeMatch.id);

  if (opponentId) {
    await supabase.from("match_results").upsert(
      [
        { match_id: activeMatch.id, game_slug: activeMatch.game_slug, user_id: opponentId, outcome: "win", points: 3 },
        { match_id: activeMatch.id, game_slug: activeMatch.game_slug, user_id: input.forfeiterUserId, outcome: "loss", points: 0 },
      ],
      { onConflict: "match_id,user_id" },
    );
  }

  await supabase.from("rooms").update({ status: "finished" }).eq("id", input.roomId);
}

export async function leaveRoom(input: { roomId: string; userId: string }) {
  // If match is active when leaving, opponent wins by forfeit
  await forfeitMatchInRoom({ roomId: input.roomId, forfeiterUserId: input.userId });

  const { error } = await supabase
    .from("room_players")
    .delete()
    .eq("room_id", input.roomId)
    .eq("user_id", input.userId);
  if (error) throw new Error(error.message);
}

export async function sendMessage(input: { roomId: string; userId: string; body: string }) {
  const { error } = await supabase
    .from("messages")
    .insert({ room_id: input.roomId, user_id: input.userId, body: input.body });
  if (error) throw new Error(error.message);
}

