import { redirect } from "next/navigation";

// Authenticated users land on the dashboard; unauthenticated users never
// reach this point — middleware redirects them to /login first.
export default function RootPage() {
  redirect("/dashboard");
}
