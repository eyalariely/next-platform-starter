"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function PortfolioSwitcher({
  portfolios,
  activeId,
}: {
  portfolios: { id: string; name: string; baseCurrency: string }[];
  activeId: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (portfolios.length <= 1) return null;

  function handleChange(portfolioId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("portfolioId", portfolioId);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <Select value={activeId} onValueChange={handleChange}>
      <SelectTrigger className="w-56">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {portfolios.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            {p.name} <span className="ltr-numeric text-muted-foreground">({p.baseCurrency})</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
