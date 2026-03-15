import {
  ApartmentOutlined,
  FileSearchOutlined,
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
  InspectionEventsPage,
  InspectionImagesPage,
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
            label: "鉴定单",
            icon: <FileSearchOutlined />,
          },
        },
        {
          name: "inspection-images",
          list: "/inspection-images",
          meta: {
            label: "检测图片",
            icon: <PictureOutlined />,
          },
        },
        {
          name: "inspection-events",
          list: "/inspection-events",
          meta: {
            label: "检测轨迹",
            icon: <ProfileOutlined />,
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
            label: "素材",
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
          <Route path="/inspection-images" element={<InspectionImagesPage />} />
          <Route path="/inspection-events" element={<InspectionEventsPage />} />
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
