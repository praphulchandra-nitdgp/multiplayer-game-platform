import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getGameModule } from "@/lib/games/registry";

const POINTS = { win: 3, draw: 1, loss: 0 } as const;

type RoomRow = {
  id: string;
  game_slug: string;
  host_id: string;
  status: string;
};

async function loadRoomAndSeats(
  supabase: any,
  roomId: string,
): Promise<{ room: RoomRow; playerIds: string[] }> {
  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select("id, game_slug, host_id, status")
    .eq("id", roomId)
    .maybeSingle();
  if (roomError) throw new Error(roomError.message);
  if (!room) throw new Error("Room not found.");

  const { data: seats, error: seatError } = await supabase
    .from("room_players")
    .select("user_id, seat")
    .eq("room_id", roomId)
    .order("seat", { ascending: true });
  if (seatError) throw new Error(seatError.message);

  return { room: room as RoomRow, playerIds: (seats ?? []).map((s: { user_id: string }) => s.user_id) };
}

/** Host starts (or restarts) the match once every seat is filled. */
export const startMatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { roomId: string }) => {
    if (!input?.roomId) throw new Error("roomId is required.");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { room, playerIds } = await loadRoomAndSeats(supabase, data.roomId);

    if (room.host_id !== userId) throw new Error("Only the host can start the match.");

    const mod = getGameModule(room.game_slug);
    if (playerIds.length < mod.seats) throw new Error("Waiting for more players to join.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: live } = await supabaseAdmin
      .from("matches")
      .select("id")
      .eq("room_id", room.id)
      .eq("status", "active")
      .maybeSingle();
    if (live) return { matchId: live.id as string };

    const seated = playerIds.slice(0, mod.seats);
    const { data: match, error } = await supabaseAdmin
      .from("matches")
      .insert({
        room_id: room.id,
        game_slug: room.game_slug,
        state: mod.createInitialState(seated) as never,
        turn_user_id: mod.firstTurn(seated),
        status: "active",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("rooms").update({ status: "playing" }).eq("id", room.id);

    return { matchId: match.id as string };
  });

/** Apply one validated move. All rule enforcement happens here, never in the browser. */
export const makeMove = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { matchId: string; move: unknown }) => {
    if (!input?.matchId) throw new Error("matchId is required.");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: match, error: matchError } = await supabase
      .from("matches")
      .select("id, room_id, game_slug, state, turn_user_id, status")
      .eq("id", data.matchId)
      .maybeSingle();
    if (matchError) throw new Error(matchError.message);
    if (!match) throw new Error("Match not found.");
    if (match.status !== "active") throw new Error("This match is already over.");
    if (match.turn_user_id !== userId) throw new Error("It is not your turn.");

    const { playerIds } = await loadRoomAndSeats(supabase, match.room_id as string);
    const mod = getGameModule(match.game_slug as string);
    const seated = playerIds.slice(0, mod.seats);

    const result = mod.applyMove({
      state: match.state as never,
      playerIds: seated,
      userId,
      move: mod.parseMove(data.move) as never,
    });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error: updateError } = await supabaseAdmin
      .from("matches")
      .update({
        state: result.state as never,
        turn_user_id: result.nextUserId,
        status: result.status,
        winner_id: result.winnerId,
        is_draw: result.isDraw,
        finished_at: result.status === "finished" ? new Date().toISOString() : null,
      })
      .eq("id", match.id)
      .eq("status", "active")
      .eq("turn_user_id", userId);
    if (updateError) throw new Error(updateError.message);

    if (result.status === "finished") {
      const rows = seated.map((playerId) => {
        const outcome = result.isDraw ? "draw" : playerId === result.winnerId ? "win" : "loss";
        return {
          match_id: match.id as string,
          game_slug: match.game_slug as string,
          user_id: playerId,
          outcome,
          points: POINTS[outcome as keyof typeof POINTS],
        };
      });
      await supabaseAdmin.from("match_results").upsert(rows, { onConflict: "match_id,user_id" });
      await supabaseAdmin.from("rooms").update({ status: "finished" }).eq("id", match.room_id);
    }

    return { ok: true, status: result.status };
  });

/** Host clears the finished match so the same players can go again. */
export const startRematch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { roomId: string }) => {
    if (!input?.roomId) throw new Error("roomId is required.");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { room, playerIds } = await loadRoomAndSeats(supabase, data.roomId);
    if (room.host_id !== userId) throw new Error("Only the host can start a rematch.");

    const mod = getGameModule(room.game_slug);
    if (playerIds.length < mod.seats) throw new Error("Waiting for more players to join.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const seated = playerIds.slice(0, mod.seats);
    // Alternate who opens the next game.
    const rotated = [...seated.slice(1), seated[0]!];

    const { data: match, error } = await supabaseAdmin
      .from("matches")
      .insert({
        room_id: room.id,
        game_slug: room.game_slug,
        state: mod.createInitialState(rotated) as never,
        turn_user_id: mod.firstTurn(rotated),
        status: "active",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("rooms").update({ status: "playing" }).eq("id", room.id);
    return { matchId: match.id as string };
  });
