const TOKEN_KEY = "zhuoruan_session_token";

export function getSessionToken() {
  return sessionStorage.getItem(TOKEN_KEY) || "";
}

export function setSessionToken(token) {
  if (token) sessionStorage.setItem(TOKEN_KEY, token);
  else sessionStorage.removeItem(TOKEN_KEY);
}

async function request(path, { method = "GET", body, auth = false, timeoutMs = 30_000 } = {}) {
  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth) headers.Authorization = `Bearer ${getSessionToken()}`;

  let response;
  let payload;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    response = await fetch(path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    payload = await response.json();
  } catch {
    const error = new Error(
      controller.signal.aborted ? "请求超时，请稍后重试。" : "服务器连接或响应异常，请稍后重试。",
    );
    error.status = 0;
    throw error;
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const error = new Error(payload.message || "请求失败");
    error.status = response.status;
    error.code = payload.code;
    error.payload = payload;
    throw error;
  }
  return payload;
}

function listQuery(filters = {}) {
  const params = new URLSearchParams();
  ["department", "status", "keyword", "season", "page", "pageSize"].forEach((key) => {
    const value = filters[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      params.set(key, String(value));
    }
  });
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function loginAccount(username, password) {
  return request("/api/login", { method: "POST", body: { username, password } }).then((payload) => {
    setSessionToken(payload.token);
    return payload.account;
  });
}

export async function fetchSession() {
  if (!getSessionToken()) return null;
  try {
    const payload = await request("/api/session", { auth: true });
    return payload.account;
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      setSessionToken("");
      return null;
    }
    throw error;
  }
}

export function submitRecruitment(form, submissionKey) {
  return request("/api/applications", {
    method: "POST",
    body: { ...form, ...(submissionKey ? { submissionKey } : {}) },
  }).then((payload) => payload.record);
}

export function lookupRecruitment(studentId, phone) {
  return request("/api/applications/lookup", { method: "POST", body: { studentId, phone } }).then(
    (payload) => payload.record,
  );
}

export function fetchRecruitmentPolicy() {
  return request("/api/recruitment").then((payload) => ({
    policy: payload.policy || {},
    departments: Array.isArray(payload.departments) ? payload.departments : [],
  }));
}

export async function fetchRecruitmentList(filters = {}) {
  const payload = await request(`/api/applications${listQuery(filters)}`, { auth: true });
  return {
    records: Array.isArray(payload.records) ? payload.records : [],
    total: Number(payload.total ?? 0),
    page: Number(payload.page ?? filters.page ?? 1),
    pageSize: Number(payload.pageSize ?? filters.pageSize ?? 20),
    counts: payload.counts || null,
  };
}

export function fetchRecruitmentDetail(id) {
  return request(`/api/applications/${encodeURIComponent(id)}`, { auth: true }).then((payload) => payload.record);
}

export function changeRecruitmentStatus(id, status, reviewNote, expectedVersion, interview = {}) {
  return request(`/api/applications/${encodeURIComponent(id)}`, {
    method: "PATCH",
    auth: true,
    body: { status, reviewNote, expectedVersion, ...interview },
  }).then((payload) => payload.record);
}

export function exportRecruitmentList(filters = {}) {
  return request(`/api/applications/export${listQuery(filters)}`, { auth: true }).then(
    (payload) => payload.records || [],
  );
}

export function replaceRecruitmentPhoto(id, photo, expectedVersion) {
  return request(`/api/applications/${encodeURIComponent(id)}/photo`, {
    method: "PATCH",
    auth: true,
    body: { photoData: photo.photoData, photoName: photo.photoName, expectedVersion },
  }).then((payload) => payload.record);
}

export function deleteRecruitment(id, confirm, expectedVersion) {
  return request(`/api/applications/${encodeURIComponent(id)}`, {
    method: "DELETE",
    auth: true,
    body: { confirm, expectedVersion },
  });
}

export function correctRecruitment(id, changes, expectedVersion) {
  return request(`/api/applications/${encodeURIComponent(id)}/correction`, {
    method: "PATCH",
    auth: true,
    body: { changes, expectedVersion },
  }).then((payload) => payload.record);
}

export function transferRecruitment(id, department, expectedVersion) {
  return request(`/api/applications/${encodeURIComponent(id)}/transfer`, {
    method: "PATCH",
    auth: true,
    body: { department, expectedVersion },
  }).then((payload) => payload.record);
}

export function fetchSeasons() {
  return request("/api/seasons", { auth: true });
}

export function backupRecruitmentSeason(season) {
  return request(`/api/seasons/${encodeURIComponent(season)}/backup`, {
    method: "POST",
    auth: true,
    timeoutMs: 120_000,
  });
}

export function purgeSeason(season, confirm, backupToken, downloaded) {
  return request(`/api/seasons/${encodeURIComponent(season)}/purge`, {
    method: "POST",
    auth: true,
    body: { confirm, backupToken, downloaded },
  });
}

export function changeOwnPassword(currentPassword, newPassword) {
  return request("/api/password", { method: "POST", auth: true, body: { currentPassword, newPassword } }).then(
    (payload) => payload.account,
  );
}

export function fetchStaffAccounts() {
  return request("/api/accounts", { auth: true }).then((payload) => payload.accounts || []);
}

export function createStaffAccount(account) {
  return request("/api/accounts", { method: "POST", auth: true, body: account });
}

export function resetStaffPassword(username) {
  return request(`/api/accounts/${encodeURIComponent(username)}/reset`, { method: "POST", auth: true, body: {} });
}

export function setStaffDisabled(username, disabled) {
  return request(`/api/accounts/${encodeURIComponent(username)}/status`, {
    method: "POST",
    auth: true,
    body: { disabled },
  }).then((payload) => payload.account);
}

export function logoutAccount() {
  const token = getSessionToken();
  setSessionToken("");
  if (!token) return Promise.resolve();
  return fetch("/api/logout", {
    method: "POST",
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
  }).catch(() => undefined);
}
