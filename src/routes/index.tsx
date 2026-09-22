import { Link, createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";

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
    delay: 0.1,
  },
  {
    title: "Live matches",
    body: "Every move lands instantly for both players. The server owns the rules, so nobody can cheat.",
    delay: 0.2,
  },
  {
    title: "Chat while you play",
    body: "Trash talk, coordinate a rematch, or call a good game — all inside the room.",
    delay: 0.3,
  },
  {
    title: "Global leaderboard",
    body: "Wins, draws and points tracked across every match you finish.",
    delay: 0.4,
  },
];

function Landing() {
  const { session, loading } = useSession();

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Dynamic Background Orbs */}
      <motion.div
        className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary/20 blur-[120px] pointer-events-none"
        animate={{
          x: [0, 50, 0],
          y: [0, -30, 0],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-[40%] -right-[10%] w-[40%] h-[60%] rounded-full bg-mark-o/10 blur-[120px] pointer-events-none"
        animate={{
          x: [0, -50, 0],
          y: [0, 40, 0],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />

      <SiteHeader />

      <main className="relative z-10">
        <section className="grid-backdrop border-b border-border/50">
          <div className="mx-auto w-full max-w-6xl px-4 py-24 sm:py-32">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <p className="text-eyebrow">Live multiplayer arena</p>
              <h1 className="mt-4 max-w-4xl text-5xl font-bold leading-[1.05] sm:text-7xl">
                Pick a room.
                <br />
                <span className="text-gradient">Take the match.</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg text-muted-foreground">
                GameHub is a head-to-head arena for quick matches with friends. Tic-Tac-Toe is live
                now, with real-time turns, room chat and a ranked leaderboard.
              </p>
            </motion.div>

            <motion.div
              className="mt-10 flex flex-wrap gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              {loading ? (
                <Button
                  size="lg"
                  disabled
                  className="glow-ring rounded-full px-8 opacity-50 bg-primary/20 text-primary-foreground border-transparent"
                >
                  Loading...
                </Button>
              ) : session ? (
                <>
                  <Button size="lg" className="glow-ring rounded-full px-8" asChild>
                    <Link to="/lobby">Open the lobby</Link>
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="rounded-full px-8 hover:bg-white/5"
                    asChild
                  >
                    <Link to="/leaderboard">View leaderboard</Link>
                  </Button>
                </>
              ) : (
                <Button size="lg" className="glow-ring rounded-full px-8 text-base" asChild>
                  <Link to="/auth" search={{ redirect: undefined }}>
                    Start playing
                  </Link>
                </Button>
              )}
            </motion.div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-24">
          <div className="grid gap-6 sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <motion.div
                key={feature.title}
                className="panel p-8 relative overflow-hidden group hover:border-primary/50 transition-colors"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: feature.delay }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <h2 className="text-2xl font-semibold text-foreground relative z-10">
                  {feature.title}
                </h2>
                <p className="mt-3 text-base text-muted-foreground relative z-10">{feature.body}</p>
              </motion.div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border/50 py-12 relative z-10">
        <div className="mx-auto w-full max-w-6xl px-4 text-eyebrow opacity-60">GameHub</div>
      </footer>
    </div>
  );
}
