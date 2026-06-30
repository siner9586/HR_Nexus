import {
  PrismaClient,
  type AuditAction,
  type Company,
  type ContractTemplate,
  type CostCenter,
  type Department,
  type Employee,
  type Position,
} from "@prisma/client";
import { hash } from "bcryptjs";
import {
  DEMO_PASSWORD,
  PERMISSIONS,
  PLATFORM_ADMIN_PASSWORD,
  ROLE_LABELS,
  ROLE_PERMISSIONS,
  SYSTEM_ROLES,
  type SystemRole,
} from "../lib/constants";

const prisma = new PrismaClient();

const now = new Date();
const day = 24 * 60 * 60 * 1000;

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * day);
}

function monthKey(offset = 0) {
  const date = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

function phone(index: number) {
  return `138${String(10000000 + index).slice(-8)}`;
}

function idMasked(index: number) {
  return `340***********${String(1000 + index).slice(-4)}`;
}

function sample<T>(items: readonly T[], index: number) {
  return items[index % items.length];
}

async function resetDemoData() {
  const demoSlugs = ["anhui-demo", "hefei-manufacturing-demo"];
  const demoEmails = [
    "admin@platform.local",
    "owner@demo.com",
    "tenant.admin@demo.com",
    "hrd@demo.com",
    "hr@demo.com",
    "payroll@demo.com",
    "finance@demo.com",
    "manager@demo.com",
    "employee@demo.com",
    "auditor@demo.com",
    "owner@manufacturing-demo.com",
  ];

  await prisma.auditLog.deleteMany({ where: { OR: [{ tenant: { slug: { in: demoSlugs } } }, { actorUserId: null }] } });
  await prisma.user.deleteMany({ where: { email: { in: demoEmails } } });
  await prisma.role.deleteMany({ where: { tenantId: null, code: "PLATFORM_ADMIN" } });
  await prisma.tenant.deleteMany({ where: { slug: { in: demoSlugs } } });
}

async function seedPermissionsAndRoles(tenantId: string | null) {
  for (const code of PERMISSIONS) {
    const [module, action] = code.split(".");
    await prisma.permission.upsert({
      where: { code },
      update: { module, action, description: code },
      create: { code, module, action, description: code },
    });
  }

  const roles = new Map<SystemRole, string>();
  for (const roleCode of SYSTEM_ROLES) {
    if (tenantId === null && roleCode !== "PLATFORM_ADMIN") continue;
    if (tenantId !== null && roleCode === "PLATFORM_ADMIN") continue;
    const role = await prisma.role.create({
      data: {
        tenantId,
        code: roleCode,
        name: ROLE_LABELS[roleCode],
        description: ROLE_LABELS[roleCode],
        isSystem: true,
      },
    });
    roles.set(roleCode, role.id);

    const permissionRows = await prisma.permission.findMany({
      where: { code: { in: [...(ROLE_PERMISSIONS[roleCode] ?? [])] } },
      select: { id: true },
    });
    await prisma.rolePermission.createMany({
      data: permissionRows.map((permission) => ({ roleId: role.id, permissionId: permission.id })),
      skipDuplicates: true,
    });
    await prisma.dataScope.create({
      data: {
        roleId: role.id,
        scopeType:
          roleCode === "EMPLOYEE"
            ? "SELF"
            : roleCode === "DEPARTMENT_MANAGER"
              ? "DEPARTMENT_AND_CHILDREN"
              : "ALL",
      },
    });
  }
  return roles;
}

async function createUser(input: {
  tenantId: string | null;
  employeeId?: string | null;
  email: string;
  password: string;
  name: string;
  phone?: string | null;
  roleId: string;
}) {
  const user = await prisma.user.create({
    data: {
      tenantId: input.tenantId,
      employeeId: input.employeeId ?? null,
      email: input.email,
      passwordHash: await hash(input.password, 12),
      name: input.name,
      phone: input.phone ?? null,
      status: "ACTIVE",
    },
  });
  await prisma.userRole.create({ data: { userId: user.id, roleId: input.roleId } });
  return user;
}

async function seedTenant(input: {
  name: string;
  slug: string;
  industry: string;
  companySize: string;
  employeeCount: number;
}) {
  const tenant = await prisma.tenant.create({
    data: {
      name: input.name,
      slug: input.slug,
      industry: input.industry,
      companySize: input.companySize,
      contactName: input.slug === "anhui-demo" ? "王总" : "李总",
      contactEmail: input.slug === "anhui-demo" ? "owner@demo.com" : "owner@manufacturing-demo.com",
      contactPhone: "13800000000",
      status: "ACTIVE",
      settings: {
        create: {
          payrollEnabled: true,
          recruitmentEnabled: true,
          performanceEnabled: true,
          trainingEnabled: true,
          aiEnabled: false,
        },
      },
    },
  });

  const roles = await seedPermissionsAndRoles(tenant.id);

  const companies: Company[] = [];
  for (const name of [
    input.name,
    input.slug === "anhui-demo" ? "安徽智企科技合肥分公司" : "合肥制造示范一厂",
    input.slug === "anhui-demo" ? "安徽智企科技六安分公司" : "合肥制造示范二厂",
  ]) {
    companies.push(
      await prisma.company.create({
        data: {
          tenantId: tenant.id,
          name,
          legalName: name,
          creditCode: `91340100${Math.random().toString().slice(2, 10)}`,
          province: "安徽省",
          city: name.includes("六安") ? "六安" : "合肥",
          address: "安徽省合肥市高新区创新大道 88 号",
        },
      }),
    );
  }

  const costCenters: CostCenter[] = [];
  for (const name of [
    "总部管理成本中心",
    "研发成本中心",
    "销售成本中心",
    "客户成功成本中心",
    "制造成本中心",
    "合肥分公司成本中心",
    "六安分公司成本中心",
  ]) {
    costCenters.push(
      await prisma.costCenter.create({
        data: {
          tenantId: tenant.id,
          name,
          code: name
            .replace("成本中心", "")
            .split("")
            .map((char) => char.charCodeAt(0).toString(36))
            .join("")
            .slice(0, 12)
            .toUpperCase(),
          budget: 1_000_000,
        },
      }),
    );
  }

  const departments: Department[] = [];
  const departmentNames = [
    "总经办",
    "人力资源部",
    "财务部",
    "研发中心",
    "产品部",
    "销售部",
    "客户成功部",
    "运营部",
    "制造事业部",
    "合肥分公司",
    "六安分公司",
  ];
  for (let i = 0; i < departmentNames.length; i += 1) {
    departments.push(
      await prisma.department.create({
        data: {
          tenantId: tenant.id,
          companyId: sample(companies, i).id,
          parentId: i > 2 ? departments[0]?.id : null,
          name: departmentNames[i],
          code: `D${String(i + 1).padStart(3, "0")}`,
          costCenterId: sample(costCenters, i).id,
          headcountBudget: i === 0 ? 8 : 30 + i * 4,
          description: `${departmentNames[i]}组织单元`,
        },
      }),
    );
  }

  const positionNames = [
    "CEO",
    "HRD",
    "HR Specialist",
    "Finance Manager",
    "Payroll Specialist",
    "Product Manager",
    "Frontend Engineer",
    "Backend Engineer",
    "Full Stack Engineer",
    "QA Engineer",
    "Sales Manager",
    "Sales Representative",
    "Customer Success Manager",
    "Operations Specialist",
    "Manufacturing Supervisor",
    "Operator",
  ];
  const positions: Position[] = [];
  for (let i = 0; i < positionNames.length; i += 1) {
    positions.push(
      await prisma.position.create({
        data: {
          tenantId: tenant.id,
          departmentId: sample(departments, i).id,
          name: positionNames[i],
          code: `P${String(i + 1).padStart(3, "0")}`,
          level: i < 5 ? "M" : "P",
          grade: i < 5 ? "G7" : `G${(i % 5) + 1}`,
          sequence: positionNames[i].includes("Engineer") ? "Technology" : "Business",
          headcountBudget: i < 5 ? 3 : 15,
        },
      }),
    );
  }

  for (let i = 1; i <= 6; i += 1) {
    await prisma.jobLevel.create({
      data: {
        tenantId: tenant.id,
        name: `G${i}`,
        code: `G${i}`,
        sequence: i,
        minSalary: 5000 + i * 2000,
        maxSalary: 9000 + i * 4500,
      },
    });
  }

  const employees: Employee[] = [];
  const statusCycle = ["PRE_ONBOARDING", "PROBATION", "ACTIVE", "PENDING_TERMINATION", "TERMINATED"] as const;
  const typeCycle = ["FULL_TIME", "PART_TIME", "INTERN", "CONTRACTOR", "LABOR_DISPATCH"] as const;
  const familyNames = ["王", "李", "张", "刘", "陈", "杨", "赵", "黄", "周", "吴", "徐", "孙"];
  const givenNames = ["明", "伟", "芳", "娜", "强", "磊", "敏", "静", "洋", "勇", "艳", "杰", "涛", "鑫"];
  for (let i = 0; i < input.employeeCount; i += 1) {
    const department = sample(departments, i);
    const position = sample(positions, i);
    const name = `${sample(familyNames, i)}${sample(givenNames, i * 3)}${sample(givenNames, i * 7)}`;
    const status = i < 5 ? statusCycle[i] : i % 23 === 0 ? "TERMINATED" : i % 17 === 0 ? "PENDING_TERMINATION" : i % 9 === 0 ? "PROBATION" : "ACTIVE";
    const employee = await prisma.employee.create({
      data: {
        tenantId: tenant.id,
        employeeNo: `${input.slug === "anhui-demo" ? "A" : "M"}${String(i + 1).padStart(5, "0")}`,
        name,
        gender: i % 3 === 0 ? "FEMALE" : i % 3 === 1 ? "MALE" : "UNKNOWN",
        birthDate: addDays(now, -365 * (24 + (i % 18))),
        phone: phone(i + (input.slug === "anhui-demo" ? 0 : 200)),
        email: `employee${i + 1}@${input.slug}.local`,
        idNumberMasked: idMasked(i),
        companyId: sample(companies, i).id,
        departmentId: department.id,
        positionId: position.id,
        managerId: employees[Math.max(0, Math.floor(i / 8) - 1)]?.id,
        employmentType: sample(typeCycle, i),
        employmentStatus: status,
        hireDate: addDays(now, -360 + i),
        probationEndDate: addDays(now, -270 + i),
        regularizationDate: status === "ACTIVE" ? addDays(now, -240 + i) : null,
        leaveDate: status === "TERMINATED" ? addDays(now, -15 - i) : null,
        workLocation: i % 7 === 0 ? "六安" : "合肥",
        costCenterId: sample(costCenters, i).id,
      },
    });
    employees.push(employee);
    await prisma.employeeProfile.create({
      data: {
        tenantId: tenant.id,
        employeeId: employee.id,
        nationality: "中国",
        ethnicity: "汉族",
        maritalStatus: i % 3 === 0 ? "已婚" : "未婚",
        educationLevel: i % 4 === 0 ? "硕士" : "本科",
        school: "安徽大学",
        major: "人力资源管理",
        emergencyContactName: `${sample(familyNames, i + 1)}先生`,
        emergencyContactRelation: "家属",
        emergencyContactPhone: phone(i + 500),
        bankName: "招商银行",
        bankAccountMasked: `**** **** **** ${String(6000 + i)}`,
        address: "安徽省合肥市蜀山区演示小区",
      },
    });
    await prisma.employeeEducation.create({
      data: {
        tenantId: tenant.id,
        employeeId: employee.id,
        school: "安徽大学",
        major: "管理学",
        degree: "本科",
        startDate: addDays(now, -365 * 8),
        endDate: addDays(now, -365 * 4),
      },
    });
    await prisma.employeeChange.create({
      data: {
        tenantId: tenant.id,
        employeeId: employee.id,
        changeType: "ONBOARDING",
        effectiveDate: employee.hireDate,
        reason: "演示数据入职",
        afterValue: { departmentId: department.id, positionId: position.id },
      },
    });
  }

  const namedEmployee = async (index: number, name: string) => {
    const employee = employees[index];
    await prisma.employee.update({ where: { id: employee.id }, data: { name, email: undefined } });
    return employee;
  };
  const ownerEmployee = await namedEmployee(0, "王一鸣");
  const tenantAdminEmployee = await namedEmployee(1, "赵企业");
  const hrdEmployee = await namedEmployee(2, "李华");
  const hrEmployee = await namedEmployee(3, "陈敏");
  const payrollEmployee = await namedEmployee(4, "周薪");
  const financeEmployee = await namedEmployee(5, "刘财务");
  const managerEmployee = await namedEmployee(6, "张经理");
  const normalEmployee = await namedEmployee(7, "吴员工");
  const auditorEmployee = await namedEmployee(8, "徐审计");

  if (input.slug === "anhui-demo") {
    await createUser({ tenantId: tenant.id, employeeId: ownerEmployee.id, email: "owner@demo.com", password: DEMO_PASSWORD, name: "王一鸣", roleId: roles.get("TENANT_OWNER")! });
    await createUser({ tenantId: tenant.id, employeeId: tenantAdminEmployee.id, email: "tenant.admin@demo.com", password: DEMO_PASSWORD, name: "赵企业", roleId: roles.get("TENANT_ADMIN")! });
    await createUser({ tenantId: tenant.id, employeeId: hrdEmployee.id, email: "hrd@demo.com", password: DEMO_PASSWORD, name: "李华", roleId: roles.get("HR_DIRECTOR")! });
    await createUser({ tenantId: tenant.id, employeeId: hrEmployee.id, email: "hr@demo.com", password: DEMO_PASSWORD, name: "陈敏", roleId: roles.get("HR_SPECIALIST")! });
    await createUser({ tenantId: tenant.id, employeeId: payrollEmployee.id, email: "payroll@demo.com", password: DEMO_PASSWORD, name: "周薪", roleId: roles.get("PAYROLL_SPECIALIST")! });
    await createUser({ tenantId: tenant.id, employeeId: financeEmployee.id, email: "finance@demo.com", password: DEMO_PASSWORD, name: "刘财务", roleId: roles.get("FINANCE_MANAGER")! });
    await createUser({ tenantId: tenant.id, employeeId: managerEmployee.id, email: "manager@demo.com", password: DEMO_PASSWORD, name: "张经理", roleId: roles.get("DEPARTMENT_MANAGER")! });
    await createUser({ tenantId: tenant.id, employeeId: normalEmployee.id, email: "employee@demo.com", password: DEMO_PASSWORD, name: "吴员工", roleId: roles.get("EMPLOYEE")! });
    await createUser({ tenantId: tenant.id, employeeId: auditorEmployee.id, email: "auditor@demo.com", password: DEMO_PASSWORD, name: "徐审计", roleId: roles.get("AUDITOR")! });
  } else {
    await createUser({
      tenantId: tenant.id,
      employeeId: ownerEmployee.id,
      email: "owner@manufacturing-demo.com",
      password: DEMO_PASSWORD,
      name: "合肥制造所有者",
      roleId: roles.get("TENANT_OWNER")!,
    });
  }

  const templates: ContractTemplate[] = [];
  for (const [index, name] of ["固定期限劳动合同", "保密协议", "竞业限制协议"].entries()) {
    templates.push(
      await prisma.contractTemplate.create({
        data: {
          tenantId: tenant.id,
          name,
          contractType: index === 0 ? "FIXED_TERM" : index === 1 ? "CONFIDENTIALITY" : "NON_COMPETE",
          content: `${name}模板，变量：{{employeeName}}、{{department}}、{{salary}}。`,
          variables: ["employeeName", "department", "salary"],
          status: "ACTIVE",
        },
      }),
    );
  }

  for (let i = 0; i < Math.min(input.employeeCount, input.slug === "anhui-demo" ? 65 : 30); i += 1) {
    const status = i < 10 ? "EXPIRING" : i < 18 ? "PENDING_SIGN" : i < 23 ? "TERMINATED" : "SIGNED";
    await prisma.employeeContract.create({
      data: {
        tenantId: tenant.id,
        employeeId: employees[i].id,
        templateId: sample(templates, i).id,
        contractNo: `${input.slug === "anhui-demo" ? "HT-A" : "HT-M"}-${String(i + 1).padStart(5, "0")}`,
        contractType: sample(["FIXED_TERM", "OPEN_ENDED", "INTERNSHIP", "SERVICE"] as const, i),
        startDate: addDays(now, -300 + i),
        endDate: status === "EXPIRING" ? addDays(now, 7 + i * 6) : addDays(now, 365 + i * 3),
        signDate: status === "PENDING_SIGN" ? null : addDays(now, -280 + i),
        status,
        fileUrl: status === "PENDING_SIGN" ? null : `/demo/contracts/${input.slug}-${i + 1}.pdf`,
        renewalReminderDays: 30,
      },
    });
  }

  await prisma.attendanceRule.create({
    data: {
      tenantId: tenant.id,
      name: "标准工作日考勤",
      workdays: [1, 2, 3, 4, 5],
      checkInTime: "09:00",
      checkOutTime: "18:00",
      flexibleMinutes: 10,
    },
  });
  const shift = await prisma.shift.create({
    data: { tenantId: tenant.id, name: "白班", startTime: "09:00", endTime: "18:00", color: "#2563eb" },
  });

  const attendanceEmployees = employees.slice(0, Math.min(30, employees.length));
  for (let d = 0; d < 30; d += 1) {
    const date = addDays(now, -d);
    for (let i = 0; i < attendanceEmployees.length; i += 1) {
      const employee = attendanceEmployees[i];
      const abnormal = (i + d) % 13;
      const status = abnormal === 0 ? "LATE" : abnormal === 1 ? "EARLY_LEAVE" : abnormal === 2 ? "MISSING_PUNCH" : abnormal === 3 ? "ABSENT" : "NORMAL";
      const checkIn = new Date(date);
      checkIn.setHours(9, status === "LATE" ? 25 : 0, 0, 0);
      const checkOut = new Date(date);
      checkOut.setHours(18, status === "EARLY_LEAVE" ? -20 : 0, 0, 0);
      await prisma.schedule.create({
        data: { tenantId: tenant.id, employeeId: employee.id, shiftId: shift.id, date, status: "SCHEDULED" },
      });
      if (status !== "ABSENT") {
        await prisma.clockRecord.create({
          data: { tenantId: tenant.id, employeeId: employee.id, clockTime: checkIn, clockType: "CHECK_IN", source: "WEB", status },
        });
        if (status !== "MISSING_PUNCH") {
          await prisma.clockRecord.create({
            data: { tenantId: tenant.id, employeeId: employee.id, clockTime: checkOut, clockType: "CHECK_OUT", source: "WEB", status },
          });
        }
      }
      await prisma.attendanceDaily.create({
        data: {
          tenantId: tenant.id,
          employeeId: employee.id,
          date,
          checkInTime: status === "ABSENT" ? null : checkIn,
          checkOutTime: ["ABSENT", "MISSING_PUNCH"].includes(status) ? null : checkOut,
          status,
          lateMinutes: status === "LATE" ? 25 : 0,
          earlyLeaveMinutes: status === "EARLY_LEAVE" ? 20 : 0,
          absenceMinutes: status === "ABSENT" ? 480 : 0,
        },
      });
    }
  }
  for (const employee of attendanceEmployees) {
    await prisma.attendanceMonthly.create({
      data: {
        tenantId: tenant.id,
        employeeId: employee.id,
        year: monthKey().year,
        month: monthKey().month,
        normalDays: 20,
        lateCount: 1,
        earlyLeaveCount: 1,
        absentDays: 0.5,
        leaveHours: 8,
        overtimeHours: 6,
        missingPunchCount: 1,
      },
    });
  }

  const leaveTypes = [];
  for (const [code, name, quota] of [
    ["ANNUAL", "年假", 80],
    ["SICK", "病假", 40],
    ["PERSONAL", "事假", 0],
    ["MARRIAGE", "婚假", 24],
  ] as const) {
    leaveTypes.push(
      await prisma.leaveType.create({
        data: { tenantId: tenant.id, code, name, yearlyQuota: quota, paid: code !== "PERSONAL" },
      }),
    );
  }
  for (const employee of employees.slice(0, Math.min(60, employees.length))) {
    for (const leaveType of leaveTypes) {
      await prisma.leaveBalance.create({
        data: {
          tenantId: tenant.id,
          employeeId: employee.id,
          leaveTypeId: leaveType.id,
          year: now.getFullYear(),
          totalHours: Number(leaveType.yearlyQuota),
          usedHours: 8,
          remainingHours: Math.max(Number(leaveType.yearlyQuota) - 8, 0),
        },
      });
    }
  }
  for (let i = 0; i < 20; i += 1) {
    await prisma.leaveRequest.create({
      data: {
        tenantId: tenant.id,
        employeeId: sample(employees, i).id,
        leaveTypeId: sample(leaveTypes, i).id,
        startAt: addDays(now, i - 10),
        endAt: addDays(now, i - 10),
        durationHours: 8,
        reason: "演示请假申请",
        status: sample(["PENDING", "APPROVED", "REJECTED"] as const, i),
      },
    });
  }
  for (let i = 0; i < 15; i += 1) {
    await prisma.overtimeRequest.create({
      data: {
        tenantId: tenant.id,
        employeeId: sample(employees, i + 2).id,
        startAt: addDays(now, -i),
        endAt: addDays(now, -i),
        durationHours: 3,
        reason: "项目上线加班",
        compensationType: i % 2 === 0 ? "PAY" : "TIME_OFF",
        status: sample(["PENDING", "APPROVED", "REJECTED"] as const, i),
      },
    });
  }
  for (let i = 0; i < 10; i += 1) {
    await prisma.punchCorrection.create({
      data: {
        tenantId: tenant.id,
        employeeId: sample(employees, i + 3).id,
        date: addDays(now, -i),
        correctionTime: addDays(now, -i),
        clockType: "CHECK_IN",
        reason: "忘记打卡",
        status: sample(["PENDING", "APPROVED", "REJECTED"] as const, i),
      },
    });
  }

  const salaryItems = [
    ["BASE", "基本工资", "EARNING"],
    ["POSITION", "岗位工资", "EARNING"],
    ["PERFORMANCE", "绩效奖金", "EARNING"],
    ["OVERTIME", "加班费", "EARNING"],
    ["ALLOWANCE", "补贴", "EARNING"],
    ["SOCIAL_PERSONAL", "个人社保", "DEDUCTION"],
    ["FUND_PERSONAL", "个人公积金", "DEDUCTION"],
    ["TAX", "个税", "DEDUCTION"],
    ["ABSENCE", "缺勤扣款", "DEDUCTION"],
    ["SOCIAL_COMPANY", "公司社保", "COMPANY_COST"],
    ["FUND_COMPANY", "公司公积金", "COMPANY_COST"],
    ["OTHER_COST", "其他公司成本", "COMPANY_COST"],
  ] as const;
  for (const [code, name, type] of salaryItems) {
    await prisma.salaryItem.create({
      data: { tenantId: tenant.id, code, name, type, taxable: type === "EARNING", status: "ACTIVE" },
    });
  }
  const structures = [];
  for (const name of ["管理岗薪资结构", "研发岗薪资结构", "销售岗薪资结构", "制造岗薪资结构"]) {
    structures.push(
      await prisma.salaryStructure.create({
        data: { tenantId: tenant.id, name, description: `${name}演示`, items: salaryItems.map(([code]) => code), status: "ACTIVE" },
      }),
    );
  }
  for (let i = 0; i < Math.min(70, employees.length); i += 1) {
    await prisma.employeeSalaryProfile.create({
      data: {
        tenantId: tenant.id,
        employeeId: employees[i].id,
        salaryStructureId: sample(structures, i).id,
        baseSalary: 6000 + (i % 20) * 700,
        probationSalary: 5000 + (i % 20) * 600,
        effectiveDate: addDays(now, -180),
      },
    });
  }
  for (const offset of [-1, 0]) {
    const key = monthKey(offset);
    const batch = await prisma.salaryBatch.create({
      data: {
        tenantId: tenant.id,
        name: `${key.year}-${String(key.month).padStart(2, "0")} 月薪资`,
        year: key.year,
        month: key.month,
        status: offset === -1 ? "PUBLISHED" : "PENDING_APPROVAL",
        createdById: "seed",
        publishedAt: offset === -1 ? addDays(now, -5) : null,
      },
    });
    let totalGross = 0;
    let totalDeductions = 0;
    let totalNet = 0;
    let totalCompanyCost = 0;
    for (let i = 0; i < Math.min(60, employees.length); i += 1) {
      const grossPay = 8000 + (i % 18) * 650;
      const deductions = 800 + (i % 8) * 80;
      const netPay = grossPay - deductions;
      const companyCost = grossPay + 1600 + (i % 8) * 120;
      totalGross += grossPay;
      totalDeductions += deductions;
      totalNet += netPay;
      totalCompanyCost += companyCost;
      const record = await prisma.salaryRecord.create({
        data: {
          tenantId: tenant.id,
          batchId: batch.id,
          employeeId: employees[i].id,
          grossPay,
          deductions,
          netPay,
          companyCost,
          details: {
            earnings: { base: grossPay - 1200, overtime: 500, allowance: 700 },
            deductions: { social: 500, fund: 300, tax: deductions - 800 },
          },
          status: offset === -1 ? "PUBLISHED" : "DRAFT",
        },
      });
      await prisma.payslip.create({
        data: {
          tenantId: tenant.id,
          salaryRecordId: record.id,
          employeeId: employees[i].id,
          status: offset === -1 ? (i % 3 === 0 ? "CONFIRMED" : "PUBLISHED") : "DRAFT",
          publishedAt: offset === -1 ? addDays(now, -4) : null,
          confirmedAt: offset === -1 && i % 3 === 0 ? addDays(now, -3) : null,
        },
      });
    }
    await prisma.salaryBatch.update({
      where: { id: batch.id },
      data: { totalGross, totalDeductions, totalNet, totalCompanyCost },
    });
  }

  for (const city of ["合肥", "六安"]) {
    await prisma.socialSecurityRule.create({
      data: {
        tenantId: tenant.id,
        city,
        pensionCompanyRate: 0.16,
        pensionPersonalRate: 0.08,
        medicalCompanyRate: 0.07,
        medicalPersonalRate: 0.02,
        unemploymentCompanyRate: 0.005,
        unemploymentPersonalRate: 0.005,
        injuryCompanyRate: 0.003,
        maternityCompanyRate: 0.008,
        minBase: 4227,
        maxBase: 21133,
        effectiveYear: now.getFullYear(),
      },
    });
    await prisma.providentFundRule.create({
      data: {
        tenantId: tenant.id,
        city,
        companyRate: 0.08,
        personalRate: 0.08,
        minBase: 2060,
        maxBase: 28000,
        effectiveYear: now.getFullYear(),
      },
    });
  }
  for (let i = 0; i < Math.min(50, employees.length); i += 1) {
    const city = i % 5 === 0 ? "六安" : "合肥";
    await prisma.employeeSocialSecurity.create({
      data: { tenantId: tenant.id, employeeId: employees[i].id, city, base: 7000 + i * 100, startMonth: `${now.getFullYear()}-01` },
    });
    await prisma.employeeProvidentFund.create({
      data: { tenantId: tenant.id, employeeId: employees[i].id, city, base: 7000 + i * 100, startMonth: `${now.getFullYear()}-01` },
    });
  }

  const workflowNames = [
    ["LEAVE", "请假审批流程"],
    ["OVERTIME", "加班审批流程"],
    ["PUNCH_CORRECTION", "补卡审批流程"],
    ["ONBOARDING", "入职审批流程"],
    ["REGULARIZATION", "转正审批流程"],
    ["TRANSFER", "调岗审批流程"],
    ["SALARY_ADJUSTMENT", "调薪审批流程"],
    ["TERMINATION", "离职审批流程"],
    ["CONTRACT", "合同审批流程"],
    ["PAYROLL", "薪资审批流程"],
  ] as const;
  const workflowTasks = [];
  for (const [code, name] of workflowNames) {
    const template = await prisma.workflowTemplate.create({
      data: { tenantId: tenant.id, code, name, businessType: code, description: `${name}基础版`, status: "ACTIVE" },
    });
    const node = await prisma.workflowNode.create({
      data: { tenantId: tenant.id, templateId: template.id, name: "部门负责人审批", nodeType: "APPROVAL", approverType: "ROLE", approverRoleId: roles.get("DEPARTMENT_MANAGER"), order: 1 },
    });
    const instance = await prisma.workflowInstance.create({
      data: { tenantId: tenant.id, templateId: template.id, businessType: code, businessId: `biz_${code}`, title: name, initiatorId: employees[0].id, status: "PENDING", currentNodeId: node.id },
    });
    workflowTasks.push(
      await prisma.workflowTask.create({
        data: { tenantId: tenant.id, instanceId: instance.id, nodeId: node.id, approverId: managerEmployee.id, status: "PENDING" },
      }),
    );
  }
  await prisma.approvalComment.create({
    data: { tenantId: tenant.id, taskId: workflowTasks[0].id, userId: managerEmployee.id, comment: "请补充交接信息", attachments: [] },
  });

  for (let i = 0; i < 8; i += 1) {
    const request = await prisma.recruitmentRequest.create({
      data: {
        tenantId: tenant.id,
        departmentId: sample(departments, i).id,
        positionId: sample(positions, i).id,
        headcount: (i % 3) + 1,
        reason: "业务扩张",
        priority: i % 2 === 0 ? "HIGH" : "MEDIUM",
        expectedStartDate: addDays(now, 20 + i * 5),
        status: sample(["OPEN", "PENDING_APPROVAL", "PAUSED"] as const, i),
      },
    });
    await prisma.jobPosting.create({
      data: {
        tenantId: tenant.id,
        recruitmentRequestId: request.id,
        title: `${sample(positionNames, i)} 招聘`,
        description: "岗位职责与团队介绍",
        requirements: "3年以上相关经验",
        salaryMin: 8000,
        salaryMax: 18000,
        location: "合肥",
        status: "OPEN",
        publishedAt: addDays(now, -i),
      },
    });
  }
  const candidates = [];
  for (let i = 0; i < 30; i += 1) {
    candidates.push(
      await prisma.candidate.create({
        data: {
          tenantId: tenant.id,
          name: `候选人${i + 1}`,
          phone: phone(i + 800),
          email: `candidate${i + 1}@demo.local`,
          source: sample(["Boss直聘", "猎头", "内推", "官网"], i),
          targetPositionId: sample(positions, i).id,
          status: sample(["NEW", "SCREENING", "INTERVIEWING", "OFFER", "HIRED", "REJECTED", "TALENT_POOL"] as const, i),
          resumeUrl: `/demo/resumes/candidate-${i + 1}.pdf`,
          parsedResume: { years: 2 + (i % 8), skills: ["HR", "SaaS", "Data"] },
          tags: ["演示", sample(["高潜", "技术", "管理"], i)],
        },
      }),
    );
  }
  for (let i = 0; i < 10; i += 1) {
    await prisma.interview.create({
      data: { tenantId: tenant.id, candidateId: candidates[i].id, interviewerEmployeeId: managerEmployee.id, scheduledAt: addDays(now, i + 1), location: "线上会议", result: i % 2 === 0 ? "通过" : "待定", feedback: "沟通能力良好" },
    });
  }
  for (let i = 0; i < 5; i += 1) {
    await prisma.offer.create({
      data: { tenantId: tenant.id, candidateId: candidates[i].id, positionId: sample(positions, i).id, salary: 12000 + i * 1000, expectedHireDate: addDays(now, 20 + i), status: sample(["DRAFT", "APPROVED", "SENT"] as const, i) },
    });
  }

  const cycleCurrent = await prisma.performanceCycle.create({
    data: { tenantId: tenant.id, name: `${now.getFullYear()} H1 绩效周期`, type: "HALF_YEAR", startDate: new Date(now.getFullYear(), 0, 1), endDate: new Date(now.getFullYear(), 5, 30), status: "REVIEWING" },
  });
  await prisma.performanceCycle.create({
    data: { tenantId: tenant.id, name: `${now.getFullYear()} H2 绩效周期`, type: "HALF_YEAR", startDate: new Date(now.getFullYear(), 6, 1), endDate: new Date(now.getFullYear(), 11, 31), status: "ACTIVE" },
  });
  for (let i = 0; i < Math.min(50, employees.length); i += 1) {
    await prisma.performanceGoal.create({
      data: { tenantId: tenant.id, cycleId: cycleCurrent.id, employeeId: employees[i].id, title: "核心业务目标", description: "完成岗位关键指标", weight: 60, targetValue: "100%", actualValue: `${80 + (i % 20)}%`, score: 70 + (i % 30) },
    });
  }
  for (let i = 0; i < Math.min(40, employees.length); i += 1) {
    await prisma.performanceReview.create({
      data: {
        tenantId: tenant.id,
        cycleId: cycleCurrent.id,
        employeeId: employees[i].id,
        reviewerId: managerEmployee.id,
        selfReview: "完成主要目标",
        managerReview: "表现稳定，有提升空间",
        score: 70 + (i % 25),
        grade: sample(["A", "B", "C", "D"], i),
        comments: "演示绩效评价",
        status: i % 4 === 0 ? "COMPLETED" : "REVIEWING",
      },
    });
  }

  const courses = [];
  for (let i = 0; i < 10; i += 1) {
    courses.push(
      await prisma.course.create({
        data: { tenantId: tenant.id, title: `企业培训课程 ${i + 1}`, description: "制度、合规、岗位技能培训", courseType: sample(["制度", "合规", "技能"], i), contentUrl: `/demo/courses/${i + 1}`, durationMinutes: 30 + i * 10 },
      }),
    );
  }
  for (let i = 0; i < 50; i += 1) {
    await prisma.trainingTask.create({
      data: {
        tenantId: tenant.id,
        courseId: sample(courses, i).id,
        employeeId: sample(employees, i).id,
        status: sample(["ASSIGNED", "IN_PROGRESS", "COMPLETED", "EXPIRED"] as const, i),
        dueAt: addDays(now, 15 - i),
        completedAt: i % 4 === 2 ? addDays(now, -i) : null,
        score: i % 4 === 2 ? 80 + (i % 20) : null,
      },
    });
  }
  for (let i = 0; i < 8; i += 1) {
    await prisma.certificate.create({
      data: { tenantId: tenant.id, employeeId: sample(employees, i).id, name: `资格证书 ${i + 1}`, issuer: "HR Nexus Academy", issuedAt: addDays(now, -100 + i), expiresAt: addDays(now, 365 + i), fileUrl: `/demo/certificates/${i + 1}.pdf` },
    });
  }

  const userIds = (await prisma.user.findMany({ where: { tenantId: tenant.id }, select: { id: true } })).map((user) => user.id);
  const notificationUserIds = userIds.length ? userIds : [(await prisma.user.findFirst({ where: { tenantId: tenant.id } }))?.id].filter(Boolean) as string[];
  for (let i = 0; i < 30; i += 1) {
    await prisma.notification.create({
      data: {
        tenantId: tenant.id,
        userId: sample(notificationUserIds, i),
        title: sample(["合同到期提醒", "审批待办", "工资条发布", "转正提醒", "入职任务提醒", "培训任务提醒"], i),
        content: "这是一条 HR Nexus 演示通知。",
        type: sample(["CONTRACT", "APPROVAL", "PAYSLIP", "REGULARIZATION", "ONBOARDING", "TRAINING"], i),
        status: i % 3 === 0 ? "READ" : "UNREAD",
        link: "/notifications",
        readAt: i % 3 === 0 ? addDays(now, -i) : null,
      },
    });
  }

  for (let i = 0; i < 18; i += 1) {
    await prisma.fileAsset.create({
      data: {
        tenantId: tenant.id,
        ownerType: sample(["employee", "contract", "training"], i),
        ownerId: sample(employees, i).id,
        fileName: `演示附件-${i + 1}.pdf`,
        fileUrl: `/demo/files/${i + 1}.pdf`,
        fileSize: 1024 * (30 + i),
        mimeType: "application/pdf",
        visibility: sample(["PUBLIC_WITHIN_TENANT", "HR_ONLY", "MANAGER_ONLY", "PAYROLL_ONLY", "PRIVATE", "SENSITIVE"] as const, i),
        uploadedById: notificationUserIds[0],
      },
    });
  }
  await prisma.exportJob.create({
    data: { tenantId: tenant.id, userId: notificationUserIds[0], module: "employees", status: "COMPLETED", fileUrl: "/demo/exports/employees.csv", reason: "演示导出" },
  });

  const actions: readonly AuditAction[] = ["LOGIN", "VIEW", "CREATE", "UPDATE", "EXPORT", "DOWNLOAD", "APPROVE", "REJECT", "PUBLISH", "SENSITIVE_VIEW"];
  for (let i = 0; i < 100; i += 1) {
    await prisma.auditLog.create({
      data: {
        tenantId: tenant.id,
        actorUserId: notificationUserIds[i % notificationUserIds.length],
        action: sample(actions, i),
        module: sample(["auth", "employees", "payroll", "contracts", "attendance", "approvals"], i),
        targetType: sample(["Employee", "SalaryBatch", "Contract", "ClockRecord"], i),
        targetId: sample(employees, i).id,
        ip: `127.0.0.${(i % 240) + 1}`,
        userAgent: "HR Nexus Seed",
        metadata: { demo: true, index: i },
      },
    });
  }

  return {
    tenant,
    employees: employees.length,
    contracts: Math.min(input.employeeCount, input.slug === "anhui-demo" ? 65 : 30),
  };
}

async function main() {
  await resetDemoData();
  const platformRoles = await seedPermissionsAndRoles(null);
  await createUser({
    tenantId: null,
    employeeId: null,
    email: "admin@platform.local",
    password: PLATFORM_ADMIN_PASSWORD,
    name: "平台管理员",
    roleId: platformRoles.get("PLATFORM_ADMIN")!,
  });

  const anhui = await seedTenant({
    name: "安徽智企科技有限公司",
    slug: "anhui-demo",
    industry: "软件与企业服务",
    companySize: "150 人",
    employeeCount: 80,
  });
  const hefei = await seedTenant({
    name: "合肥制造示范有限公司",
    slug: "hefei-manufacturing-demo",
    industry: "制造业",
    companySize: "800 人",
    employeeCount: 30,
  });

  console.log("HR Nexus demo data seeded", { tenants: 2, anhui, hefei });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
