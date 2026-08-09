"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal } from "lucide-react";

import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/components/layout/nav-items";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const PRIMARY_ITEMS = NAV_ITEMS.filter((item) => item.primary);
const MORE_ITEMS = NAV_ITEMS.filter((item) => !item.primary);

export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isMoreActive = MORE_ITEMS.some(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex border-t bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80 md:hidden"
        aria-label="ניווט ראשי"
      >
        {PRIMARY_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2 text-xs font-medium",
                isActive ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="size-5" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            "flex flex-1 flex-col items-center gap-1 py-2 text-xs font-medium",
            isMoreActive ? "text-primary" : "text-muted-foreground",
          )}
        >
          <MoreHorizontal className="size-5" aria-hidden="true" />
          עוד
        </button>
      </nav>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="pb-6">
          <SheetHeader>
            <SheetTitle>ניווט</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-3 gap-2 px-4">
            {MORE_ITEMS.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-lg border p-3 text-xs font-medium",
                    isActive ? "border-primary text-primary" : "text-muted-foreground",
                  )}
                >
                  <Icon className="size-5" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
