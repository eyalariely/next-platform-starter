import { PageHeader } from "@/components/layout/page-header";
import { ComingSoon } from "@/components/layout/coming-soon";

export default function Page() {
  return (
    <div>
      <PageHeader title="אחזקות" />
      <ComingSoon title="אחזקות" stage="שלב 3" />
    </div>
  );
}
