import {
  ApartmentOutlined,
  BarcodeOutlined,
  FileSearchOutlined,
  LinkOutlined,
  PictureOutlined,
  ProfileOutlined,
  ShopOutlined,
} from "@ant-design/icons";
import { Refine } from "@refinedev/core";
import { ErrorComponent, ThemedLayoutV2, notificationProvider } from "@refinedev/antd";
import routerBindings, { UnsavedChangesNotifier } from "@refinedev/react-router-v6";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { LoginPage } from "./components/LoginPage";
import {
  CompaniesPage,
  MediaPage,
  ProductImagesPage,
  ProductsPage,
  TraceCodesPage,
  TraceEventsPage,
  TracePagesPage,
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
    return <Navigate to="/products" replace />;
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
            label: "\u4f01\u4e1a",
            icon: <ApartmentOutlined />,
          },
        },
        {
          name: "media",
          list: "/media",
          meta: {
            label: "\u7d20\u6750",
            icon: <PictureOutlined />,
          },
        },
        {
          name: "product-images",
          list: "/product-images",
          meta: {
            label: "\u5546\u54c1\u56fe\u7247",
            icon: <LinkOutlined />,
          },
        },
        {
          name: "trace-pages",
          list: "/trace-pages",
          meta: {
            label: "SN\u8ffd\u6eaf\u9875",
            icon: <FileSearchOutlined />,
          },
        },
        {
          name: "trace-codes",
          list: "/trace-codes",
          meta: {
            label: "\u8ffd\u6eaf\u7801",
            icon: <BarcodeOutlined />,
          },
        },
        {
          name: "trace-events",
          list: "/trace-events",
          meta: {
            label: "\u8ffd\u6eaf\u4e8b\u4ef6",
            icon: <ProfileOutlined />,
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
          <Route index element={<Navigate to="/products" replace />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/companies" element={<CompaniesPage />} />
          <Route path="/media" element={<MediaPage />} />
          <Route path="/product-images" element={<ProductImagesPage />} />
          <Route path="/trace-pages" element={<TracePagesPage />} />
          <Route path="/trace-codes" element={<TraceCodesPage />} />
          <Route path="/trace-events" element={<TraceEventsPage />} />
        </Route>

        <Route path="/login" element={<LoginRoute />} />
        <Route path="*" element={<ErrorComponent />} />
      </Routes>

      <UnsavedChangesNotifier />
    </Refine>
  );
}
