import { PageHeader } from "@/components/layout/page-header";
import { ComingSoon } from "@/components/layout/coming-soon";

export default function Page() {
  return (
    <div>
      <PageHeader title="יועץ AI" />
      <ComingSoon title="יועץ AI" stage="שלב 10" />
    </div>
  );
}
