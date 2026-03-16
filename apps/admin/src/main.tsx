import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App as AntdApp, ConfigProvider } from "antd";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "antd/dist/reset.css";
import "./app.css";

const adminTheme = {
  token: {
    colorPrimary: "#0b6cff",
    colorText: "#1f2937",
    colorTextSecondary: "#64748b",
    colorBgLayout: "#f3f6fb",
    colorBgContainer: "#ffffff",
    colorBorder: "#e2e8f0",
    borderRadius: 10,
    borderRadiusLG: 14,
    controlHeight: 38,
    fontFamily:
      '"PingFang SC", "Microsoft YaHei", "Noto Sans SC", "Helvetica Neue", Arial, sans-serif',
  },
  components: {
    Layout: {
      bodyBg: "#f3f6fb",
      headerBg: "#ffffff",
      siderBg: "#0f172a",
      triggerBg: "#0f172a",
      triggerColor: "#f8fafc",
    },
    Menu: {
      darkItemBg: "transparent",
      darkSubMenuItemBg: "transparent",
      darkItemSelectedBg: "rgba(255, 255, 255, 0.2)",
      darkItemSelectedColor: "#ffffff",
      darkItemColor: "rgba(226, 232, 240, 0.92)",
      itemBorderRadius: 10,
      itemHeight: 42,
    },
    Table: {
      headerBg: "#f8fafc",
      headerColor: "#334155",
      rowHoverBg: "#f8fbff",
      borderColor: "#e2e8f0",
    },
    Modal: {
      borderRadiusLG: 14,
    },
    Card: {
      borderRadiusLG: 14,
    },
    Button: {
      borderRadius: 10,
    },
    Input: {
      activeBorderColor: "#0b6cff",
      hoverBorderColor: "#7fb0ff",
    },
    Select: {
      optionSelectedBg: "#e8f1ff",
    },
  },
} as const;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <ConfigProvider theme={adminTheme}>
        <AntdApp>
          <App />
        </AntdApp>
      </ConfigProvider>
    </BrowserRouter>
  </StrictMode>
);
