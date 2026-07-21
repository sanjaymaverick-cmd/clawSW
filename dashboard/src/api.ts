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
};
