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
  gender: z.enum(["MALE", "FEMALE", "UNKNOWN"]).default("UNKNOWN"),
  birthDate: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().min(6).optional(),
  idType: z.string().default("ID_CARD"),
  idNumber: z.string().optional(),
  nationality: z.string().optional(),
  ethnicity: z.string().optional(),
  maritalStatus: z.string().optional(),
  avatarUrl: z.string().url().optional().or(z.literal("")),
  employeeNo: z.string().optional(),
  companyId: z.string().optional(),
  departmentId: z.string().optional(),
  positionId: z.string().optional(),
  managerId: z.string().optional(),
  workLocation: z.string().optional(),
  costCenterId: z.string().optional(),
  level: z.string().optional(),
  grade: z.string().optional(),
  employmentStatus: z.string().optional(),
  employmentType: z.string().optional(),
  hireDate: z.string().optional(),
  probationEndDate: z.string().optional(),
  regularizationDate: z.string().optional(),
  leaveDate: z.string().optional(),
  address: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactRelation: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  educationLevel: z.string().optional(),
  school: z.string().optional(),
  major: z.string().optional(),
  graduationDate: z.string().optional(),
  bankName: z.string().optional(),
  bankAccount: z.string().optional(),
  salaryStructureId: z.string().optional(),
  baseSalary: z.coerce.number().optional(),
  probationSalary: z.coerce.number().optional(),
});

export const demoRequestSchema = z.object({
  name: z.string().min(2),
  company: z.string().min(2),
  phone: z.string().max(50).optional(),
  email: z.string().email(),
  employeeCount: z.string().max(50).optional(),
  message: z.string().max(2000).optional(),
});
