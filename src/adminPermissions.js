export const ADMIN_ROLES = {
  SUPER_ADMIN: "super_admin",
  DEPARTMENT_LEAD: "department_lead",
  REVIEWER: "reviewer",
};

export const ADMIN_MENUS = [
  {
    key: "applications",
    label: "报名审核",
    roles: [ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.DEPARTMENT_LEAD, ADMIN_ROLES.REVIEWER],
  },
  {
    key: "members",
    label: "成员管理",
    roles: [ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.DEPARTMENT_LEAD],
  },
  {
    key: "settings",
    label: "系统设置",
    roles: [ADMIN_ROLES.SUPER_ADMIN],
  },
];

export function canAccessMenu(role, menuKey) {
  const menu = ADMIN_MENUS.find((item) => item.key === menuKey);
  return Boolean(menu && menu.roles.includes(role));
}

export function getMenusForRole(role) {
  return ADMIN_MENUS.filter((menu) => menu.roles.includes(role));
}
