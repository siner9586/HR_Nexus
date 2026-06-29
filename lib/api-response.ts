import { NextResponse } from "next/server";

export type ApiErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "VALIDATION_ERROR"
  | "PLAN_LIMIT_EXCEEDED"
  | "BILLING_ERROR"
  | "INTERNAL_ERROR";

export type ApiEnvelope<T> =
  | { success: true; data: T; message: string; requestId: string }
  | { success: false; error: { code: ApiErrorCode; message: string }; requestId: string };

export function requestId() {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function ok<T>(data: T, init?: { message?: string; requestId?: string; status?: number }) {
  return NextResponse.json<ApiEnvelope<T>>(
    {
      success: true,
      data,
      message: init?.message ?? "ok",
      requestId: init?.requestId ?? requestId(),
    },
    { status: init?.status ?? 200 },
  );
}

export function fail(
  code: ApiErrorCode,
  message: string,
  init?: { requestId?: string; status?: number },
) {
  const status =
    init?.status ??
    ({
      BAD_REQUEST: 400,
      VALIDATION_ERROR: 422,
      UNAUTHORIZED: 401,
      FORBIDDEN: 403,
      NOT_FOUND: 404,
      CONFLICT: 409,
      PLAN_LIMIT_EXCEEDED: 402,
      BILLING_ERROR: 402,
      INTERNAL_ERROR: 500,
    } satisfies Record<ApiErrorCode, number>)[code];

  return NextResponse.json<ApiEnvelope<never>>(
    { success: false, error: { code, message }, requestId: init?.requestId ?? requestId() },
    { status },
  );
}

export function paginationFromUrl(url: URL) {
  const page = Math.max(Number(url.searchParams.get("page") ?? "1"), 1);
  const pageSize = Math.min(Math.max(Number(url.searchParams.get("pageSize") ?? "20"), 1), 100);
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}
