import { describe, expect, it } from "vitest";
import { nextWorkflowStatus } from "@/lib/workflow";

describe("workflow", () => {
  it("calculates workflow status from tasks", () => {
    expect(nextWorkflowStatus([{ status: "APPROVED" }, { status: "APPROVED" }])).toBe("APPROVED");
    expect(nextWorkflowStatus([{ status: "PENDING" }])).toBe("PENDING");
    expect(nextWorkflowStatus([{ status: "REJECTED" }])).toBe("REJECTED");
  });
});
