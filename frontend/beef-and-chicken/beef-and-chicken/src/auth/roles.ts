export const AppRoles = {
  Admin: "Admin",
  Customer: "Customer",
  Employee: "Employee",
  Courier: "Courier",
} as const;

export type AppRole = (typeof AppRoles)[keyof typeof AppRoles];
