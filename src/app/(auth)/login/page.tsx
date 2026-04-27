"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Sparkles, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { APP_NAME, APP_TAGLINE } from "@/lib/utils/constants";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-slate-500">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await signIn("credentials", { email, password, redirect: false, callbackUrl });
    setLoading(false);
    if (!res || res.error) {
      setError("Invalid credentials. Try the demo credentials below.");
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  function quickFill(e: string) {
    setEmail(e);
    setPassword("nicheiq123");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-24 top-1/3 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -right-24 bottom-1/4 h-96 w-96 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.05),transparent)]" />
      </div>

      <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-2">
        <div className="hidden flex-col justify-between lg:flex">
          <div className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="h-5 w-5" />
            </span>
            {APP_NAME}
          </div>
          <div>
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl">
              Find what's already
              <br />
              selling. Build it next.
            </h1>
            <p className="mt-6 max-w-md text-base text-slate-400">
              {APP_TAGLINE}. Real-time signals across Etsy, Gumroad, Notion, KDP, Kaggle, Flippa & 30 more sources, scored
              for build effort, demand, and revenue.
            </p>
            <div className="mt-10 grid grid-cols-3 gap-6 text-sm text-slate-400">
              <div>
                <div className="text-2xl font-semibold text-white">38+</div>
                sources tracked
              </div>
              <div>
                <div className="text-2xl font-semibold text-white">7</div>
                Brain modes
              </div>
              <div>
                <div className="text-2xl font-semibold text-white">5×</div>
                scoring dimensions
              </div>
            </div>
          </div>
          <div className="text-xs text-slate-600">© NicheIQ · v0.1 build/skeleton</div>
        </div>

        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-2xl">Sign in</CardTitle>
            <CardDescription>Use your team email or pick a demo account below.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="andrei@nicheiq.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              {error ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Signing in…
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>

            <div className="mt-6 rounded-md border border-slate-800 bg-slate-950/60 p-3 text-xs">
              <div className="mb-2 font-medium text-slate-300">Demo credentials (mock mode)</div>
              <ul className="space-y-1 text-slate-400">
                {[
                  ["andrei@nicheiq.com", "admin"],
                  ["editor@nicheiq.com", "editor"],
                  ["viewer@nicheiq.com", "viewer"],
                  ["demo@nicheiq.com", "viewer"],
                ].map(([e, role]) => (
                  <li key={e} className="flex items-center justify-between">
                    <button
                      type="button"
                      className="text-left text-slate-300 hover:text-primary hover:underline"
                      onClick={() => quickFill(e!)}
                    >
                      {e}
                    </button>
                    <span className="text-[10px] uppercase tracking-wide text-slate-500">{role}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-2 text-[11px] text-slate-500">
                Password for all demo accounts: <code className="rounded bg-slate-800 px-1">nicheiq123</code>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
