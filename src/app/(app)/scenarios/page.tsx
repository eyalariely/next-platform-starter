import { PageHeader } from "@/components/layout/page-header";
import { ComingSoon } from "@/components/layout/coming-soon";

export default function Page() {
  return (
    <div>
      <PageHeader title="תרחישים" />
      <ComingSoon title="תרחישים" stage="שלב 8" />
    </div>
  );
}
