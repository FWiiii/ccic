import { SearchPage } from "../../src/views/SearchPage";

export const dynamic = "force-dynamic";

interface SearchRouteProps {
  searchParams?: {
    code?: string | string[];
  };
}

const normalizeQueryValue = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) {
    return String(value[0] ?? "").trim();
  }

  return String(value ?? "").trim();
};

export default function SearchRoutePage({ searchParams }: SearchRouteProps) {
  return <SearchPage expectedCode={normalizeQueryValue(searchParams?.code)} />;
}
