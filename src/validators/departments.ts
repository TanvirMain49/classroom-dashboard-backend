import { z } from "zod";

export const departmentSchema = z.object({
  code: z
    .string()
    .min(2, "Department code must be at least 2 character."),
  name: z
    .string()
    .min(2, "Department name must be at least 2 character.")
    .refine((val) => val.toUpperCase().includes("DEPT-"), {
      message: "Department name must include 'DEPT-'",
    }),
  description: z
    .string()
    .min(5, "Department description must be at least 5 character."),
});

// Export the type for use in the controller
export type DepartmentBody = z.infer<typeof departmentSchema>;