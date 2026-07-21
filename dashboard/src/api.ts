const BASE = "/api";

export interface Permission {
  resource: string;
  action: string;
}

export interface Me {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  created_at: string;
  permissions: Permission[];
}

export interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  created_at: string;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown; token?: string | null } = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (options.token) headers["Authorization"] = `Bearer ${options.token}`;

  const resp = await fetch(`${BASE}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  if (!resp.ok) {
    let detail = resp.statusText;
    try {
      const data = await resp.json();
      if (typeof data.detail === "string") detail = data.detail;
    } catch {
      /* keep statusText */
    }
    throw new ApiError(resp.status, detail);
  }
  return resp.json() as Promise<T>;
}

export interface Item {
  id: string;
  sku: string;
  name: string;
  category: string | null;
  unit: string | null;
  price: number;
  reorder_level: number;
  is_spare: boolean;
  is_tool: boolean;
  description: string | null;
  image_path: string | null;
}

export interface Warehouse {
  id: string;
  name: string;
  location: string | null;
}

export interface StockLevel {
  item_id: string;
  sku: string;
  item_name: string;
  warehouse_id: string;
  warehouse_name: string;
  quantity: number;
  reorder_level: number;
  below_reorder: boolean;
}

export interface StockMove {
  id: string;
  sku: string;
  item_name: string;
  warehouse_name: string;
  quantity: number;
  move_type: string;
  created_by_name: string;
  created_at: string;
}

export interface ServiceJob {
  id: string;
  customer_name: string;
  machine_id: string | null;
  machine_name: string | null;
  assigned_technician_id: string;
  technician_name: string;
  status: "open" | "in_progress" | "completed" | "billed";
  description: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface Technician {
  id: string;
  name: string;
}

export interface JobPart {
  id: string;
  item_id: string;
  sku: string;
  item_name: string;
  unit: string | null;
  quantity: number;
}

export const api = {
  login: (email: string, password: string) =>
    request<{ access_token: string }>("/auth/login", {
      method: "POST",
      body: { email, password },
    }),
  me: (token: string) => request<Me>("/auth/me", { token }),
  listUsers: (token: string) => request<UserRow[]>("/users", { token }),
  createUser: (
    token: string,
    body: { name: string; email: string; password: string; role: string },
  ) => request<UserRow>("/users", { method: "POST", body, token }),
  setUserActive: (token: string, id: string, active: boolean) =>
    request<UserRow>(`/users/${id}`, {
      method: "PATCH",
      body: { active },
      token,
    }),

  listItems: (token: string) => request<Item[]>("/items", { token }),
  createItem: (token: string, body: Partial<Item>) =>
    request<Item>("/items", { method: "POST", body, token }),
  listWarehouses: (token: string) => request<Warehouse[]>("/warehouses", { token }),
  createWarehouse: (token: string, body: { name: string; location?: string }) =>
    request<Warehouse>("/warehouses", { method: "POST", body, token }),
  listStock: (token: string) => request<StockLevel[]>("/stock", { token }),
  adjustStock: (
    token: string,
    body: {
      item_id: string;
      warehouse_id: string;
      move_type: "in" | "out";
      quantity: number;
    },
  ) => request<StockLevel>("/stock/adjust", { method: "POST", body, token }),
  transferStock: (
    token: string,
    body: {
      item_id: string;
      from_warehouse_id: string;
      to_warehouse_id: string;
      quantity: number;
    },
  ) => request<StockLevel[]>("/stock/transfer", { method: "POST", body, token }),
  listStockMoves: (token: string) => request<StockMove[]>("/stock/moves", { token }),

  listServiceJobs: (token: string) => request<ServiceJob[]>("/service-jobs", { token }),
  createServiceJob: (
    token: string,
    body: {
      customer_name: string;
      assigned_technician_id: string;
      description?: string;
    },
  ) => request<ServiceJob>("/service-jobs", { method: "POST", body, token }),
  updateServiceJob: (
    token: string,
    id: string,
    body: Partial<{
      customer_name: string;
      assigned_technician_id: string;
      description: string;
      status: string;
    }>,
  ) => request<ServiceJob>(`/service-jobs/${id}`, { method: "PATCH", body, token }),
  listTechnicians: (token: string) =>
    request<Technician[]>("/service-jobs/technicians", { token }),
  listJobParts: (token: string, jobId: string) =>
    request<JobPart[]>(`/service-jobs/${jobId}/parts`, { token }),
  addJobPart: (
    token: string,
    jobId: string,
    body: { item_id: string; warehouse_id: string; quantity: number },
  ) => request<JobPart>(`/service-jobs/${jobId}/parts`, { method: "POST", body, token }),
};
