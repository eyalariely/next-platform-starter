import { notFound } from "next/navigation";

import { getSecurityByTicker } from "@/services/security.service";
import { PageHeader } from "@/components/layout/page-header";
import { ComingSoon } from "@/components/layout/coming-soon";
import { Numeric } from "@/components/ui/numeric";

export default async function SecurityPage({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker } = await params;
  const security = await getSecurityByTicker(ticker);

  if (!security) {
    notFound();
  }

  return (
    <div>
      <PageHeader
        title={security.name}
        description={
          `${security.exchange} · ${security.currency}`
        }
      />
      <p className="mb-6 text-sm text-muted-foreground">
        <Numeric>{security.ticker}</Numeric>
      </p>
      <ComingSoon
        title="ניתוח נייר מלא (מחיר, ביצועים, תרומה לתיק, נתונים פונדמנטליים)"
        stage="שלב 3–4"
      />
    </div>
  );
}
