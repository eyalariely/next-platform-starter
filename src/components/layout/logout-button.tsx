import { LogOut } from "lucide-react";

import { signOut } from "@/lib/auth";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

export function LogoutMenuItem() {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/login" });
      }}
      className="contents"
    >
      <DropdownMenuItem asChild variant="destructive">
        <button type="submit" className="w-full">
          <LogOut />
          התנתקות
        </button>
      </DropdownMenuItem>
    </form>
  );
}
