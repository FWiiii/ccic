export function PageFooter() {
  return (
    <nav className="bar bar-tab">
      <p className="buttons-row endpage">
        <a href="/feedback" className="button endpage-a external indexAOne">
          <span className="endpage-span">{"\u6d88\u8d39\u53cd\u9988"}</span>
        </a>
        <a className="button endpage-a external indexATwo" href="/search">
          <span className="endpage-span-search ">{"\u9632\u4f2a\u67e5\u8be2"}</span>
        </a>
      </p>
    </nav>
  );
}
