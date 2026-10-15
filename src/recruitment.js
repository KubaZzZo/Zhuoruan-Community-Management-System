// 业务规则唯一来源。修改后运行 npm run sync:logic 更新 Node 入口。
export const ALL_DEPARTMENTS = ["实干青年部", "综合运营部", "数据算法部", "工程项目部"];
// 仅用于历史资料与原部门账号兼容，不用于新报名或调剂。
export const LEGACY_DEPARTMENTS = ["研发部", "项目部", "外联部", "组织部", "产品部"];
export const DEPARTMENTS = ALL_DEPARTMENTS.filter((department) => department !== "实干青年部");
export const STATUSES = ["待审核", "待面试", "已面试", "通过", "未通过"];
export const GENDERS = ["男", "女"];
export const POLITICAL_STATUSES = ["群众", "共青团员", "中共预备党员", "中共党员", "民主党派", "无党派人士"];
export const COLLEGES = [
  "经济学院",
  "管理学院",
  "法政学院",
  "外国语学院",
  "教育学院",
  "文学院",
  "理工学院",
  "科文学院",
];
export const REVIEW_NOTE_LIMIT = 500;
export const PHOTO_DATA_LIMIT = 450_000;
export const DEPARTMENT_PROFILES = [
  {
    name: "实干青年部",
    direct: false,
    direction: "技术中坚与传帮带",
    summary:
      "社团的技术中坚与“领头羊”，汇聚了社团内综合技术过硬、竞赛经验丰富的核心骨干，发挥“传帮带”导师与项目领航作用。",
    responsibilities: [
      {
        title: "赛事领军与攻坚",
        description:
          "带领团队征战高水平学科竞赛（如蓝桥杯、数学建模、挑战杯、iCAN等），负责赛题拆解、策略制定与难点攻克。",
      },
      {
        title: "以老带新与实战辅导",
        description: "承担“导师制”职能，指导低年级成员快速跨越技术起步期，进行代码规范纠偏、答辩演练及技术答疑。",
      },
      {
        title: "核心项目督导",
        description:
          "负责把关重点工程项目的技术架构设计、代码评审（Code Review）以及技术可行性论证，确保项目与竞赛成果高质量交付。",
      },
    ],
  },
  {
    name: "综合运营部",
    direct: true,
    direction: "资源统筹与品牌运营",
    summary: "社团运转的神经中枢与品牌窗口，统筹全社资源、对外联络与文化建设。",
    responsibilities: [
      {
        title: "行政与活动统筹",
        description: "负责社团全周期招新筹划、日常例会组织、团建活动策划以及学院层面的场地、设备申报与流程审批",
      },
      {
        title: "资产与财务管理",
        description: "规范管理社团内部资金、比赛报销、公共开发硬件与物资设备，保障各技术部门资源充沛、流转高效。",
      },
      {
        title: "品牌宣传与成果包装",
        description:
          "统筹运营公众号、校园社群等多媒体阵地，负责赛事喜报撰写、技术干货排版、人物专访及项目展板设计，持续扩大卓软的学术与组织影响力。",
      },
    ],
  },
  {
    name: "数据算法部",
    direct: true,
    direction: "算法集训与人工智能",
    summary: "专注于计算机底层思维构建、算法攻坚以及前沿 AI/数据科学技术的钻研与集训基地。",
    responsibilities: [
      {
        title: "基础算法阶梯训练",
        description:
          "系统开展编程语言基础（C++/Java/Python）、核心数据结构（树、图、线段树等）及经典算法（动态规划、贪心、搜索等）的周期性题单刷题与讲解。",
      },
      {
        title: "学科竞赛常态化集训",
        description:
          "针对蓝桥杯软件类、中国高校计算机大赛（CCCC/团体程序设计天梯赛）组织定期模拟赛、题解复盘及冲刺培训。",
      },
      {
        title: "数据与人工智能探索",
        description:
          "结合实际应用场景，开展机器学习、深度学习（如数据预测、特征工程、神经网络架构）及数学建模算法（优化模型、机理分析）的研讨与探索。",
      },
    ],
  },
  {
    name: "工程项目部",
    direct: true,
    direction: "全栈开发与项目交付",
    summary: "面向工业界标准与实际应用场景，专注全栈开发、系统构建与技术成果转化的实战工坊。",
    responsibilities: [
      {
        title: "全栈与工程化开发",
        description:
          "涵盖现代化 Web 前后端开发（如前端 Vue/React、后端 Spring Boot/微服务）、移动端应用、系统工具及接口网关的搭建与落地。",
      },
      {
        title: "软著孵化与成果沉淀",
        description:
          "依托实际工程产出，梳理系统架构、设计文档与源码，负责软件著作权（软著）申请、专利材料撰写及科研项目结题支撑。",
      },
      {
        title: "校园与校企项目交付",
        description:
          "承接学院数字化平台搭建、校园生活类实用工具开发以及校企合作真实需求，让成员完整经历“需求分析—架构设计—协同开发—测试部署”的工业级软件生命周期。",
      },
    ],
  },
];

