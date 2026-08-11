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
  kind?: string;
  assigned_user_id?: string | null;
}

export interface StockLevel {
  item_id: string;
  sku: string;
  item_name: string;
  warehouse_id: string;
  warehouse_name: string;
  warehouse_kind?: string;
  quantity: number;
  reorder_level: number;
  below_reorder: boolean;
}

export interface ImportContainer {
  id: string;
  code: string;
  origin: string | null;
  port: string | null;
  supplier: string | null;
  eta_port: string | null;
  status: string;
  milestone: string | null;
  value_inr: number;
  delay_days: number;
  machine_count: number;
  notes: string | null;
  created_at: string;
}

export interface ProjectRow {
  id: string;
  code: string;
  customer_name: string;
  city: string | null;
  stage: string;
  boq_value: number;
  margin_pct: number;
  target_install: string | null;
  status: string;
  created_at: string;
}

export interface ReceivableRow {
  id: string;
  party_name: string;
  amount: number;
  due_date: string | null;
  days_overdue: number;
  status: string;
  source: string;
}

export interface MachinePassport {
  id: string;
  name: string;
  category: string | null;
  qr_code: string | null;
  risk_score: number;
  risk_reason: string;
  service_job_count: number;
  open_job_count: number;
  parts_value: number;
  city: string | null;
  customer_name: string | null;
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

export interface ReportSummary {
  stock: {
    total_items: number;
    total_warehouses: number;
    total_stock_value: number;
    low_stock: {
      sku: string;
      name: string;
      total_quantity: number;
      reorder_level: number;
    }[];
    moves_last_7_days: number;
  } | null;
  service: {
    jobs_by_status: Record<string, number>;
    open_by_technician: { technician_name: string; open_jobs: number }[];
    avg_completion_hours: number | null;
    parts_used_value: number;
  } | null;
  financial: {
    billed_jobs: number;
    billed_parts_value: number;
    stock_value: number;
  } | null;
  people: {
    active_users: number;
    users_by_role: Record<string, number>;
  } | null;
}

export interface CeoSnapshot {
  generated_at: string;
  financial: {
    stock_capital: number;
    billed_jobs: number;
    billed_parts_value: number;
    website_gmv_all: number;
    website_gmv_30d: number;
    website_gmv_7d: number;
    pending_order_value: number;
    confirmed_not_synced_value: number;
    pipeline_value: number;
  };
  operational: {
    open_service_jobs: number;
    in_progress_jobs: number;
    completed_jobs: number;
    billed_jobs: number;
    service_completion_rate_pct: number | null;
    avg_completion_hours: number | null;
    parts_used_value: number;
    low_stock_skus: number;
    stock_moves_7d: number;
    website_orders_pending: number;
    website_orders_30d: number;
    demo_bookings_pending: number;
    demo_bookings_30d: number;
    active_users: number;
    van_low_stock_skus?: number;
    stock_main_value?: number;
    stock_van_value?: number;
  };
  receivables?: {
    overdue_total: number;
    overdue_count: number;
    bucket_0_30: number;
    bucket_31_60: number;
    bucket_60_plus: number;
    upcoming_total: number;
  } | null;
  imports?: {
    total: number;
    delayed_or_hold: number;
    on_water: number;
    value_at_risk: number;
  } | null;
  projects?: {
    active_count: number;
    pipeline_boq_value: number;
    lowest_margin_pct: number | null;
    lowest_margin_customer: string | null;
  } | null;
  maintenance?: {
    elevated_count: number;
    top_risks: { machinery_id: string; name: string; risk_score: number; reason: string }[];
  } | null;
  service_map?: { city: string; open_jobs: number; type: string }[];
  series_14d: {
    day: string;
    website_orders: number;
    website_gmv: number;
    service_jobs_opened: number;
    stock_moves: number;
  }[];
  risks: {
    id: string;
    severity: string;
    category: string;
    title: string;
    detail: string;
    metric: number | null;
    action_hint: string | null;
  }[];
  predictions: {
    id: string;
    horizon: string;
    title: string;
    estimate: string;
    confidence: string;
    basis: string;
  }[];
  insights: {
    id: string;
    tone: string;
    title: string;
    body: string;
  }[];
  health_score: number;
  tally: {
    gateway_reachable: boolean;
    pending_push_count: number;
    failed_push_count: number;
    last_push_at: string | null;
  };
}

export interface AiQueryResponse {
  answer: string;
  resources_used: string[];
  financial_included: boolean;
}

export interface WebsiteOrderItem {
  id: string;
  item_id: string;
  sku: string;
  item_name: string;
  quantity: number;
  price_at_order: number;
}

export interface WebsiteOrder {
  id: string;
  customer_name: string;
  email: string;
  phone: string | null;
  status: "pending" | "confirmed" | "synced_to_tally";
  created_at: string;
  items: WebsiteOrderItem[];
  total: number;
}

export interface TallyStatus {
  gateway_reachable: boolean;
  pending_push_count: number;
  synced_order_count: number;
  failed_push_count: number;
  last_push_at: string | null;
}

export interface TallySyncLogEntry {
  id: string;
  direction: "to_tally" | "from_tally";
  entity_type: string;
  entity_id: string;
  status: "success" | "failed" | "payment_received";
  error_message: string | null;
  synced_at: string;
}

export interface AuditEntry {
  id: string;
  user_id: string | null;
  user_name: string | null;
  action: "create" | "update" | "delete";
  resource: string;
  resource_id: string;
  ip_address: string | null;
  payload_snapshot: Record<string, unknown> | null;
  created_at: string;
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
  createWarehouse: (
    token: string,
    body: { name: string; location?: string; kind?: string; assigned_user_id?: string },
  ) => request<Warehouse>("/warehouses", { method: "POST", body, token }),
  listImportContainers: (token: string) =>
    request<ImportContainer[]>("/imports/containers", { token }),
  createImportContainer: (token: string, body: Partial<ImportContainer>) =>
    request<ImportContainer>("/imports/containers", { method: "POST", body, token }),
  listProjects: (token: string) => request<ProjectRow[]>("/projects", { token }),
  createProject: (token: string, body: Partial<ProjectRow>) =>
    request<ProjectRow>("/projects", { method: "POST", body, token }),
  listReceivables: (token: string) => request<ReceivableRow[]>("/receivables", { token }),
  listMachinePassports: (token: string) =>
    request<MachinePassport[]>("/machinery/passports", { token }),
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

