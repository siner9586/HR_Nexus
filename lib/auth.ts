import { compare, hash } from "bcryptjs";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, type SystemRole } from "./constants";
import { prisma } from "./db";
import { unauthorized } from "./errors";
import type { AuthUser } from "./permissions";
import { roleFromCode, uniquePermissions } from "./permissions";

const encoder = new TextEncoder();

function secret() {
  return encoder.encode(process.env.NEXTAUTH_SECRET || "development-secret-change-me");
}

export async function hashPassword(password: string) {
  return hash(password, 12);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return compare(password, passwordHash);
}

export async function createSessionToken(userId: string) {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
}

export async function verifySessionToken(token: string) {
  const result = await jwtVerify(token, secret());
  return String(result.payload.sub ?? "");
}

export async function setSessionCookie(userId: string) {
  const token = await createSessionToken(userId);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return token;
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getUserById(userId: string): Promise<AuthUser | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { userRoles: { include: { role: { include: { rolePermissions: { include: { permission: true } } } } } } },
  });
  if (!user || user.status !== "ACTIVE") return null;
  const roleCodes = user.userRoles
    .map((userRole) => roleFromCode(userRole.role.code))
    .filter(Boolean) as SystemRole[];
  const dbPermissions = user.userRoles.flatMap((userRole) =>
    userRole.role.rolePermissions.map((rolePermission) => rolePermission.permission.code),
  );
  const permissions = Array.from(new Set([...uniquePermissions(roleCodes), ...dbPermissions])) as AuthUser["permissions"];
  return {
    id: user.id,
    tenantId: user.tenantId,
    employeeId: user.employeeId,
    name: user.name,
    email: user.email,
    roles: roleCodes,
    permissions,
  };
}

export async function getCurrentUser(request?: NextRequest): Promise<AuthUser | null> {
  const token = request?.cookies.get(SESSION_COOKIE)?.value ?? (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const userId = await verifySessionToken(token);
    if (!userId) return null;
    return getUserById(userId);
  } catch {
    return null;
  }
}

export async function requireCurrentUser(request?: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) throw unauthorized();
  return user;
}
