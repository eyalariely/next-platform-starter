import { PageHeader } from "@/components/layout/page-header";
import { ComingSoon } from "@/components/layout/coming-soon";

export default function Page() {
  return (
    <div>
      <PageHeader title="אופטימיזציה" />
      <ComingSoon title="אופטימיזציה" stage="שלב 8" />
    </div>
  );
}
