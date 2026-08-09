"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { BENCHMARKS } from "@/lib/financial/benchmark-config";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function BenchmarkSelector({ activeKey }: { activeKey: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(key: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("benchmark", key);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <Select value={activeKey} onValueChange={handleChange}>
      <SelectTrigger className="w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {BENCHMARKS.map((b) => (
          <SelectItem key={b.key} value={b.key}>
            {b.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
