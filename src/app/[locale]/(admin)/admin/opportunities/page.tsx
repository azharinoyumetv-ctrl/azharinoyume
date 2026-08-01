import OpportunityWorkspace from "@/components/admin/OpportunityWorkspace";

type Query = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function OpportunitiesPage({ searchParams }: { searchParams: Promise<Query> }) {
  const query = await searchParams;
  return <OpportunityWorkspace view="opportunities" filters={{
    q: first(query.q),
    category: first(query.category),
    jobType: first(query.jobType),
    source: first(query.source),
    route: first(query.route),
  }} />;
}
