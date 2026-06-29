import type { WorkflowStatus, WorkflowTaskStatus } from "@prisma/client";

export function nextWorkflowStatus(tasks: { status: WorkflowTaskStatus }[]): WorkflowStatus {
  if (tasks.some((task) => task.status === "REJECTED")) return "REJECTED";
  if (tasks.every((task) => task.status === "APPROVED")) return "APPROVED";
  if (tasks.some((task) => task.status === "PENDING")) return "PENDING";
  return "COMPLETED";
}

export function workflowTitle(businessType: string, subject: string) {
  return `${businessType} - ${subject}`;
}
