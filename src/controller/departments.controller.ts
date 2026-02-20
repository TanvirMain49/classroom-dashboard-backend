import { and, desc, eq, getTableColumns, ilike, or, sql } from "drizzle-orm";
import { asyncHandler } from "../utils/async-handler.utils";
import { classes, departments, enrollments, subjects, user } from "../schema";
import { db } from "../db";
import { departmentSchema } from "../validators/departments";

export const departmentsController = asyncHandler(async (req, res) => {
  const { search, page = 1, limit = 10 } = req.query;

  const currentPage = Math.max(1, Number(page));
  const limitPerPage = Math.max(1, Number(limit));
  const offset = (currentPage - 1) * limitPerPage;

  // 3. Filter condition array
  const filterConditions = [];

  // 4. Push ilike search conditions (checking both name and code)
  if (search) {
    filterConditions.push(
      or(
        ilike(departments.name, `%${search}%`),
        ilike(departments.code, `%${search}%`),
      ),
    );
  }

  const whereClause =
    filterConditions.length > 0 ? and(...filterConditions) : undefined;

  // 5. Total count with edge case check
  const resultCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(departments)
    .where(whereClause);

  if (!resultCount) {
    throw new Error("Failed to fetch department count from database");
  }

  const totalCount = resultCount[0]?.count ?? 0;

  // 6. Fetch Department List with edge case check
  const departmentList = await db
    .select({
      ...getTableColumns(departments),
      totalSubjects: sql<number>`count(${subjects.id})`,
    })
    .from(departments)
    .leftJoin(subjects, eq(departments.id, subjects.departmentId))
    .groupBy(departments.id)
    .where(whereClause)
    .limit(limitPerPage)
    .offset(offset)
    .orderBy(desc(departments.createdAt));

  if (!departmentList) {
    throw new Error("Data retrieval failed: No response from database");
  }

  // Return in requested format
  res.status(200).json({
    data: departmentList,
    pagination: {
      page: currentPage,
      limit: limitPerPage,
      total: totalCount,
      totalPage: Math.ceil(totalCount / limitPerPage),
    },
  });
});

export const departmentsPostController = asyncHandler(async (req, res) => {
  const validationResult = departmentSchema.safeParse(req.body);

  if (!validationResult.success) {
    res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: validationResult.error.format(),
    });
    return;
  }

  const { code, name, description } = validationResult.data;
  const normalizedName = name.toUpperCase();

  const [createDepartment] = await db
    .insert(departments)
    .values({ code, name: normalizedName, description })
    .returning({ id: departments.id });

  if (!createDepartment) throw Error("Department creation failed");

  res.status(201).json({
    data: createDepartment,
  });
});

export const departmentsGetDetailsController = asyncHandler(
  async (req, res) => {
    const departmentId = Number(req.params.id);
    if (!departmentId) {
      res.status(400).json({ message: "No department found." });
      return;
    }
    const [departmentDetails] = await db
      .select()
      .from(departments)
      .where(eq(departments.id, departmentId));

    if (!departmentDetails) {
      res.status(400).json({ message: "No department found." });
      return;
    }

    const [subjectsCount, classesCount, enrolledStudentsCount, teachersCount] =
      await Promise.all([
        db
          .select({ count: sql<number>`count(*)` })
          .from(subjects)
          .where(eq(subjects.departmentId, departmentId)),

        db
          .select({ count: sql<number>`count(${classes.id})` })
          .from(classes)
          .leftJoin(subjects, eq(classes.subjectId, subjects.id))
          .where(eq(subjects.departmentId, departmentId)),

        db
          .select({ count: sql<number>`count(distinct ${user.id})` })
          .from(user)
          .leftJoin(enrollments, eq(user.id, enrollments.studentId))
          .leftJoin(classes, eq(enrollments.classId, classes.id))
          .leftJoin(subjects, eq(classes.subjectId, subjects.id))
          .where(
            and(
              eq(user.role, "student"),
              eq(subjects.departmentId, departmentId),
            ),
          ),
        db
        .select({ count: sql<number>`count(distinct ${user.id})` })
        .from(user)
        .leftJoin(classes, eq(user.id, classes.teacherId))
        .leftJoin(subjects, eq(classes.subjectId, subjects.id))
        .leftJoin(departments, eq(subjects.departmentId, departments.id))
        .where(
          and(
            eq(user.role, "teacher"),
            eq(departments.id, departmentId),
          ),
        )
      ]);

    res.status(200).json({
      data: {
        departmentDetails,
        totals: {
          subjects: subjectsCount[0]?.count ?? 0,
          classes: classesCount[0]?.count ?? 0,
          enrolledStudents: enrolledStudentsCount[0]?.count ?? 0,
          teachers: teachersCount[0]?.count ?? 0,
        },
      },
    });
  },
);

