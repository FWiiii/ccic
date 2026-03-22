import type { ReactNode } from "react";
import "../src/assets/template/mu/static/css/sm.css";
import "../src/assets/template/mu/static/css/index.css";
import "../src/assets/template/mu/static/css/ui-new.css";
import "../src/assets/template/mu/static/css/complaints.css";
import "../src/assets/template/mu/static/css/pc-media.css";
import "../src/assets/template/mu/static/css/search.css";
import "../src/styles/app.css";
import "../src/styles/search-authen.css";
import "../src/styles/trace-notfound.css";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
