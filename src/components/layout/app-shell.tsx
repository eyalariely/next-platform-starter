import Link from "next/link";
import { ChartCandlestick } from "lucide-react";

import { SidebarNav } from "@/components/layout/sidebar-nav";
import { MobileNav } from "@/components/layout/mobile-nav";
import { UserMenu } from "@/components/layout/user-menu";

export function AppShell({
  user,
  children,
}: {
  user: { name?: string | null; email?: string | null };
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-e bg-card md:flex">
        <div className="flex h-14 items-center gap-2 border-b px-4">
          <ChartCandlestick className="size-5 text-primary" aria-hidden="true" />
          <span className="font-semibold">Smart Folio</span>
        </div>
        <SidebarNav />
      </aside>

      <div className="flex min-h-full flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/80">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold md:hidden">
            <ChartCandlestick className="size-5 text-primary" aria-hidden="true" />
            Smart Folio
          </Link>
          <span className="hidden text-sm text-muted-foreground md:inline" />
          <UserMenu name={user.name} email={user.email} />
        </header>

        <main className="flex-1 p-4 pb-20 md:p-6 md:pb-6">{children}</main>

        <footer className="hidden border-t px-6 py-3 text-xs text-muted-foreground md:block">
          המערכת מספקת כלי ניתוח ותמיכה בקבלת החלטות ואינה מהווה ייעוץ השקעות.
        </footer>
      </div>

      <MobileNav />
    </div>
  );
}
