import { z } from "zod";

export const departmentSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, "Department code must be at least 2 characters.")
    .max(50, "Department code cannot exceed 50 characters."),
  name: z
    .string()
    .trim()
    .min(2, "Department name must be at least 2 characters.")
    .max(255, "Department name is too long.")
    .refine((val) => val.toUpperCase().includes("DEPT-"), {
      message: "Department name must include 'DEPT-'",
    }),
  description: z
    .string()
    .trim()
    .min(5, "Department description must be at least 5 characters.")
    .max(255, "Department description is too long."),
});

// Export the type for use in the controller
export type DepartmentBody = z.infer<typeof departmentSchema>;