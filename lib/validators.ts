import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const registerSchema = z.object({
  companyName: z.string().min(2),
  industry: z.string().min(1),
  companySize: z.string().min(1),
  contactName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(8),
});

export const employeeCreateSchema = z.object({
  name: z.string().min(2),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  departmentId: z.string().optional(),
  positionId: z.string().optional(),
  employmentType: z.string().optional(),
  hireDate: z.string().optional(),
});

export const checkoutSchema = z.object({
  planCode: z.enum(["STANDARD", "PROFESSIONAL", "ENTERPRISE"]),
  interval: z.enum(["month", "year"]).default("month"),
});
