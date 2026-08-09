"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import { cn } from "@/lib/utils";

export function SortableHeader({
  label,
  sortKey,
  defaultDir = "asc",
  className,
}: {
  label: string;
  sortKey: string;
  defaultDir?: "asc" | "desc";
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeSortBy = searchParams.get("sortBy");
  const activeSortDir = searchParams.get("sortDir") as "asc" | "desc" | null;
  const isActive = activeSortBy === sortKey;

  function handleClick() {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sortBy", sortKey);
    if (isActive) {
      params.set("sortDir", activeSortDir === "asc" ? "desc" : "asc");
    } else {
      params.set("sortDir", defaultDir);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  const Icon = !isActive ? ArrowUpDown : activeSortDir === "asc" ? ArrowUp : ArrowDown;

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "inline-flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground",
        isActive && "text-foreground",
        className,
      )}
    >
      {label}
      <Icon className="size-3.5" aria-hidden="true" />
    </button>
  );
}