export const departmentSubjectsController = asyncHandler(async (req, res) => {
  const departmentId = Number(req.params.id);
  if (!Number.isFinite(departmentId)) {
    res.status(400).json({ message: "No department found." });
    return;
  }
  const { page = 1, limit = 10 } = req.query;

  const currentPage = Math.max(1, Number(page));
  const limitPerPage = Math.max(1, Number(limit));
  const offset = (currentPage - 1) * limitPerPage;

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(subjects)
    .where(eq(subjects.departmentId, departmentId));

  const totalCount = countResult[0]?.count ?? 0;

  const subjectsList = await db
    .select({
      ...getTableColumns(subjects),
    })
    .from(subjects)
    .where(eq(subjects.departmentId, departmentId))
    .orderBy(desc(subjects.createdAt))
    .limit(limitPerPage)
    .offset(offset);

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

export const departmentClassesController = asyncHandler(async (req, res) => {
  const departmentId = Number(req.params.id);
  if (!Number.isFinite(departmentId)) {
    res.status(400).json({ message: "No department found." });
    return;
  }
  const { page = 1, limit = 10 } = req.query;

  const currentPage = Math.max(1, Number(page));
  const limitPerPage = Math.max(1, Number(limit));
  const offset = (currentPage - 1) * limitPerPage;

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(classes)
    .leftJoin(subjects, eq(classes.subjectId, subjects.id))
    .where(eq(subjects.departmentId, departmentId));

  const totalCount = countResult[0]?.count ?? 0;

  const classList = await db
    .select({
      // 1. Flattened class columns
      id: classes.id,
      name: classes.name,
      status: classes.status,
      description: classes.description,
      createdAt: classes.createdAt,

      // 2. Explicitly Nesting Subject
      subject: {
        id: subjects.id,
        name: subjects.name,
        code: subjects.code,
      },

      // 3. Explicitly Nesting Teacher
      teacher: {
        id: user.id,
        name: user.name,
      },
    })
    .from(classes)
    .leftJoin(subjects, eq(classes.subjectId, subjects.id))
    .leftJoin(user, eq(classes.teacherId, user.id))
    .where(eq(subjects.departmentId, departmentId))
    .limit(limitPerPage)
    .offset(offset);

  if (!classList) {
    throw new Error("Failed to fetch classes from database");
  }

  res.status(200).json({
    data: classList,
    pagination: {
      page: currentPage,
      limit: limitPerPage,
      total: totalCount,
      totalPages: Math.ceil(totalCount / limitPerPage),
    },
  });
});

export const departmentUsersController = asyncHandler(
  async (req, res) => {
    const departmentId = Number(req.params.id);
    const { role, page = 1, limit = 10 } = req.query;

    if (!Number.isFinite(departmentId)) {
      res.status(400).json({ error: "Invalid department id" });
      return;
    }

    if (role !== "teacher" && role !== "student") {
      res.status(400).json({ error: "Invalid role" });
      return;
    }

    const currentPage = Math.max(1, +page);
    const limitPerPage = Math.max(1, +limit);
    const offset = (currentPage - 1) * limitPerPage;

    const baseSelect = {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      role: user.role,
      imageCldPubId: user.imageCldPubId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    const groupByFields = [
      user.id,
      user.name,
      user.email,
      user.image,
      user.role,
      user.imageCldPubId,
      user.createdAt,
      user.updatedAt,
    ];

    const countResult =
      role === "teacher"
        ? await db
            .select({ count: sql<number>`count(distinct ${user.id})` })
            .from(user)
            .leftJoin(classes, eq(user.id, classes.teacherId))
            .leftJoin(subjects, eq(classes.subjectId, subjects.id))
            .where(
              and(eq(user.role, role), eq(subjects.departmentId, departmentId)),
            )
        : await db
            .select({ count: sql<number>`count(distinct ${user.id})` })
            .from(user)
            .leftJoin(enrollments, eq(user.id, enrollments.studentId))
            .leftJoin(classes, eq(enrollments.classId, classes.id))
            .leftJoin(subjects, eq(classes.subjectId, subjects.id))
            .where(
              and(eq(user.role, role), eq(subjects.departmentId, departmentId)),
            );

    const totalCount = countResult[0]?.count ?? 0;

    const usersList =
      role === "teacher"
        ? await db
            .select(baseSelect)
            .from(user)
            .leftJoin(classes, eq(user.id, classes.teacherId))
            .leftJoin(subjects, eq(classes.subjectId, subjects.id))
            .where(
              and(eq(user.role, role), eq(subjects.departmentId, departmentId)),
            )
            .groupBy(...groupByFields)
            .orderBy(desc(user.createdAt))
            .limit(limitPerPage)
            .offset(offset)
        : await db
            .select(baseSelect)
            .from(user)
            .leftJoin(enrollments, eq(user.id, enrollments.studentId))
            .leftJoin(classes, eq(enrollments.classId, classes.id))
            .leftJoin(subjects, eq(classes.subjectId, subjects.id))
            .where(
              and(eq(user.role, role), eq(subjects.departmentId, departmentId)),
            )
            .groupBy(...groupByFields)
            .orderBy(desc(user.createdAt))
            .limit(limitPerPage)
            .offset(offset);

    res.status(200).json({
      data: usersList,
      pagination: {
        page: currentPage,
        limit: limitPerPage,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitPerPage),
      },
    });
  },
);
