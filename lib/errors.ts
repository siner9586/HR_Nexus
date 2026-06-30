import type { ApiErrorCode } from "./api-response";

export class AppError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message: string,
    public readonly status = 400,
  ) {
    super(message);
  }
}

export function unauthorized(message = "请先登录") {
  return new AppError("UNAUTHORIZED", message, 401);
}

export function forbidden(message = "无权限操作") {
  return new AppError("FORBIDDEN", message, 403);
}

export function notFound(message = "资源不存在") {
  return new AppError("NOT_FOUND", message, 404);
}
