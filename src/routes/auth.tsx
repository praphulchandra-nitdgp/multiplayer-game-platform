import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Only allow same-origin relative paths. Rejects "//evil.com" and "/\evil.com".
function isSafeRedirect(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.startsWith("/\\")
  );
}

// Prefer the error code when the installed supabase-js provides it; fall back to message text.
function isEmailNotConfirmed(error: { message: string }): boolean {
  const code = (error as { code?: string }).code;
  if (code === "email_not_confirmed") return true;
  const message = error.message.toLowerCase();
  return message.includes("email not confirmed") || message.includes("email is not verified");
}

function isInvalidCredentials(error: { message: string }): boolean {
  return error.message.toLowerCase().includes("invalid login credentials");
}

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => {
    const value = search["redirect"];
    return {
      redirect: isSafeRedirect(value) ? value : undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "Sign in — GameHub" },
      { name: "description", content: "Sign in to GameHub to create rooms and play live matches." },
      { property: "og:title", content: "Sign in — GameHub" },
      {
        property: "og:description",
        content: "Sign in to GameHub to create rooms and play live matches.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { session, loading } = useSession();
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [loginUsername, setLoginUsername] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);

  const goToDestination = () => navigate({ to: redirect ?? "/lobby", replace: true });

  useEffect(() => {
    if (!loading && session) {
      goToDestination();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, session, redirect, navigate]);

  async function handleSignIn(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);

    const { data: authEmail, error: usernameError } = await supabase.rpc(
      "get_auth_email_by_username",
      { lookup_username: loginUsername.trim() },
    );

    if (usernameError || !authEmail) {
      setBusy(false);
      toast.error("Invalid username or password.");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password,
    });
    setBusy(false);

    if (error) {
      if (isEmailNotConfirmed(error)) {
        toast.error(
          "Your email is not confirmed yet. Please check your inbox for the confirmation link.",
        );
      } else if (isInvalidCredentials(error)) {
          toast.error("Invalid username or password. New accounts must confirm their email first.");
      } else {
        toast.error(error.message);
      }
      return;
    }

    toast.success("Signed in successfully!");
    goToDestination();
  }

  async function handleSignUp(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    const trimmedEmail = email.trim();
    const trimmedUsername = username.trim();

    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth`,
        data: { username: trimmedUsername, display_name: trimmedUsername },
      },
    });

    if (error) {
      setBusy(false);
      toast.error(error.message);
      return;
    }

    // Supabase returns an empty identities array when the email already exists.
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      setBusy(false);
      toast.error("An account with this email already exists. Please sign in instead.");
      return;
    }

    if (data.session) {
      setBusy(false);
      toast.success("Account created successfully!");
      goToDestination();
      return;
    }

    setBusy(false);
    toast.success(
      "Account created successfully! Please check your email to confirm your account before signing in.",
      { duration: 7000 },
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="grid-backdrop">
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md items-center px-4 py-12">
          <div className="panel w-full p-6">
            <p className="text-eyebrow">GameHub access</p>
            <h1 className="mt-2 text-2xl font-bold">Enter the arena</h1>

            <Tabs defaultValue="signin" className="mt-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Create account</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-username">Username</Label>
                    <Input
                      id="signin-username"
                      type="text"
                      required
                      value={loginUsername}
                      onChange={(e) => setLoginUsername(e.target.value)}
                      autoComplete="username"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={busy}>
                    Sign in
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-username">Player name</Label>
                    <Input
                      id="signup-username"
                      required
                      minLength={2}
                      maxLength={24}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="ace_01"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={busy}>
                    Create account
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
}