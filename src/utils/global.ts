const trim = (value: string) => value.trim();

const trimOptional = (value?: string | null) => {
  const trimmed = value?.trim();
  return trimmed ?? null;
};

const toValidDate = (value?: string | Date | null) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error) return error.message;
  return fallback;
};

export { trim, trimOptional, toValidDate, getErrorMessage };
