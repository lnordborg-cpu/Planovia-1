// Client helpers for the /api/share/week endpoints.
const API = process.env.REACT_APP_BACKEND_URL;

const SHARES_KEY = "planovia_week_shares_v1";
// Local store of {token, revoke_secret, expires_at, label, key} so we can revoke
// links even from guest sessions (no backend account).

const readStore = () => {
  try {
    return JSON.parse(localStorage.getItem(SHARES_KEY) || "{}");
  } catch {
    return {};
  }
};

const writeStore = (obj) => {
  try {
    localStorage.setItem(SHARES_KEY, JSON.stringify(obj));
  } catch { /* ignore */ }
};

export const getStoredShareForKey = (key) => {
  const s = readStore();
  const entry = s[key];
  if (!entry) return null;
  // Auto-clean if expired.
  if (entry.expires_at && new Date(entry.expires_at).getTime() < Date.now()) {
    delete s[key];
    writeStore(s);
    return null;
  }
  return entry;
};

export const storeShare = (key, entry) => {
  const s = readStore();
  s[key] = entry;
  writeStore(s);
};

export const removeStoredShare = (key) => {
  const s = readStore();
  delete s[key];
  writeStore(s);
};

export const createWeekShare = async ({ weekData, label, key }) => {
  const res = await fetch(`${API}/api/share/week`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ week_data: weekData, label }),
  });
  if (!res.ok) {
    let msg = "Kunde inte skapa delningslänk";
    try { const j = await res.json(); if (j.detail) msg = j.detail; } catch { /* ignore */ }
    throw new Error(msg);
  }
  const data = await res.json();
  storeShare(key, {
    token: data.token,
    revoke_secret: data.revoke_secret,
    expires_at: data.expires_at,
    created_at: data.created_at,
    label: data.label,
  });
  return data;
};

export const revokeWeekShare = async ({ token, revoke_secret, key }) => {
  const res = await fetch(`${API}/api/share/week/${token}`, {
    method: "DELETE",
    headers: revoke_secret ? { "X-Revoke-Secret": revoke_secret } : {},
    credentials: "include",
  });
  if (res.ok || res.status === 404) {
    if (key) removeStoredShare(key);
    return true;
  }
  let msg = "Kunde inte återkalla länken";
  try { const j = await res.json(); if (j.detail) msg = j.detail; } catch { /* ignore */ }
  throw new Error(msg);
};

export const fetchSharedWeek = async (token) => {
  const res = await fetch(`${API}/api/share/week/${token}`);
  if (res.status === 404) throw new Error("not_found");
  if (res.status === 410) throw new Error("expired");
  if (!res.ok) throw new Error("fetch_failed");
  return res.json();
};

export const buildShareUrl = (token) => {
  // Use the current origin (works both in preview + production).
  return `${window.location.origin}/vikarie/${token}`;
};
