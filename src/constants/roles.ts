export const ROLES = {
  ADMIN: "Administrator",
  WORKER: "Worker",
  EXTERNAL: "External",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];
