import type { MouseEvent } from "react";

const navigateWithoutReload = (event: MouseEvent<HTMLAnchorElement>, targetPath: string) => {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return;
  }

  event.preventDefault();

  if (window.location.pathname === targetPath) {
    return;
  }

  window.history.pushState({}, "", targetPath);
  window.dispatchEvent(new PopStateEvent("popstate"));
};

export function PageFooter() {
  return (
    <nav className="bar bar-tab">
      <p className="buttons-row endpage">
        <a
          href="/feedback"
          className="button endpage-a external indexAOne"
          onClick={(event) => navigateWithoutReload(event, "/feedback")}
        >
          <span className="endpage-span">{"\u6d88\u8d39\u53cd\u9988"}</span>
        </a>
        <a
          className="button endpage-a external indexATwo"
          href="/search"
          onClick={(event) => navigateWithoutReload(event, "/search")}
        >
          <span className="endpage-span-search ">{"\u9632\u4f2a\u67e5\u8be2"}</span>
        </a>
      </p>
    </nav>
  );
}
