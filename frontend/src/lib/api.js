// Small wrapper around backend endpoints. All calls go through REACT_APP_BACKEND_URL.
const API = process.env.REACT_APP_BACKEND_URL;

if (!API) {
  // eslint-disable-next-line no-console
  console.error("REACT_APP_BACKEND_URL is not set – file uploads will fail.");
}

export const uploadFile = async (file) => {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${API}/api/uploads`, { method: "POST", body: fd });
  if (!res.ok) {
    let msg = "Uppladdning misslyckades";
    try {
      const err = await res.json();
      if (err && err.detail) msg = err.detail;
    } catch { /* ignore */ }
    throw new Error(msg);
  }
  const data = await res.json();
  // Return a shape the planner can persist directly.
  return {
    fileId: data.id,
    name: data.name,
    url: `${API}${data.url}`, // absolute URL so <iframe>/<img>/<a> work everywhere
    isFile: true,
    mimeType: data.content_type,
    size: data.size,
  };
};

export const deleteFile = async (fileId) => {
  if (!fileId) return;
  try {
    await fetch(`${API}/api/files/${fileId}`, { method: "DELETE" });
  } catch { /* soft-fail: file record stays in storage but planner reference is removed */ }
};
