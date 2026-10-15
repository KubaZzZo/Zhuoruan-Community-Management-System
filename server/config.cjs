function numberSetting(env, key, fallback, min, max) {
  const value = env[key] === undefined || env[key] === "" ? fallback : Number(env[key]);
  if (!Number.isInteger(value) || value < min || value > max) throw new Error(`${key} 必须是 ${min}-${max} 之间的整数`);
  return value;
}

function booleanSetting(env, key, fallback) {
  const value = env[key] === undefined || env[key] === "" ? fallback : env[key];
  if (!["true", "false"].includes(value)) throw new Error(`${key} 必须是 true 或 false`);
  return value === "true";
}

function seasonSetting(env) {
  const value = env.RECRUITMENT_SEASON || "2026";
  if (!/^[A-Za-z0-9_-]{1,32}$/.test(value)) {
    throw new Error("RECRUITMENT_SEASON 只能包含字母、数字、下划线和短横线");
  }
  return value;
}

function loadRecruitmentConfig(env = process.env) {
  const enabled = env.RECRUITMENT_ENABLED ?? "true";
  if (!["true", "false"].includes(enabled)) throw new Error("RECRUITMENT_ENABLED 必须是 true 或 false");
  function timestamp(key) {
    const value = env[key] || "";
    if (!value) return "";
    // Explicit zone keeps administrator and students' deadline interpretation identical.
    if (!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value) || !Number.isFinite(Date.parse(value))) {
      throw new Error(`${key} 必须是带时区的 ISO 日期，例如 2026-10-31T23:59:59+08:00`);
    }
    return new Date(value).toISOString();
  }
  const opensAt = timestamp("RECRUITMENT_OPENS_AT");
  const closesAt = timestamp("RECRUITMENT_CLOSES_AT");
  if (opensAt && closesAt && Date.parse(opensAt) >= Date.parse(closesAt))
    throw new Error("报名开始时间必须早于截止时间");
  return {
    enabled: enabled === "true",
    opensAt,
    closesAt,
    season: seasonSetting(env),
    retentionDays: numberSetting(env, "RECRUITMENT_RETENTION_DAYS", 180, 1, 3650),
    sessionTtlMs: numberSetting(env, "SESSION_TTL_MINUTES", 120, 5, 1440) * 60_000,
    submissionIpLimit: numberSetting(env, "SUBMISSION_IP_LIMIT", 600, 10, 10000),
    lookupIpLimit: numberSetting(env, "LOOKUP_IP_LIMIT", 1800, 30, 10000),
    trustProxy: booleanSetting(env, "TRUST_PROXY", "false"),
  };
}

function publicPolicy(config, now = Date.now()) {
  const beforeOpening = config.opensAt && now < Date.parse(config.opensAt);
  const afterClosing = config.closesAt && now >= Date.parse(config.closesAt);
  const isOpen = config.enabled && !beforeOpening && !afterClosing;
  const message = !config.enabled
    ? "本季报名暂未开放。"
    : beforeOpening
      ? "报名尚未开始。"
      : afterClosing
        ? "本季报名已截止。"
        : "报名正在开放。";
  return {
    isOpen: Boolean(isOpen),
    opensAt: config.opensAt,
    closesAt: config.closesAt,
    message,
    retentionDays: config.retentionDays,
    season: config.season,
  };
}

module.exports = { loadRecruitmentConfig, publicPolicy };
