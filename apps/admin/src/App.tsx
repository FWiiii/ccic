import {
  ApartmentOutlined,
  FileSearchOutlined,
  PictureOutlined,
  ShopOutlined,
} from "@ant-design/icons";
import { Refine } from "@refinedev/core";
import { ErrorComponent, ThemedLayoutV2, notificationProvider } from "@refinedev/antd";
import routerBindings, { UnsavedChangesNotifier } from "@refinedev/react-router-v6";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { LoginPage } from "./components/LoginPage";
import {
  CompaniesPage,
  InspectionsPage,
  MediaPage,
  ProductsPage,
} from "./resources/pages";
import { authProvider } from "./providers/auth-provider";
import { dataProvider, TOKEN_STORAGE_KEY } from "./providers/data-provider";

function RequireAuthLayout() {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);

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
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);

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
            label: "\u9274\u5b9a\u5355",
            icon: <FileSearchOutlined />,
          },
        },
        {
          name: "products",
          list: "/products",
          meta: {
            label: "\u5546\u54c1",
            icon: <ShopOutlined />,
          },
        },
        {
          name: "companies",
          list: "/companies",
          meta: {
            label: "\u9001\u68c0\u516c\u53f8",
            icon: <ApartmentOutlined />,
          },
        },
        {
          name: "media",
          list: "/media",
          meta: {
            label: "\u7d20\u6750\u5e93",
            icon: <PictureOutlined />,
          },
        },
      ]}
      options={{
        syncWithLocation: true,
        warnWhenUnsavedChanges: true,
      }}
    >
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

      <UnsavedChangesNotifier />
    </Refine>
  );
}