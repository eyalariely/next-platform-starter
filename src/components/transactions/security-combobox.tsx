"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Search } from "lucide-react";

import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export interface SecurityOption {
  ticker: string;
  exchange: string;
  name: string;
  currency: string;
}

export function SecurityCombobox({
  name,
  defaultValue,
  required,
}: {
  /** Two hidden inputs are rendered: `${name}Ticker` and `${name}Exchange`. */
  name: string;
  defaultValue?: SecurityOption;
  required?: boolean;
}) {
  const [query, setQuery] = useState(
    defaultValue ? `${defaultValue.ticker} — ${defaultValue.name}` : "",
  );
  const [selected, setSelected] = useState<SecurityOption | null>(defaultValue ?? null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SecurityOption[]>([]);
  const debouncedQuery = useDebouncedValue(query, 300);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selected && query === `${selected.ticker} — ${selected.name}`) return;
    if (debouncedQuery.trim().length < 1) return;

    const controller = new AbortController();
    // Kicking off a network request (an external system) in response to
    // the debounced query changing, and tracking its lifecycle — the
    // canonical effect use case.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    fetch(`/api/securities/search?q=${encodeURIComponent(debouncedQuery)}`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data: { results?: SecurityOption[] }) => {
        setResults(data.results ?? []);
      })
      .catch(() => setResults([]))
      .finally(() => setLoading(false));

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search
          className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected(null);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="חיפוש לפי טיקר או שם נייר..."
          className="ps-8"
          dir="ltr"
          autoComplete="off"
        />
        {loading ? (
          <Loader2
            className="absolute end-2.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground"
            aria-hidden="true"
          />
        ) : null}
      </div>

      <input type="hidden" name={`${name}Ticker`} value={selected?.ticker ?? ""} required={required} />
      <input type="hidden" name={`${name}Exchange`} value={selected?.exchange ?? ""} />
      <input type="hidden" name={`${name}Currency`} value={selected?.currency ?? ""} />

      {open && debouncedQuery.trim().length >= 1 && (results.length > 0 || loading) ? (
        <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md">
          {results.map((option) => (
            <li key={`${option.ticker}:${option.exchange}`}>
              <button
                type="button"
                className={cn(
                  "flex w-full flex-col items-start gap-0.5 px-3 py-2 text-start text-sm hover:bg-accent",
                )}
                onClick={() => {
                  setSelected(option);
                  setQuery(`${option.ticker} — ${option.name}`);
                  setOpen(false);
                }}
              >
                <span className="ltr-numeric font-medium">{option.ticker}</span>
                <span className="text-xs text-muted-foreground">
                  {option.name} · {option.exchange} · <span className="ltr-numeric">{option.currency}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
