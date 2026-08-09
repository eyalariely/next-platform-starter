import Link from "next/link";
import { UserRound } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogoutMenuItem } from "@/components/layout/logout-button";

function initials(name?: string | null, email?: string | null) {
  if (name) {
    return name
      .split(" ")
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("");
  }
  return email?.[0]?.toUpperCase() ?? "?";
}

export function UserMenu({
  name,
  email,
}: {
  name?: string | null;
  email?: string | null;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-md p-1.5 outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/50">
        <Avatar className="size-8">
          <AvatarFallback>{initials(name, email)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col">
          <span className="font-medium">{name ?? "משתמש"}</span>
          <span className="text-muted-foreground ltr-numeric text-start text-xs font-normal">
            {email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <UserRound />
            פרופיל והגדרות
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <LogoutMenuItem />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
