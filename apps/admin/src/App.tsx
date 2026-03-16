import {
  ApartmentOutlined,
  FileSearchOutlined,
  PictureOutlined,
  ShopOutlined,
} from "@ant-design/icons";
import { Suspense, lazy } from "react";
import { Refine } from "@refinedev/core";
import { ErrorComponent, ThemedLayoutV2, notificationProvider } from "@refinedev/antd";
import { Spin } from "antd";
import routerBindings, { UnsavedChangesNotifier } from "@refinedev/react-router-v6";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { authProvider } from "./providers/auth-provider";
import { dataProvider, readAuthToken } from "./providers/data-provider";

const LoginPage = lazy(() =>
  import("./components/LoginPage").then((module) => ({ default: module.LoginPage }))
);
const InspectionsPage = lazy(() =>
  import("./resources/pages").then((module) => ({ default: module.InspectionsPage }))
);
const ProductsPage = lazy(() =>
  import("./resources/pages").then((module) => ({ default: module.ProductsPage }))
);
const CompaniesPage = lazy(() =>
  import("./resources/pages").then((module) => ({ default: module.CompaniesPage }))
);
const MediaPage = lazy(() =>
  import("./resources/pages").then((module) => ({ default: module.MediaPage }))
);

const routeFallback = (
  <div style={{ display: "grid", placeItems: "center", minHeight: "40vh" }}>
    <Spin size="large" />
  </div>
);

function RequireAuthLayout() {
  const token = readAuthToken();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <ThemedLayoutV2>
      <Outlet />
    </ThemedLayoutV2>
  );
}

function LoginRoute() {
  const token = readAuthToken();

  if (token) {
    return <Navigate to="/inspections" replace />;
  }

  return <LoginPage />;
}

export default function App() {
  return (
    <Refine
      routerProvider={routerBindings}
      dataProvider={dataProvider}
      authProvider={authProvider}
      notificationProvider={notificationProvider}
      resources={[
        {
          name: "inspections",
          list: "/inspections",
          meta: {
            label: "鉴定单",
            icon: <FileSearchOutlined />,
          },
        },
        {
          name: "products",
          list: "/products",
          meta: {
            label: "商品",
            icon: <ShopOutlined />,
          },
        },
        {
          name: "companies",
          list: "/companies",
          meta: {
            label: "送检公司",
            icon: <ApartmentOutlined />,
          },
        },
        {
          name: "media",
          list: "/media",
          meta: {
            label: "素材库",
            icon: <PictureOutlined />,
          },
        },
      ]}
      options={{
        syncWithLocation: true,
        warnWhenUnsavedChanges: true,
      }}
    >
      <Suspense fallback={routeFallback}>
        <Routes>
          <Route element={<RequireAuthLayout />}>
            <Route index element={<Navigate to="/inspections" replace />} />
            <Route path="/inspections" element={<InspectionsPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/companies" element={<CompaniesPage />} />
            <Route path="/media" element={<MediaPage />} />
          </Route>

          <Route path="/login" element={<LoginRoute />} />
          <Route path="*" element={<ErrorComponent />} />
        </Routes>
      </Suspense>

      <UnsavedChangesNotifier />
    </Refine>
  );
}
