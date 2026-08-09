import { auth } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  // Middleware already enforces the redirect; this is a defensive fallback
  // in case the layout is ever reached without a session (e.g. expired
  // token race).
  const user = session?.user ?? { name: null, email: null };

  return <AppShell user={user}>{children}</AppShell>;
}
