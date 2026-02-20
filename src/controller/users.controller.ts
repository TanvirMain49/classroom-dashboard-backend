import {
  and,
  desc,
  eq,
  getTableColumns,
  ilike,
  or,
  sql,
} from "drizzle-orm";
import { asyncHandler } from "../utils/async-handler.utils";
import { classes, departments, subjects, user, enrollments } from "../schema";
import { db } from "../db";

export const getUsersController = asyncHandler(async (req, res) => {
  const { role, search, page = 1, limit = 10 } = req.query;

  if (role !== "teacher" && role !== "student") {
    res.status(400).json({ error: "Invalid role" });
    return;
  }

  const currentPage = Math.max(1, +page);
  const limitPerPage = Math.max(1, +limit);
  const offset = (currentPage - 1) * limitPerPage;

  const filterConditions = [];

  if (search) {
    filterConditions.push(
      or(ilike(user.name, `%${search}%`), ilike(user.email, `%${search}%`)),
    );
  }

  const whereClause =
    filterConditions.length > 0 ? and(...filterConditions) : undefined;

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(user)
    .where(and(whereClause, eq(user.role, role)));

  const totalCount = countResult[0]?.count ?? 0;

  const userList = await db
    .select()
    .from(user)
    .where(and(whereClause, eq(user.role, role)))
    .offset(offset)
    .limit(limitPerPage)
    .orderBy(desc(user.createdAt));

  if (!userList) {
    throw new Error(`Failed to fetch ${role} list from database`);
  }

  res.status(200).json({
    data: userList,
    pagination: {
      page: currentPage,
      limit: limitPerPage,
      total: totalCount,
    },
  });
});

export const getUserDetailsController = asyncHandler(async (req, res) => {
  const userId = req.params.id as string;

  console.log("HO Bhai Dukse!!!!")

  if (!userId) {
    res.status(400).json({
      success: false,
      message: "User ID is required to fetch user details.",
    });
    return;
  }

  const [userDetails] = await db
    .select()
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!userDetails) {
    res.status(404).json({
      success: false,
      message: "User not found.",
    });
    return;
  }

  res.status(200).json({
    data: userDetails,
  });
});

export const getUserDepartmentsController = asyncHandler(async (req, res) => {
  const userId = req.params.id as string;

  if (!userId) {
    res.status(400).json({
      success: false,
      message: "User ID is required to fetch departments.",
    });
    return;
  }

  const { page = 1, limit = 10 } = req.query;

  const [userRecord] = await db
    .select({ id: user.id, role: user.role })
    .from(user)
    .where(eq(user.id, userId));

  if (!userRecord) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const currentPage = Math.max(1, +page);
  const limitPerPage = Math.max(1, +limit);
  const offset = (currentPage - 1) * limitPerPage;

  let countResult;
  let departmentsList;

  if (userRecord.role === "teacher") {
    countResult = await db
      .select({ count: sql<number>`count(distinct ${departments.id})` })
      .from(departments)
      .leftJoin(subjects, eq(subjects.departmentId, departments.id))
      .leftJoin(classes, eq(classes.subjectId, subjects.id))
      .where(eq(classes.teacherId, userId));

    departmentsList = await db
      .select({
        ...getTableColumns(departments),
      })
      .from(departments)
      .leftJoin(subjects, eq(subjects.departmentId, departments.id))
      .leftJoin(classes, eq(classes.subjectId, subjects.id))
      .where(eq(classes.teacherId, userId))
      .groupBy(
        departments.id,
        departments.code,
        departments.name,
        departments.description,
        departments.createdAt,
        departments.updatedAt,
      )
      .orderBy(desc(departments.createdAt))
      .limit(limitPerPage)
      .offset(offset);
  } else if (userRecord.role === "student") {
    countResult = await db
      .select({ count: sql<number>`count(distinct ${departments.id})` })
      .from(departments)
      .leftJoin(subjects, eq(subjects.departmentId, departments.id))
      .leftJoin(classes, eq(classes.subjectId, subjects.id))
      .leftJoin(enrollments, eq(enrollments.classId, classes.id))
      .where(eq(enrollments.studentId, userId));

    departmentsList = await db
      .select({
        ...getTableColumns(departments),
      })
      .from(departments)
      .leftJoin(subjects, eq(subjects.departmentId, departments.id))
      .leftJoin(classes, eq(classes.subjectId, subjects.id))
      .leftJoin(enrollments, eq(enrollments.classId, classes.id))
      .where(eq(enrollments.studentId, userId))
      .groupBy(
        departments.id,
        departments.code,
        departments.name,
        departments.description,
        departments.createdAt,
        departments.updatedAt,
      )
      .orderBy(desc(departments.createdAt))
      .limit(limitPerPage)
      .offset(offset);
  } else {
    res.status(200).json({
      data: [],
      pagination: {
        page: currentPage,
        limit: limitPerPage,
        total: 0,
        totalPages: 0,
      },
    });
    return;
  }

  const totalCount = countResult?.[0]?.count ?? 0;

  if (!departmentsList) {
    throw new Error("Failed to fetch departments from database");
  }

  res.status(200).json({
    data: departmentsList,
    pagination: {
      page: currentPage,
      limit: limitPerPage,
      total: totalCount,
      totalPages: Math.ceil(totalCount / limitPerPage),
    },
  });
});

