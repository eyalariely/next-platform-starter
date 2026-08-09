import { PageHeader } from "@/components/layout/page-header";
import { ComingSoon } from "@/components/layout/coming-soon";

export default function Page() {
  return (
    <div>
      <PageHeader title="תוכנית השקעה" />
      <ComingSoon title="תוכנית השקעה" stage="שלב 9" />
    </div>
  );
}
