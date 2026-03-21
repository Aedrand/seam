const NAME_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

export function validateName(name: string): boolean {
  return NAME_PATTERN.test(name);
}

export class SeamError extends Error {
  code: string;
  data?: Record<string, unknown>;

  constructor(code: string, message: string, data?: Record<string, unknown>) {
    super(message);
    this.code = code;
    this.data = data;
  }
}
