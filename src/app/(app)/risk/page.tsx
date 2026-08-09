import { PageHeader } from "@/components/layout/page-header";
import { ComingSoon } from "@/components/layout/coming-soon";

export default function Page() {
  return (
    <div>
      <PageHeader title="סיכון" />
      <ComingSoon title="סיכון" stage="שלב 5-6" />
    </div>
  );
}
