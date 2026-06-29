import type { AttendanceStatus } from "@prisma/client";

export function calculateAttendanceStatus(input: {
  checkIn?: Date | null;
  checkOut?: Date | null;
  expectedCheckInHour?: number;
  expectedCheckOutHour?: number;
}): { status: AttendanceStatus; lateMinutes: number; earlyLeaveMinutes: number } {
  if (!input.checkIn || !input.checkOut) {
    return { status: "MISSING_PUNCH", lateMinutes: 0, earlyLeaveMinutes: 0 };
  }
  const expectedIn = new Date(input.checkIn);
  expectedIn.setHours(input.expectedCheckInHour ?? 9, 0, 0, 0);
  const expectedOut = new Date(input.checkOut);
  expectedOut.setHours(input.expectedCheckOutHour ?? 18, 0, 0, 0);
  const lateMinutes = Math.max(Math.round((input.checkIn.getTime() - expectedIn.getTime()) / 60000), 0);
  const earlyLeaveMinutes = Math.max(
    Math.round((expectedOut.getTime() - input.checkOut.getTime()) / 60000),
    0,
  );
  if (lateMinutes > 0) return { status: "LATE", lateMinutes, earlyLeaveMinutes };
  if (earlyLeaveMinutes > 0) return { status: "EARLY_LEAVE", lateMinutes, earlyLeaveMinutes };
  return { status: "NORMAL", lateMinutes, earlyLeaveMinutes };
}
