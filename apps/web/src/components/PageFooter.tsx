import React from "react";
import Link from "next/link";

export function PageFooter() {
  return (
    <nav className="bar bar-tab">
      <p className="buttons-row endpage">
        <Link
          href="/feedback"
          className="button endpage-a external indexAOne"
        >
          <span className="endpage-span">{"消费反馈"}</span>
        </Link>
        <Link
          className="button endpage-a external indexATwo"
          href="/search"
        >
          <span className="endpage-span-search ">{"防伪查询"}</span>
        </Link>
      </p>
    </nav>
  );
}
