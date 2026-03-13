import { useEffect, useMemo, useState } from "react";
import type {
  Company,
  MediaAsset,
  Product,
  ProductImage,
  PublishStatus,
  TraceCode,
  TraceEvent,
} from "@ccic/shared-types";

type TabKey = "products" | "productImages" | "companies" | "media" | "traces";

interface BootstrapData {
  mediaAssets: MediaAsset[];
  companies: Company[];
  products: Product[];
  productImages: ProductImage[];
  traceCodes: TraceCode[];
  traceEvents: TraceEvent[];
}

const TAB_OPTIONS: Array<{ key: TabKey; label: string }> = [
  { key: "products", label: "商品" },
  { key: "productImages", label: "商品图片" },
  { key: "companies", label: "企业" },
  { key: "media", label: "素材库" },
  { key: "traces", label: "追溯" },
];

const DEFAULT_BOOTSTRAP: BootstrapData = {
  mediaAssets: [],
  companies: [],
  products: [],
  productImages: [],
  traceCodes: [],
  traceEvents: [],
};

async function adminRequest<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers || {}),
    },
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = (await response.json()) as { data?: T; message?: string };
  if (!response.ok) {
    throw new Error(payload.message || `HTTP ${response.status}`);
  }

  return payload.data as T;
}

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem("ccic_admin_token") || "");
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [tab, setTab] = useState<TabKey>("products");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<BootstrapData>(DEFAULT_BOOTSTRAP);

  const [mediaForm, setMediaForm] = useState({ name: "", url: "", mimeType: "image/jpeg", sizeBytes: "0" });
  const [companyForm, setCompanyForm] = useState({ name: "", phone: "", address: "", logoAssetId: "" });
  const [productForm, setProductForm] = useState({
    name: "",
    companyId: "",
    brand: "",
    model: "",
    summary: "",
    productInfoHtml: "",
  });
  const [productImageForm, setProductImageForm] = useState({
    productId: "",
    assetId: "",
    scene: "CAROUSEL",
    sortOrder: "0",
  });
  const [traceCodeForm, setTraceCodeForm] = useState({ code: "", productId: "", verifyStatus: "VALID" });
  const [traceEventForm, setTraceEventForm] = useState({
    traceCodeId: "",
    title: "",
    content: "",
    eventType: "OTHER",
    eventTime: new Date().toISOString(),
  });

  const mediaMap = useMemo(() => new Map(data.mediaAssets.map((item) => [item.id, item])), [data.mediaAssets]);
  const companyMap = useMemo(() => new Map(data.companies.map((item) => [item.id, item])), [data.companies]);
  const productMap = useMemo(() => new Map(data.products.map((item) => [item.id, item])), [data.products]);

  const refresh = async () => {
    if (!token) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const bootstrap = await adminRequest<BootstrapData>("/api/admin/bootstrap", token);
      setData(bootstrap);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      void refresh();
    }
  }, [token]);

  const login = async () => {
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const payload = (await response.json()) as { data?: { token: string }; message?: string };
      if (!response.ok || !payload.data) {
        throw new Error(payload.message || "登录失败");
      }

      localStorage.setItem("ccic_admin_token", payload.data.token);
      setToken(payload.data.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败");
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("ccic_admin_token");
    setToken("");
    setData(DEFAULT_BOOTSTRAP);
  };

  const publishEntity = async (entity: "products" | "companies", id: string, status: PublishStatus) => {
    await adminRequest(`/api/admin/${entity}/${id}/publish`, token, {
      method: "POST",
      body: JSON.stringify({ status }),
    });
    await refresh();
  };

  if (!token) {
    return (
      <div className="login">
        <h1>CCIC 后台登录</h1>
        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="用户名" />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="密码"
          type="password"
        />
        <button onClick={() => void login()} disabled={loading}>
          {loading ? "登录中..." : "登录"}
        </button>
        <p className="muted">默认账号：admin / admin123</p>
        {error && <p className="error">{error}</p>}
      </div>
    );
  }

  return (
    <div className="page">
      <header className="top">
        <h1>CCIC 后台管理</h1>
        <div className="actions">
          <button className="light" onClick={() => void refresh()}>
            刷新
          </button>
          <button className="warn" onClick={logout}>
            退出
          </button>
        </div>
      </header>

      <section className="panel">
        <div className="tabs">
          {TAB_OPTIONS.map((item) => (
            <button
              key={item.key}
              className={tab === item.key ? "active" : ""}
              onClick={() => setTab(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {loading && <p className="muted">加载中...</p>}
        {error && <p className="error">{error}</p>}
        {tab === "media" && (
          <>
            <h2>素材库</h2>
            <div className="grid">
              <input
                value={mediaForm.name}
                onChange={(e) => setMediaForm((v) => ({ ...v, name: e.target.value }))}
                placeholder="名称"
              />
              <input
                value={mediaForm.url}
                onChange={(e) => setMediaForm((v) => ({ ...v, url: e.target.value }))}
                placeholder="URL"
              />
              <input
                value={mediaForm.mimeType}
                onChange={(e) => setMediaForm((v) => ({ ...v, mimeType: e.target.value }))}
                placeholder="MIME"
              />
              <input
                value={mediaForm.sizeBytes}
                onChange={(e) => setMediaForm((v) => ({ ...v, sizeBytes: e.target.value }))}
                placeholder="大小"
              />
            </div>
            <button
              onClick={async () => {
                await adminRequest("/api/admin/media", token, {
                  method: "POST",
                  body: JSON.stringify({ ...mediaForm, sizeBytes: Number(mediaForm.sizeBytes || 0) }),
                });
                setMediaForm({ name: "", url: "", mimeType: "image/jpeg", sizeBytes: "0" });
                await refresh();
              }}
            >
              新增素材
            </button>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>名称</th>
                    <th>URL</th>
                    <th>MIME</th>
                    <th>大小</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {data.mediaAssets.map((item) => (
                    <tr key={item.id}>
                      <td>{item.name}</td>
                      <td>{item.url}</td>
                      <td>{item.mimeType}</td>
                      <td>{item.sizeBytes}</td>
                      <td>
                        <button
                          className="light"
                          onClick={async () => {
                            const name = window.prompt("素材名", item.name);
                            if (!name) return;
                            await adminRequest(`/api/admin/media/${item.id}`, token, {
                              method: "PUT",
                              body: JSON.stringify({ name }),
                            });
                            await refresh();
                          }}
                        >
                          编辑
                        </button>
                        <button
                          className="warn"
                          onClick={async () => {
                            await adminRequest(`/api/admin/media/${item.id}`, token, { method: "DELETE" });
                            await refresh();
                          }}
                        >
                          删除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === "companies" && (
          <>
            <h2>企业管理</h2>
            <div className="grid">
              <input
                value={companyForm.name}
                onChange={(e) => setCompanyForm((v) => ({ ...v, name: e.target.value }))}
                placeholder="企业名称"
              />
              <input
                value={companyForm.phone}
                onChange={(e) => setCompanyForm((v) => ({ ...v, phone: e.target.value }))}
                placeholder="联系电话"
              />
              <input
                value={companyForm.address}
                onChange={(e) => setCompanyForm((v) => ({ ...v, address: e.target.value }))}
                placeholder="地址"
              />
              <select
                value={companyForm.logoAssetId}
                onChange={(e) => setCompanyForm((v) => ({ ...v, logoAssetId: e.target.value }))}
              >
                <option value="">企业LOGO(可选)</option>
                {data.mediaAssets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={async () => {
                await adminRequest("/api/admin/companies", token, {
                  method: "POST",
                  body: JSON.stringify(companyForm),
                });
                setCompanyForm({ name: "", phone: "", address: "", logoAssetId: "" });
                await refresh();
              }}
            >
              新增企业
            </button>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>名称</th>
                    <th>电话</th>
                    <th>地址</th>
                    <th>状态</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {data.companies.map((item) => (
                    <tr key={item.id}>
                      <td>{item.name}</td>
                      <td>{item.phone || "-"}</td>
                      <td>{item.address || "-"}</td>
                      <td>{item.status}</td>
                      <td>
                        <button
                          className="light"
                          onClick={async () => {
                            const name = window.prompt("企业名", item.name);
                            if (!name) return;
                            await adminRequest(`/api/admin/companies/${item.id}`, token, {
                              method: "PUT",
                              body: JSON.stringify({ name }),
                            });
                            await refresh();
                          }}
                        >
                          编辑
                        </button>
                        <button onClick={() => void publishEntity("companies", item.id, "PUBLISHED")}>发布</button>
                        <button className="light" onClick={() => void publishEntity("companies", item.id, "DRAFT")}>下线</button>
                        <button
                          className="warn"
                          onClick={async () => {
                            await adminRequest(`/api/admin/companies/${item.id}`, token, { method: "DELETE" });
                            await refresh();
                          }}
                        >
                          删除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === "products" && (
          <>
            <h2>商品管理</h2>
            <div className="grid">
              <input
                value={productForm.name}
                onChange={(e) => setProductForm((v) => ({ ...v, name: e.target.value }))}
                placeholder="商品名称"
              />
              <select
                value={productForm.companyId}
                onChange={(e) => setProductForm((v) => ({ ...v, companyId: e.target.value }))}
              >
                <option value="">所属企业</option>
                {data.companies.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              <input
                value={productForm.brand}
                onChange={(e) => setProductForm((v) => ({ ...v, brand: e.target.value }))}
                placeholder="品牌"
              />
              <input
                value={productForm.model}
                onChange={(e) => setProductForm((v) => ({ ...v, model: e.target.value }))}
                placeholder="型号"
              />
              <textarea
                value={productForm.summary}
                onChange={(e) => setProductForm((v) => ({ ...v, summary: e.target.value }))}
                placeholder="摘要"
              />
              <textarea
                value={productForm.productInfoHtml}
                onChange={(e) => setProductForm((v) => ({ ...v, productInfoHtml: e.target.value }))}
                placeholder="产品说明HTML"
              />
            </div>
            <button
              onClick={async () => {
                await adminRequest("/api/admin/products", token, {
                  method: "POST",
                  body: JSON.stringify(productForm),
                });
                setProductForm({ name: "", companyId: "", brand: "", model: "", summary: "", productInfoHtml: "" });
                await refresh();
              }}
            >
              新增商品
            </button>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>名称</th>
                    <th>品牌</th>
                    <th>企业</th>
                    <th>状态</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {data.products.map((item) => (
                    <tr key={item.id}>
                      <td>{item.name}</td>
                      <td>{item.brand || "-"}</td>
                      <td>{companyMap.get(item.companyId)?.name || "-"}</td>
                      <td>{item.status}</td>
                      <td>
                        <button
                          className="light"
                          onClick={async () => {
                            const name = window.prompt("商品名称", item.name);
                            if (!name) return;
                            await adminRequest(`/api/admin/products/${item.id}`, token, {
                              method: "PUT",
                              body: JSON.stringify({ name }),
                            });
                            await refresh();
                          }}
                        >
                          编辑
                        </button>
                        <button onClick={() => void publishEntity("products", item.id, "PUBLISHED")}>发布</button>
                        <button className="light" onClick={() => void publishEntity("products", item.id, "DRAFT")}>下线</button>
                        <button
                          className="warn"
                          onClick={async () => {
                            await adminRequest(`/api/admin/products/${item.id}`, token, { method: "DELETE" });
                            await refresh();
                          }}
                        >
                          删除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === "productImages" && (
          <>
            <h2>商品图片绑定</h2>
            <div className="grid">
              <select
                value={productImageForm.productId}
                onChange={(e) => setProductImageForm((v) => ({ ...v, productId: e.target.value }))}
              >
                <option value="">选择商品</option>
                {data.products.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              <select
                value={productImageForm.assetId}
                onChange={(e) => setProductImageForm((v) => ({ ...v, assetId: e.target.value }))}
              >
                <option value="">选择素材</option>
                {data.mediaAssets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.name}
                  </option>
                ))}
              </select>
              <select
                value={productImageForm.scene}
                onChange={(e) => setProductImageForm((v) => ({ ...v, scene: e.target.value }))}
              >
                <option value="HERO">HERO</option>
                <option value="CAROUSEL">CAROUSEL</option>
                <option value="COMPANY_DETAIL">COMPANY_DETAIL</option>
                <option value="DETAIL">DETAIL</option>
              </select>
              <input
                value={productImageForm.sortOrder}
                onChange={(e) => setProductImageForm((v) => ({ ...v, sortOrder: e.target.value }))}
                placeholder="排序"
              />
            </div>
            <button
              onClick={async () => {
                await adminRequest("/api/admin/product-images", token, {
                  method: "POST",
                  body: JSON.stringify({
                    ...productImageForm,
                    sortOrder: Number(productImageForm.sortOrder || 0),
                  }),
                });
                setProductImageForm({ productId: "", assetId: "", scene: "CAROUSEL", sortOrder: "0" });
                await refresh();
              }}
            >
              新增绑定
            </button>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>商品</th>
                    <th>素材</th>
                    <th>场景</th>
                    <th>排序</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {data.productImages.map((item) => (
                    <tr key={item.id}>
                      <td>{productMap.get(item.productId)?.name || "-"}</td>
                      <td>{mediaMap.get(item.assetId)?.name || "-"}</td>
                      <td>{item.scene}</td>
                      <td>{item.sortOrder}</td>
                      <td>
                        <button
                          className="warn"
                          onClick={async () => {
                            await adminRequest(`/api/admin/product-images/${item.id}`, token, { method: "DELETE" });
                            await refresh();
                          }}
                        >
                          删除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === "traces" && (
          <>
            <h2>追溯码</h2>
            <div className="grid">
              <input
                value={traceCodeForm.code}
                onChange={(e) => setTraceCodeForm((v) => ({ ...v, code: e.target.value }))}
                placeholder="追溯码"
              />
              <select
                value={traceCodeForm.productId}
                onChange={(e) => setTraceCodeForm((v) => ({ ...v, productId: e.target.value }))}
              >
                <option value="">绑定商品</option>
                {data.products.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              <select
                value={traceCodeForm.verifyStatus}
                onChange={(e) => setTraceCodeForm((v) => ({ ...v, verifyStatus: e.target.value }))}
              >
                <option value="VALID">VALID</option>
                <option value="INVALID">INVALID</option>
                <option value="EXPIRED">EXPIRED</option>
                <option value="REVOKED">REVOKED</option>
              </select>
            </div>
            <button
              onClick={async () => {
                await adminRequest("/api/admin/trace-codes", token, {
                  method: "POST",
                  body: JSON.stringify(traceCodeForm),
                });
                setTraceCodeForm({ code: "", productId: "", verifyStatus: "VALID" });
                await refresh();
              }}
            >
              新增追溯码
            </button>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>追溯码</th>
                    <th>商品</th>
                    <th>状态</th>
                    <th>查询次数</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {data.traceCodes.map((item) => (
                    <tr key={item.id}>
                      <td>{item.code}</td>
                      <td>{productMap.get(item.productId)?.name || "-"}</td>
                      <td>{item.verifyStatus}</td>
                      <td>{item.verifyCount}</td>
                      <td>
                        <button
                          className="light"
                          onClick={async () => {
                            const next = window.prompt("状态", item.verifyStatus);
                            if (!next) return;
                            await adminRequest(`/api/admin/trace-codes/${item.id}`, token, {
                              method: "PUT",
                              body: JSON.stringify({ verifyStatus: next }),
                            });
                            await refresh();
                          }}
                        >
                          编辑
                        </button>
                        <button
                          className="warn"
                          onClick={async () => {
                            await adminRequest(`/api/admin/trace-codes/${item.id}`, token, { method: "DELETE" });
                            await refresh();
                          }}
                        >
                          删除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h2>追溯事件</h2>
            <div className="grid">
              <select
                value={traceEventForm.traceCodeId}
                onChange={(e) => setTraceEventForm((v) => ({ ...v, traceCodeId: e.target.value }))}
              >
                <option value="">选择追溯码</option>
                {data.traceCodes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.code}
                  </option>
                ))}
              </select>
              <input
                value={traceEventForm.title}
                onChange={(e) => setTraceEventForm((v) => ({ ...v, title: e.target.value }))}
                placeholder="标题"
              />
              <input
                value={traceEventForm.content}
                onChange={(e) => setTraceEventForm((v) => ({ ...v, content: e.target.value }))}
                placeholder="内容"
              />
              <input
                value={traceEventForm.eventType}
                onChange={(e) => setTraceEventForm((v) => ({ ...v, eventType: e.target.value }))}
                placeholder="类型"
              />
              <input
                value={traceEventForm.eventTime}
                onChange={(e) => setTraceEventForm((v) => ({ ...v, eventTime: e.target.value }))}
                placeholder="时间 ISO"
              />
            </div>
            <button
              onClick={async () => {
                await adminRequest("/api/admin/trace-events", token, {
                  method: "POST",
                  body: JSON.stringify(traceEventForm),
                });
                setTraceEventForm({ traceCodeId: "", title: "", content: "", eventType: "OTHER", eventTime: new Date().toISOString() });
                await refresh();
              }}
            >
              新增事件
            </button>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>追溯码</th>
                    <th>标题</th>
                    <th>内容</th>
                    <th>时间</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {data.traceEvents.map((item) => (
                    <tr key={item.id}>
                      <td>{data.traceCodes.find((code) => code.id === item.traceCodeId)?.code || "-"}</td>
                      <td>{item.title}</td>
                      <td>{item.content || "-"}</td>
                      <td>{item.eventTime}</td>
                      <td>
                        <button
                          className="warn"
                          onClick={async () => {
                            await adminRequest(`/api/admin/trace-events/${item.id}`, token, { method: "DELETE" });
                            await refresh();
                          }}
                        >
                          删除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