export const getUserSubjectsController = asyncHandler(async (req, res) => {
  const userId = req.params.id as string;

  if (!userId) {
    res.status(400).json({
      success: false,
      message: "User ID is required to fetch subjects.",
    });
    return;
  }

  const { page = 1, limit = 10 } = req.query;

  const [userRecord] = await db
    .select({ id: user.id, role: user.role })
    .from(user)
    .where(eq(user.id, userId));

  if (!userRecord) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const currentPage = Math.max(1, +page);
  const limitPerPage = Math.max(1, +limit);
  const offset = (currentPage - 1) * limitPerPage;

  let countResult;
  let subjectsList;

  if (userRecord.role === "teacher") {
    countResult = await db
      .select({ count: sql<number>`count(distinct ${subjects.id})` })
      .from(subjects)
      .leftJoin(classes, eq(classes.subjectId, subjects.id))
      .where(eq(classes.teacherId, userId));

    subjectsList = await db
      .select({
        ...getTableColumns(subjects),
        department: {
          id: departments.id,
          code: departments.code,
          name: departments.name,
        },
      })
      .from(subjects)
      .leftJoin(departments, eq(departments.id, subjects.departmentId))
      .leftJoin(classes, eq(classes.subjectId, subjects.id))
      .where(eq(classes.teacherId, userId))
      .groupBy(
        subjects.id,
        subjects.name,
        subjects.code,
        subjects.departmentId,
        subjects.description,
        subjects.createdAt,
        subjects.updatedAt,
        departments.id,
        departments.code,
        departments.name,
      )
      .orderBy(desc(subjects.createdAt))
      .limit(limitPerPage)
      .offset(offset);
  } else if (userRecord.role === "student") {
    countResult = await db
      .select({ count: sql<number>`count(distinct ${subjects.id})` })
      .from(subjects)
      .leftJoin(classes, eq(classes.subjectId, subjects.id))
      .leftJoin(enrollments, eq(enrollments.classId, classes.id))
      .where(eq(enrollments.studentId, userId));

    subjectsList = await db
      .select({
        ...getTableColumns(subjects),
        department: {
          id: departments.id,
          code: departments.code,
          name: departments.name,
        },
      })
      .from(subjects)
      .leftJoin(departments, eq(departments.id, subjects.departmentId))
      .leftJoin(classes, eq(classes.subjectId, subjects.id))
      .leftJoin(enrollments, eq(enrollments.classId, classes.id))
      .where(eq(enrollments.studentId, userId))
      .groupBy(
        subjects.id,
        subjects.name,
        subjects.code,
        subjects.departmentId,
        subjects.description,
        subjects.createdAt,
        subjects.updatedAt,
        departments.id,
        departments.code,
        departments.name,
      )
      .orderBy(desc(subjects.createdAt))
      .limit(limitPerPage)
      .offset(offset);
  } else {
    res.status(200).json({
      data: [],
      pagination: {
        page: currentPage,
        limit: limitPerPage,
        total: 0,
        totalPages: 0,
      },
    });
    return;
  }

  const totalCount = countResult?.[0]?.count ?? 0;

  if (!subjectsList) {
    throw new Error("Failed to fetch subjects from database");
  }

  res.status(200).json({
    data: subjectsList,
    pagination: {
      page: currentPage,
      limit: limitPerPage,
      total: totalCount,
      totalPages: Math.ceil(totalCount / limitPerPage),
    },
  });
});