export function isPortraitPhoto(value) {
  return (
    typeof value === "string" &&
    value.length <= PHOTO_DATA_LIMIT &&
    /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(value)
  );
}
export const FIELD_LIMITS = {
  name: 64,
  gender: 16,
  birthDate: 7,
  ethnicity: 32,
  politicalStatus: 32,
  college: 128,
  departmentMajor: 128,
  className: 128,
  studentId: 20,
  phone: 11,
  qq: 12,
  preferredDepartment: 32,
  acceptAdjustment: 8,
  strengths: 2000,
  awards: 2000,
  experience: 2000,
  careerPlan: 2000,
  photoName: 120,
};

export const FIELD_LABELS = {
  name: "姓名",
  gender: "性别",
  birthDate: "出生年月",
  ethnicity: "民族",
  politicalStatus: "政治面貌",
  college: "二级学院",
  departmentMajor: "系别",
  className: "班级",
  studentId: "学号",
  phone: "联系电话",
  qq: "QQ",
  preferredDepartment: "意向部门",
  originalDepartment: "原志愿",
  acceptAdjustment: "是否服从调剂",
  strengths: "爱好及特长",
  awards: "曾获奖项",
  experience: "任职经历",
  careerPlan: "职业规划",
  photoName: "照片文件名",
  photoData: "证件照",
  interviewAt: "面试时间",
  interviewLocation: "面试地点",
  interviewer: "面试人",
  interviewSummary: "面试结论",
  reviewNote: "审核备注",
  status: "状态",
  season: "招新季",
  createdAt: "提交时间",
};

export function applicationReceiptText(record = {}) {
  return [
    "卓软信息工作室 · 报名回执",
    `招新季：${record.season || "—"}`,
    `姓名：${record.name || "—"}`,
    `学号：${record.studentId || "—"}`,
    `意向部门：${record.preferredDepartment || "—"}`,
    `手机号：${record.phone || "—"}`,
    "",
    "请用学号和手机号查看审核与面试进度。请妥善保存，不要将含个人信息的回执发到公开群聊。",
    "报名资料提交后请留意审核进度及 QQ、电话联系。录取结果以审核和工作人员通知为准。",
  ].join("\n");
}

const INTERVIEW_LIMITS = {
  interviewAt: 40,
  interviewLocation: 80,
  interviewer: 64,
  interviewSummary: REVIEW_NOTE_LIMIT,
};

function trimValue(value) {
  return typeof value === "string" ? value.trim() : value || "";
}

