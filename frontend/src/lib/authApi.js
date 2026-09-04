// Auth helpers wrapping backend /api/auth/* endpoints.
// All calls include credentials to send/receive the session_token httpOnly cookie.
const API = process.env.REACT_APP_BACKEND_URL;

const req = async (path, opts = {}) => {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* non-JSON */ }
  if (!res.ok) {
    const detail = data?.detail;
    let msg = "Något gick fel";
    if (typeof detail === "string") msg = detail;
    else if (Array.isArray(detail)) msg = detail.map((e) => (typeof e?.msg === "string" ? e.msg : JSON.stringify(e))).join(" ");
    else if (detail && typeof detail.msg === "string") msg = detail.msg;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return data;
};

export const authRegister = (email, password, name) =>
  req("/api/auth/register", { method: "POST", body: JSON.stringify({ email, password, name }) });

export const authLogin = (email, password) =>
  req("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });

export const authGoogleExchange = (sessionId) =>
  req("/api/auth/session", { method: "POST", headers: { "X-Session-ID": sessionId } });

export const authMe = () => req("/api/auth/me");
export const authLogout = () => req("/api/auth/logout", { method: "POST" });

export const syncGet = () => req("/api/sync/state");
export const syncPut = (state) =>
  req("/api/sync/state", { method: "PUT", body: JSON.stringify({ state }) });
