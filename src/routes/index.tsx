import { Link, createFileRoute } from "@tanstack/react-router";

import { useSession } from "@/hooks/useSession";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GameHub — live head-to-head game rooms" },
      {
        name: "description",
        content:
          "Create a room, invite a friend and play Tic-Tac-Toe live with in-room chat and a global leaderboard.",
      },
      { property: "og:title", content: "GameHub — live head-to-head game rooms" },
      {
        property: "og:description",
        content:
          "Create a room, invite a friend and play Tic-Tac-Toe live with in-room chat and a global leaderboard.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    title: "Rooms in one click",
    body: "Spin up a room, share the link, and your opponent drops into the seat next to you.",
  },
  {
    title: "Live matches",
    body: "Every move lands instantly for both players. The server owns the rules, so nobody can cheat.",
  },
  {
    title: "Chat while you play",
    body: "Trash talk, coordinate a rematch, or call a good game — all inside the room.",
  },
  {
    title: "Global leaderboard",
    body: "Wins, draws and points tracked across every match you finish.",
  },
];

function Landing() {
  const { session, loading } = useSession();

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main>
        <section className="grid-backdrop border-b border-border">
          <div className="mx-auto w-full max-w-6xl px-4 py-24">
            <p className="text-eyebrow">Live multiplayer arena</p>
            <h1 className="mt-4 max-w-3xl text-5xl font-bold leading-[1.05] sm:text-6xl">
              Pick a room.
              <br />
              <span className="text-primary">Take the match.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base text-muted-foreground">
              GameHub is a head-to-head arena for quick matches with friends. Tic-Tac-Toe is live
              now, with real-time turns, room chat and a ranked leaderboard.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              {!loading && session ? (
                <>
                  <Button size="lg" asChild>
                    <Link to="/lobby">Open the lobby</Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild>
                    <Link to="/leaderboard">View leaderboard</Link>
                  </Button>
                </>
              ) : (
                <Button size="lg" asChild>
                  <Link to="/auth" search={{ redirect: undefined }}>
                    Start playing
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-20">
          <div className="grid gap-4 sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="panel p-6">
                <h2 className="text-xl font-semibold">{feature.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{feature.body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8">
        <div className="mx-auto w-full max-w-6xl px-4 text-eyebrow">GameHub</div>
      </footer>
    </div>
  );
}
