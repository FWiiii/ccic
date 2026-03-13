export type TabKey = "taba" | "tabb" | "tabc";

interface TopTabsProps {
  activeTab: TabKey;
  onChange: (tab: TabKey) => void;
}

const tabOptions: Array<{ key: TabKey; label: string }> = [
  { key: "taba", label: "浜у搧淇℃伅" },
  { key: "tabb", label: "浼佷笟淇℃伅" },
  { key: "tabc", label: "杩芥函淇℃伅" },
];

export function TopTabs({ activeTab, onChange }: TopTabsProps) {
  return (
    <div className="buttons-tab fixed-tab" data-offset="65" style={{ top: 0 }}>
      {tabOptions.map((tab) => (
        <a
          key={tab.key}
          href="#"
          className={`tab-link button tabstyle ${activeTab === tab.key ? "active" : ""}`}
          data-name={tab.key}
          onClick={(event) => {
            event.preventDefault();
            onChange(tab.key);
          }}
        >
          {tab.label}
        </a>
      ))}
    </div>
  );
}
