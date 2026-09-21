import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchLeaderboard } from "@/lib/api";
import { useRealtime } from "@/hooks/useRealtime";
import { useUserId } from "@/hooks/useSession";

export const Route = createFileRoute("/_authenticated/leaderboard")({
  head: () => ({
    meta: [
      { title: "Leaderboard — GameHub" },
      { name: "description", content: "GameHub rankings by points, wins, draws and losses." },
      { property: "og:title", content: "Leaderboard — GameHub" },
      {
        property: "og:description",
        content: "GameHub rankings by points, wins, draws and losses.",
      },
    ],
  }),
  component: Leaderboard,
});

function Leaderboard() {
  const userId = useUserId();
  const queryClient = useQueryClient();
  const rows = useQuery({ queryKey: ["leaderboard"], queryFn: fetchLeaderboard });

  useRealtime(
    "leaderboard-realtime",
    [{ table: "profiles" }, { table: "match_results" }],
    () => {
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    },
  );

  const ranked = rows.data ?? [];

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10">
      <p className="text-eyebrow">Standings</p>
      <h1 className="mt-2 text-3xl font-bold">Leaderboard</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Win 3 points, draw 1 point. Finished matches only.
      </p>

      {rows.isLoading ? (
        <p className="mt-10 text-eyebrow animate-pulse">Loading standings</p>
      ) : ranked.length === 0 ? (
        <div className="panel mt-8 p-10 text-center">
          <h2 className="text-xl font-semibold">No players yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign up to take your place on the leaderboard.
          </p>
        </div>
      ) : (
        <div className="panel mt-8 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-4 py-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">
                  #
                </th>
                <th className="px-4 py-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">
                  Player
                </th>
                <th className="px-4 py-3 text-right font-mono text-xs uppercase tracking-widest text-muted-foreground">
                  W
                </th>
                <th className="px-4 py-3 text-right font-mono text-xs uppercase tracking-widest text-muted-foreground">
                  D
                </th>
                <th className="px-4 py-3 text-right font-mono text-xs uppercase tracking-widest text-muted-foreground">
                  L
                </th>
                <th className="px-4 py-3 text-right font-mono text-xs uppercase tracking-widest text-muted-foreground">
                  Pts
                </th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((row, index) => (
                <tr
                  key={row.user_id}
                  className={`border-b border-border last:border-0 ${
                    row.user_id === userId ? "bg-accent" : ""
                  }`}
                >
                  <td className="px-4 py-3 font-mono text-muted-foreground">{index + 1}</td>
                  <td className="px-4 py-3 font-medium">
                    {row.display_name}
                    <span className="ml-2 text-xs text-muted-foreground">@{row.username}</span>
                    {row.user_id === userId ? (
                      <span className="ml-2 font-semibold text-xs text-primary">(You)</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-right">{row.wins}</td>
                  <td className="px-4 py-3 text-right">{row.draws}</td>
                  <td className="px-4 py-3 text-right">{row.losses}</td>
                  <td className="px-4 py-3 text-right font-semibold text-primary">{row.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

