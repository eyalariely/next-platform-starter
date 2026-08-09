import { auth } from "@/lib/auth";
import { listPortfoliosForUser, resolveActivePortfolio } from "@/services/portfolio.service";
import { PageHeader } from "@/components/layout/page-header";
import { NoPortfolioEmptyState } from "@/components/portfolio/no-portfolio-empty-state";
import { ImportWizard } from "@/components/transactions/import-wizard";

export default async function ImportTransactionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const session = await auth();
  const userId = session!.user.id;

  const portfolios = await listPortfoliosForUser(userId);
  if (portfolios.length === 0) {
    return (
      <div>
        <PageHeader title="ייבוא עסקאות" />
        <NoPortfolioEmptyState />
      </div>
    );
  }

  const portfolio = await resolveActivePortfolio(userId, params.portfolioId);
  if (!portfolio) {
    return (
      <div>
        <PageHeader title="ייבוא עסקאות" />
        <NoPortfolioEmptyState />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="ייבוא עסקאות" description={`ייבוא ל: ${portfolio.name}`} />
      <ImportWizard portfolioId={portfolio.id} />
    </div>
  );
}
