import { z } from "zod";

export const classSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters").max(255),
  teacherId: z.string().min(1, "Teacher ID is required"),
  subjectId: z.number().int().positive("Invalid subject ID"),
  capacity: z.number().int().min(1).default(50),
  description: z.string().optional(),
  status: z.enum(["active", "archived"]).default("active"),
  bannerUrl: z.string().url().optional().nullable(),
  bannerCldPubId: z.string().optional().nullable(),
});