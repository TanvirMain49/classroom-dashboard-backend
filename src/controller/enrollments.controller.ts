import { and, eq, getTableColumns } from "drizzle-orm";
import { classes, departments, enrollments, subjects, user } from "../schema";
import { asyncHandler } from "../utils/async-handler.utils";
import { db } from "../db";

const getEnrollmentDetails = async (enrollmentId: number) => {
  const [enrollment] = await db
    .select({
      ...getTableColumns(enrollments),
      class: {
        ...getTableColumns(classes),
      },
      subject: {
        ...getTableColumns(subjects),
      },
      department: {
        ...getTableColumns(departments),
      },
      teacher: {
        ...getTableColumns(user),
      },
    })
    .from(enrollments)
    .leftJoin(classes, eq(enrollments.classId, classes.id))
    .leftJoin(subjects, eq(classes.subjectId, subjects.id))
    .leftJoin(departments, eq(subjects.departmentId, departments.id))
    .leftJoin(user, eq(classes.teacherId, user.id))
    .where(eq(enrollments.id, enrollmentId));

  return enrollment;
};

export const enrollmentPostController = asyncHandler(async (req, res) => {
  const { classId, studentId } = req.body;

  if (!classId || !studentId) {
    res.status(400).json({ error: "classId and studentId are required" });
    return;
  }

  const [classRecord] = await db
    .select()
    .from(classes)
    .where(eq(classes.id, classId));

  if (!classRecord) {
    res.status(404).json({ error: "Class not found" });
    return;
  }

  const [student] = await db.select().from(user).where(eq(user.id, studentId));

  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  const [existingEnrollment] = await db
    .select({ id: enrollments.id })
    .from(enrollments)
    .where(
      and(
        eq(enrollments.classId, classId),
        eq(enrollments.studentId, studentId),
      ),
    );

  if (existingEnrollment) {
    res.status(409).json({ error: "Student already enrolled in class" });
    return;
  }
  const [createdEnrollment] = await db
    .insert(enrollments)
    .values({ classId, studentId })
    .returning({ id: enrollments.id });

  if (!createdEnrollment){
     res.status(500).json({ error: "Failed to create enrollment" });
        return;
    }

  const enrollment = await getEnrollmentDetails(createdEnrollment.id);

  res.status(201).json({ data: enrollment });
});


export const enrollmentJoin = asyncHandler(async (req, res)=>{
    const { inviteCode, studentId } = req.body;

    if (!inviteCode || !studentId) {
        res
        .status(400)
        .json({ error: "inviteCode and studentId are required" });
        return;
    }

    const [classRecord] = await db
      .select()
      .from(classes)
      .where(eq(classes.inviteCode, inviteCode));

    if (!classRecord){
         res.status(404).json({ error: "Class not found" });
         return;
    }

    const [student] = await db
      .select()
      .from(user)
      .where(eq(user.id, studentId));

    if (!student) { 
        res.status(404).json({ error: "Student not found" });
        return;
    }

    const [existingEnrollment] = await db
      .select({ id: enrollments.id })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.classId, classRecord.id),
          eq(enrollments.studentId, studentId)
        )
      );

    if (existingEnrollment){
        res
        .status(409)
        .json({ error: "Student already enrolled in class" });
        return;
    }

    const [createdEnrollment] = await db
      .insert(enrollments)
      .values({ classId: classRecord.id, studentId })
      .returning({ id: enrollments.id });

    if (!createdEnrollment){
        res.status(500).json({ error: "Failed to create enrollment" });
        return;
    }

    const enrollment = await getEnrollmentDetails(createdEnrollment.id);

    res.status(201).json({ data: enrollment });
});