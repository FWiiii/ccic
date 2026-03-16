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
          <span className="endpage-span">{"消费反馈"}</span>
        </a>
        <a
          className="button endpage-a external indexATwo"
          href="/search"
          onClick={(event) => navigateWithoutReload(event, "/search")}
        >
          <span className="endpage-span-search ">{"防伪查询"}</span>
        </a>
      </p>
    </nav>
  );
}