export function validateApplication(data, { allowInternalDepartment = false, legacy = {} } = {}) {
  const errors = {};
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { valid: false, errors: { form: "报名信息格式不正确" } };
  }
  for (const key of [...Object.keys(FIELD_LIMITS), "photoData"]) {
    if (data[key] !== undefined && typeof data[key] !== "string")
      errors[key] = `${FIELD_LABELS[key] || "证件照"}格式不正确`;
  }
  if (Object.keys(errors).length) return { valid: false, errors };
  const requiredFields = {
    name: "姓名不能为空",
    gender: "请选择性别",
    birthDate: "请选择出生年月",
    ethnicity: "民族不能为空",
    politicalStatus: "请选择政治面貌",
    college: "请选择二级学院",
    departmentMajor: "系别不能为空",
    className: "班级不能为空",
    studentId: "学号不能为空",
    phone: "联系电话不能为空",
    qq: "QQ 不能为空",
    preferredDepartment: "请选择意向部门",
    acceptAdjustment: "请选择是否服从调剂",
    strengths: "请填写爱好及特长",
    careerPlan: "请填写职业规划",
  };

  Object.entries(requiredFields).forEach(([key, message]) => {
    if (!trimValue(data[key])) errors[key] = message;
  });

  if (trimValue(data.studentId) && !/^\d{8,20}$/.test(trimValue(data.studentId))) {
    errors.studentId = "请输入 8-20 位数字学号";
  }

  if (trimValue(data.phone) && !/^1[3-9]\d{9}$/.test(trimValue(data.phone))) {
    errors.phone = "请输入 11 位中国大陆手机号";
  }

  if (trimValue(data.qq) && !/^\d{5,12}$/.test(trimValue(data.qq))) {
    errors.qq = "请输入 5-12 位 QQ 号";
  }

  if (trimValue(data.birthDate) && !errors.birthDate) {
    const birthDate = trimValue(data.birthDate);
    const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(birthDate);
    if (!match) {
      errors.birthDate = "请选择有效的出生年月";
    } else {
      const year = Number(match[1]);
      const latestBirthYear = new Date().getFullYear() - 15;
      if (year < 1990 || year > latestBirthYear) errors.birthDate = "请填写真实的出生年月";
    }
  }

  if (trimValue(data.gender) && !GENDERS.includes(trimValue(data.gender))) {
    errors.gender = "请选择性别";
  }

  const politicalStatus = trimValue(data.politicalStatus);
  if (politicalStatus && !POLITICAL_STATUSES.includes(politicalStatus) && politicalStatus !== legacy.politicalStatus) {
    errors.politicalStatus = "请选择政治面貌";
  }

  const college = trimValue(data.college);
  if (college && !COLLEGES.includes(college) && college !== legacy.college) {
    errors.college = "请选择有效的二级学院";
  }

  if (trimValue(data.acceptAdjustment) && !["是", "否"].includes(trimValue(data.acceptAdjustment))) {
    errors.acceptAdjustment = "请选择是否服从调剂";
  }

  if (
    trimValue(data.preferredDepartment) &&
    !(allowInternalDepartment ? ALL_DEPARTMENTS : DEPARTMENTS).includes(trimValue(data.preferredDepartment)) &&
    !(
      allowInternalDepartment &&
      LEGACY_DEPARTMENTS.includes(legacy.preferredDepartment) &&
      trimValue(data.preferredDepartment) === legacy.preferredDepartment
    )
  ) {
    errors.preferredDepartment = "请选择有效的意向部门";
  }

  Object.entries(FIELD_LIMITS).forEach(([key, limit]) => {
    if (!errors[key] && trimValue(data[key]).length > limit) {
      errors[key] = `${FIELD_LABELS[key]}不能超过 ${limit} 个字`;
    }
  });

  const photoData = typeof data.photoData === "string" ? data.photoData.trim() : "";
  if (!photoData) errors.photoData = "请上传证件照";
  else if (!isPortraitPhoto(photoData)) errors.photoData = "证件照需要是清晰的 JPG 图片";

  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateInterview(data = {}) {
  const errors = {};
  for (const [key, limit] of Object.entries(INTERVIEW_LIMITS)) {
    if (data[key] === undefined) continue;
    if (typeof data[key] !== "string") errors[key] = `${FIELD_LABELS[key]}格式不正确`;
    else if (data[key].trim().length > limit) errors[key] = `${FIELD_LABELS[key]}不能超过 ${limit} 个字`;
  }
  const interviewAt = trimValue(data.interviewAt);
  if (interviewAt) {
    const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(interviewAt);
    const parts = match ? match.slice(1).map(Number) : [];
    const [year, month, day, hour, minute] = parts;
    const date = new Date(Date.UTC(year, month - 1, day, hour, minute));
    if (
      !match ||
      year < 1000 ||
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day ||
      date.getUTCHours() !== hour ||
      date.getUTCMinutes() !== minute
    ) {
      errors.interviewAt = "请选择有效的面试日期和时间（北京时间）";
    }
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

function hashString(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function createRecruitmentRecord(data, createdAt) {
  const now = createdAt || new Date().toISOString();
  const normalized = {
    name: trimValue(data.name),
    gender: trimValue(data.gender),
    birthDate: trimValue(data.birthDate),
    ethnicity: trimValue(data.ethnicity),
    politicalStatus: trimValue(data.politicalStatus),
    college: trimValue(data.college),
    departmentMajor: trimValue(data.departmentMajor),
    className: trimValue(data.className),
    studentId: trimValue(data.studentId),
    phone: trimValue(data.phone),
    qq: trimValue(data.qq),
    preferredDepartment: trimValue(data.preferredDepartment),
    acceptAdjustment: trimValue(data.acceptAdjustment),
    strengths: trimValue(data.strengths),
    awards: trimValue(data.awards),
    experience: trimValue(data.experience),
    careerPlan: trimValue(data.careerPlan),
    photoName: trimValue(data.photoName),
    photoData: typeof data.photoData === "string" ? data.photoData.trim() : "",
    interviewAt: "",
    interviewLocation: "",
    interviewer: "",
    interviewSummary: "",
    reviewNote: "",
    season: "",
    status: STATUSES.includes(data.status) ? data.status : "待审核",
    createdAt: now,
  };

  normalized.id = `ZR-${hashString(`${normalized.phone}-${normalized.qq}-${now}`)
    .toString(36)
    .toUpperCase()
    .padStart(6, "0")}`;
  return normalized;
}

export function filterApplications(records, filters = {}) {
  const keyword = trimValue(filters.keyword).toLowerCase();
  return records.filter((record) => {
    const matchesDepartment = !filters.department || record.preferredDepartment === filters.department;
    const matchesStatus = !filters.status || record.status === filters.status;
    const matchesSeason = !filters.season || record.season === filters.season || record.season === "";
    const text = [
      record.id,
      record.name,
      record.phone,
      record.qq,
      record.className,
      record.studentId,
      record.departmentMajor,
      record.preferredDepartment,
    ]
      .join(" ")
      .toLowerCase();
    return matchesDepartment && matchesStatus && matchesSeason && (!keyword || text.includes(keyword));
  });
}

export function csvCell(value, { numericText = false } = {}) {
  let text = String(value ?? "");
  if (numericText && /^\d+$/.test(text)) text = `="${text}"`;
  // Spreadsheet parsers can skip leading whitespace and control bytes before formulas.
  // eslint-disable-next-line no-control-regex
  else if (/^[\s\u0000-\u001f]*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function updateApplicationStatus(records, id, status) {
  if (!STATUSES.includes(status)) return records.slice();
  return records.map((record) => (record.id === id ? { ...record, status } : { ...record }));
}

export function recruitmentNotice(record) {
  const name = trimValue(record?.name) || "同学";
  const status = trimValue(record?.status) || "待审核";
  const lines = [
    `${name}同学你好，你的卓软信息工作室报名状态为「${status}」。`,
    `部门：${trimValue(record?.preferredDepartment) || "未分配"}`,
  ];
  if (record?.originalDepartment && record.originalDepartment !== record.preferredDepartment) {
    lines.push(`原志愿：${record.originalDepartment}`);
  }
  if (trimValue(record?.interviewAt)) lines.push(`面试时间：${trimValue(record.interviewAt).replace("T", " ")}`);
  if (trimValue(record?.interviewLocation)) lines.push(`面试地点：${trimValue(record.interviewLocation)}`);
  if (status === "待面试") lines.push("请按上面的时间参加面试，需要调整时联系本部门部长。");
  if (status === "通过") lines.push("请留意部长后续的入会通知。");
  if (status === "未通过") lines.push("感谢你的报名，欢迎继续关注社团活动。");
  return lines.join("\n");
}

export function publicStatusRecord(record) {
  const source = record && typeof record === "object" ? record : {};
  const view = {
    id: source.id,
    studentId: source.studentId,
    name: source.name,
    preferredDepartment: source.preferredDepartment,
    className: source.className,
    status: source.status,
    createdAt: source.createdAt,
    notice: recruitmentNotice(source),
  };
  const interviewAt = trimValue(source.interviewAt);
  const interviewLocation = trimValue(source.interviewLocation);
  if (interviewAt) view.interviewAt = interviewAt;
  if (interviewLocation) view.interviewLocation = interviewLocation;
  if (source.originalDepartment && source.originalDepartment !== source.preferredDepartment) {
    view.originalDepartment = source.originalDepartment;
  }
  return view;
}
