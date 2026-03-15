import { useEffect, useMemo, useState } from "react";

const readSnFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get("sn")?.trim() ?? "";
};

const readPathnameFromUrl = () => window.location.pathname;

const isSearchPath = (pathname: string) => pathname === "/search" || pathname.startsWith("/search/");

const isFeedbackPath = (pathname: string) => pathname === "/feedback" || pathname.startsWith("/feedback/");

export function useRouteType() {
  const [querySn, setQuerySn] = useState(() => readSnFromUrl());
  const [pathname, setPathname] = useState(() => readPathnameFromUrl());

  useEffect(() => {
    const onPopState = () => {
      setQuerySn(readSnFromUrl());
      setPathname(readPathnameFromUrl());
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const isSearchPage = useMemo(() => isSearchPath(pathname), [pathname]);
  const isFeedbackPage = useMemo(() => isFeedbackPath(pathname), [pathname]);

  return {
    querySn,
    pathname,
    isSearchPage,
    isFeedbackPage,
  };
}