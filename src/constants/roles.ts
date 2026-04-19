const ROLES = {
  ADMIN: "Administrator",
  WORKER: "Worker",
  EXTERNAL: "External",
};

type Role = (typeof ROLES)[keyof typeof ROLES];

export { ROLES };
export type { Role };