  reportSummary: (token: string) =>
    request<ReportSummary>("/reports/summary", { token }),

  reportCeo: (token: string) => request<CeoSnapshot>("/reports/ceo", { token }),

  aiQuery: (
    token: string,
    body: { question: string; include_financial?: boolean },
  ) =>
    request<AiQueryResponse>("/ai-query", {
      method: "POST",
      body: {
        question: body.question,
        include_financial: body.include_financial ?? true,
      },
      token,
    }),

  listWebsiteOrders: (token: string, status?: string) =>
    request<WebsiteOrder[]>(
      `/website/orders${status ? `?status_filter=${status}` : ""}`,
      { token },
    ),
  confirmWebsiteOrder: (token: string, orderId: string, warehouseId: string) =>
    request<WebsiteOrder>(`/website/orders/${orderId}/confirm`, {
      method: "POST",
      body: { warehouse_id: warehouseId },
      token,
    }),
  tallyStatus: (token: string) => request<TallyStatus>("/tally/status", { token }),
  tallySyncLog: (token: string) =>
    request<TallySyncLogEntry[]>("/tally/sync-log", { token }),
  tallyPushOrder: (token: string, orderId: string) =>
    request<TallySyncLogEntry>(`/tally/push/orders/${orderId}`, {
      method: "POST",
      token,
    }),
  tallyPullPayments: (token: string) =>
    request<TallySyncLogEntry[]>("/tally/pull-payments", {
      method: "POST",
      token,
    }),

  listAudit: (token: string, filters: { resource?: string; action?: string } = {}) => {
    const params = new URLSearchParams();
    if (filters.resource) params.set("resource", filters.resource);
    if (filters.action) params.set("action", filters.action);
    const qs = params.toString();
    return request<AuditEntry[]>(`/audit${qs ? `?${qs}` : ""}`, { token });
  },
};
