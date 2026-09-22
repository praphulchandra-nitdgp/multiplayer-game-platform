import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { fetchLeaderboard, fetchProfiles } from "@/lib/api";
import { useSession, useUserId } from "@/hooks/useSession";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Your profile — GameHub" },
      { name: "description", content: "Update your GameHub player name and review your record." },
      { property: "og:title", content: "Your profile — GameHub" },
      {
        property: "og:description",
        content: "Update your GameHub player name and review your record.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const userId = useUserId();
  const { session } = useSession();
  const queryClient = useQueryClient();

  const profile = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => (userId ? ((await fetchProfiles([userId]))[userId] ?? null) : null),
    enabled: Boolean(userId),
  });

  const standings = useQuery({ queryKey: ["leaderboard"], queryFn: fetchLeaderboard });
  const myRow = (standings.data ?? []).find((row) => row.user_id === userId);

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");

  useEffect(() => {
    if (profile.data) {
      setDisplayName(profile.data.display_name);
      setUsername(profile.data.username);
    }
  }, [profile.data]);

  const save = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Not signed in.");
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: displayName.trim() || username.trim(),
          username: username.trim().toLowerCase(),
        })
        .eq("id", userId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Profile updated.");
      queryClient.invalidateQueries({ queryKey: ["profile", userId] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const stats = [
    { label: "Played", value: myRow?.games_played ?? 0 },
    { label: "Wins", value: myRow?.wins ?? 0 },
    { label: "Draws", value: myRow?.draws ?? 0 },
    { label: "Points", value: myRow?.points ?? 0 },
  ];

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <p className="text-eyebrow">Player</p>
      <h1 className="mt-2 text-3xl font-bold">Your profile</h1>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="panel p-4">
            <p className="text-eyebrow">{stat.label}</p>
            <p className="mt-2 font-display text-3xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="panel mt-6 p-6">
        <h2 className="text-xl font-semibold">Details</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Signed in as {session?.user.email ?? "your account"}.
        </p>

        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            save.mutate();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="display-name">Display name</Label>
            <Input
              id="display-name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              maxLength={32}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="username">Handle</Label>
            <Input
              id="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              maxLength={24}
              pattern="[a-zA-Z0-9_]+"
              required
            />
            <p className="text-xs text-muted-foreground">
              Letters, numbers and underscores. Must be unique.
            </p>
          </div>
          <Button type="submit" disabled={save.isPending}>
            Save changes
          </Button>
        </form>
      </div>
    </main>
  );
}
