import { PageHeader } from "@/components/layout/page-header";
import { ComingSoon } from "@/components/layout/coming-soon";

export default function Page() {
  return (
    <div>
      <PageHeader title="תיק השקעות" />
      <ComingSoon title="תיק השקעות" stage="שלב 2" />
    </div>
  );
}
