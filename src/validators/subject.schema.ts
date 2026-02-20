import z from "zod";

export const subjectCreateSchema = z.object({
  departmentId: z.coerce.number().min(1, "Department is required"),
  name: z
    .string()
    .trim()
    .min(3, "Subject name must be at least 3 characters")
    .max(255, "Subject name is too long"),
    
  code: z
    .string()
    .trim()
    .toUpperCase() // Standardizing codes to uppercase is a common best practice
    .min(3, "Subject code must be at least 3 characters")
    .max(50, "Subject code cannot exceed 50 characters"),
    
  description: z
    .string()
    .trim()
    .min(5, "Subject description must be at least 5 characters")
    .max(255, "Description is too long")
    .optional()
    .or(z.literal("")),
});

// Extract the Type for use in the controller or service
export type SubjectCreateInput = z.infer<typeof subjectCreateSchema>;