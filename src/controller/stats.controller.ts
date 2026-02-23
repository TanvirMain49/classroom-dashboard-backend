import { and, desc, eq, getTableColumns, sql } from "drizzle-orm";
import { db } from "../db";
import { classes, departments, subjects, user } from "../schema";
import { asyncHandler } from "../utils/async-handler.utils";

export const statsOverView = asyncHandler(async (req, res) => {
  const [
    userCount,
    teachersCount,
    adminsCount,
    subjectsCount,
    departmentsCount,
    classesCount,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(user),
    db
      .select({ count: sql<number>`count(*)` })
      .from(user)
      .where(eq(user.role, "teacher")),
    db
      .select({ count: sql<number>`count(*)` })
      .from(user)
      .where(eq(user.role, "admin")),
    db.select({ count: sql<number>`count(*)` }).from(subjects),
    db.select({ count: sql<number>`count(*)` }).from(departments),
    db.select({ count: sql<number>`count(*)` }).from(classes),
  ]);

  res.status(200).json({
    data: {
      user: userCount[0]?.count ?? 0,
      teachers: teachersCount[0]?.count ?? 0,
      admins: adminsCount[0]?.count ?? 0,
      subjects: subjectsCount[0]?.count ?? 0,
      departments: departmentsCount[0]?.count ?? 0,
      classes: classesCount[0]?.count ?? 0,
    },
  });
});

export const statsLatest = asyncHandler(async (req, res) => {
  const { limit = 5 } = req.query;
  const limitPerPage = Math.max(1, +limit);

  const [latestClasses, latestTeachers] = await Promise.all([
    db
      .select({
        ...getTableColumns(classes),
        subject: {
          ...getTableColumns(subjects),
        },
        teacher: {
          ...getTableColumns(user),
        },
      })
      .from(classes)
      .leftJoin(subjects, eq(subjects.id, classes.subjectId))
      .leftJoin(user, eq(user.id, classes.teacherId))
      .orderBy(desc(classes.createdAt))
      .limit(limitPerPage),
    db
      .select()
      .from(user)
      .where(eq(user.role, "teacher"))
      .orderBy(desc(user.createdAt))
      .limit(limitPerPage),
  ]);

  res.status(200).json({
    data: {
      latestClasses,
      latestTeachers,
    },
  });
});

export const statsChart = asyncHandler( async (req, res) => {
    // All queries in parallel
    const [
      userByRole,
      subjectsByDepartment,
      classesBySubject,
      latestClasses,      // ← NEW: Latest classes with relations
      latestTeachers,     // ← NEW: Latest teachers
      overview,           // ← NEW: Overview statistics
    ] = await Promise.all([
      // 1. user by role
      db
        .select({
          role: user.role,
          total: sql<number>`count(*)`.as("total"),
        })
        .from(user)
        .groupBy(user.role)
        .then((data) =>
          // Filter empty + sort
          data
            .filter((item) => item.total > 0)
            .sort((a, b) => b.total - a.total)
        ),

      // 2. Subjects per department
      db
        .select({
          departmentId: departments.id,
          departmentName: departments.name,
          totalSubjects: sql<number>`count(${subjects.id})`.as("totalSubjects"),
        })
        .from(departments)
        .leftJoin(subjects, eq(subjects.departmentId, departments.id))
        .groupBy(departments.id, departments.name)  // ← FIXED: Added name
        .then((data) =>
          data
            .filter((item) => item.totalSubjects > 0)
            .sort((a, b) => b.totalSubjects - a.totalSubjects)
            .slice(0, 5)  // ← Limit to top 5
        ),

      // 3. Classes per subject
      db
        .select({
          subjectId: subjects.id,
          subjectName: subjects.name,
          totalClasses: sql<number>`count(${classes.id})`.as("totalClasses"),
        })
        .from(subjects)
        .leftJoin(classes, eq(classes.subjectId, subjects.id))
        .groupBy(subjects.id, subjects.name)  // ← FIXED: Added name
        .then((data) =>
          data
            .filter((item) => item.totalClasses > 0)
            .sort((a, b) => b.totalClasses - a.totalClasses)
            .slice(0, 5)  // ← Limit to top 5
        ),

      // 4. Latest 5 classes with teacher/subject info ← NEW
      db
        .select({
          id: classes.id,
          name: classes.name,
          createdAt: classes.createdAt,
          createdAtMs: sql<number>`EXTRACT(EPOCH FROM ${classes.createdAt})::bigint * 1000`.as(
            "createdAtMs"  // ← Pre-parsed timestamp (fast!)
          ),
          subject: {
            id: subjects.id,
            name: subjects.name,
          },
          teacher: {
            id: user.id,
            name: user.name,
          },
        })
        .from(classes)
        .leftJoin(subjects, eq(classes.subjectId, subjects.id))
        .leftJoin(user, eq(classes.teacherId, user.id))
        .orderBy(desc(classes.createdAt))
        .limit(5),

      // 5. Latest 5 teachers ← NEW
      db
        .select({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
          createdAtMs: sql<number>`EXTRACT(EPOCH FROM ${user.createdAt})::bigint * 1000`.as(
            "createdAtMs"  // ← Pre-parsed timestamp
          ),
        })
        .from(user)
        .where(eq(user.role, "teacher"))
        .orderBy(desc(user.createdAt))
        .limit(5),

      // 6. Overview statistics ← NEW
      Promise.all([
        db
          .select({ count: sql<number>`count(*)` })
          .from(user)
          .then((r) => r[0]?.count ?? 0),
        db
          .select({ count: sql<number>`count(*)` })
          .from(user)
          .where(eq(user.role, "teacher"))
          .then((r) => r[0]?.count ?? 0),
        db
          .select({ count: sql<number>`count(*)` })
          .from(user)
          .where(eq(user.role, "admin"))
          .then((r) => r[0]?.count ?? 0),
        db
          .select({ count: sql<number>`count(*)` })
          .from(subjects)
          .then((r) => r[0]?.count ?? 0),
        db
          .select({ count: sql<number>`count(*)` })
          .from(departments)
          .then((r) => r[0]?.count ?? 0),
        db
          .select({ count: sql<number>`count(*)` })
          .from(classes)
          .then((r) => r[0]?.count ?? 0),
      ]).then(
        ([totalUser, teachers, admins, totalSubjects, totalDepts, totalClasses]) => ({
          user: totalUser,
          teachers,
          admins,
          subjects: totalSubjects,
          departments: totalDepts,
          classes: totalClasses,
        })
      ),
    ]);

    // ← FIXED: Return clean structure
    res.status(200).json({
      data: {
        chartData: {
          userByRole,
          subjectsByDepartment,
          classesBySubject,
        },
        latestClasses,
        latestTeachers,
        overview: {
          user: Number(overview.user),
          teachers: Number(overview.teachers),
          admins: Number(overview.admins),
          subjects: Number(overview.subjects),
          departments: Number(overview.departments),
          classes: Number(overview.classes),
        },
      },
    });
  
});
