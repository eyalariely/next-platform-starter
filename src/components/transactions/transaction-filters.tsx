"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState } from "react";

import { TRANSACTION_TYPES, TRANSACTION_TYPE_LABELS } from "@/components/transactions/transaction-type-labels";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL = "ALL";

export function TransactionFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("search") ?? "");

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== ALL) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-muted-foreground">סוג עסקה</label>
        <Select value={searchParams.get("type") ?? ALL} onValueChange={(v) => updateParam("type", v)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>כל הסוגים</SelectItem>
            {TRANSACTION_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {TRANSACTION_TYPE_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="dateFrom" className="text-xs text-muted-foreground">מתאריך</label>
        <Input
          id="dateFrom"
          type="date"
          dir="ltr"
          className="w-40"
          defaultValue={searchParams.get("dateFrom") ?? ""}
          onChange={(e) => updateParam("dateFrom", e.target.value || null)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="dateTo" className="text-xs text-muted-foreground">עד תאריך</label>
        <Input
          id="dateTo"
          type="date"
          dir="ltr"
          className="w-40"
          defaultValue={searchParams.get("dateTo") ?? ""}
          onChange={(e) => updateParam("dateTo", e.target.value || null)}
        />
      </div>

      <form
        className="flex flex-col gap-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          updateParam("search", search || null);
        }}
      >
        <label htmlFor="search" className="text-xs text-muted-foreground">חיפוש</label>
        <div className="flex gap-2">
          <Input
            id="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="טיקר, שם או הערה..."
            className="w-48"
          />
          <Button type="submit" variant="outline">
            חיפוש
          </Button>
        </div>
      </form>

      {searchParams.toString() ? (
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setSearch("");
            const params = new URLSearchParams();
            const portfolioId = searchParams.get("portfolioId");
            if (portfolioId) params.set("portfolioId", portfolioId);
            router.push(`${pathname}?${params.toString()}`);
          }}
        >
          נקה סינון
        </Button>
      ) : null}
    </div>
  );
}
