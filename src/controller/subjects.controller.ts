import { and, desc, eq, getTableColumns, ilike, or, sql } from "drizzle-orm";
import { asyncHandler } from "../utils/async-handler.utils";
import { classes, departments, enrollments, subjects, user } from "../schema";
import { db } from "../db";
import { subjectCreateSchema } from "../validators/subject.schema";

export const subjectsController = asyncHandler(async (req, res) => {
  const { search, department, page = 1, limit = 10 } = req.query;

  const pageParam = Array.isArray(page) ? page[0] : page;
  const limitParam = Array.isArray(limit) ? limit[0] : limit;

  const currentPage = Math.max(1, Number(pageParam) || 1);
  const limitPerPage = Math.max(1, Number(limitParam) || 10);

  const offset = (currentPage - 1) * limitPerPage;

  const filterConditions = [];

  if (search) {
    filterConditions.push(
      or(
        ilike(subjects.name, `%${search}%`),
        ilike(subjects.code, `%${search}%`),
      ),
    );
  }

  if (department) {
    filterConditions.push(or(ilike(departments.name, `%${department}%`)));
  }

  const whereClause =
    filterConditions.length > 0 ? and(...filterConditions) : undefined;

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(subjects)
    .leftJoin(departments, eq(subjects.departmentId, departments.id))
    .where(whereClause);

  const totalCount = countResult[0]?.count ?? 0;

  const subjectList = await db
    .select({
      ...getTableColumns(subjects),
      department: { ...getTableColumns(departments) },
    })
    .from(subjects)
    .leftJoin(departments, eq(subjects.departmentId, departments.id))
    .where(whereClause)
    .limit(limitPerPage)
    .offset(offset)
    .orderBy(desc(subjects.createdAt));

  // console.log(subjectList);
  res.status(200).json({
    data: subjectList,
    pagination: {
      page: currentPage,
      limit: limitPerPage,
      total: totalCount,
      totalPages: Math.ceil(totalCount / limitPerPage),
    },
  });
});

export const subjectsGetController = asyncHandler(async (req, res) => {
  const subjectId = Number(req.params.id);
  if (!Number.isFinite(subjectId)) {
    res.status(400).json({ message: "Invalid Class ID provided." });
    return;
  }

  const [subject] = await db
    .select({
      ...getTableColumns(subjects),
      department: {
        ...getTableColumns(departments),
      },
    })
    .from(subjects)
    .leftJoin(departments, eq(departments.id, subjects.departmentId))
    .where(eq(subjects.id, subjectId));

  if (!subject) {
    res.status(404).json({ error: "Subject not found" });
    return;
  }
  const classesCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(classes)
    .where(eq(classes.subjectId, subjectId));

  res.status(200).json({
    data: {
      subject,
      totals: {
        classes: classesCount[0]?.count ?? 0,
      },
    },
  });
});

export const subjectsPostController = asyncHandler(async (req, res) => {
  const validation = subjectCreateSchema.safeParse(req.body);

  if (!validation.success) {
    res.status(400).json({
      message: "Validation failed",
      errors: validation.error.flatten().fieldErrors,
    });
    return;
  }

  const validatedData = validation.data;

  // Validation successful - Data reached the server and passed check
  const isServerValidated = true;

  const [createSubject] = await db
    .insert(subjects)
    .values({
      departmentId: validatedData.departmentId,
      code: validatedData.code,
      name: validatedData.name,
      description: validatedData.description,
    })
    .returning({ id: subjects.id });

  if (!createSubject) {
    throw new Error("Subject creation failed");
  }

  res.status(201).json({
    data: createSubject,
    validated: isServerValidated,
  });
});

export const subjectsClassesController = asyncHandler( async(req, res)=>{
  const subjectId = Number(req.params.id);
  const { page = 1, limit = 10 } = req.query;

  const currentPage = Math.max(1, Number(page));
  const limitPerPage = Math.max(1, Number(limit));
  const offset = (currentPage - 1) * limitPerPage;

  if(!Number.isFinite(subjectId)){
    res.status(404).json({ error: "Subject not found" });
  }

  const countResult = await db
    .select({count: sql<number>`count(*)`})
    .from(classes)
    .where(eq(classes.subjectId, subjectId))

  const totalCount = countResult[0]?.count ?? 0; 

  const classesList = await db
  .select({
    ...getTableColumns(classes),
    teacher:{
      ...getTableColumns(user)
    }
  })
  .from(classes)
  .leftJoin(user, eq(user.id, classes.teacherId))
  .where(eq(classes.subjectId, subjectId))

  if(!classesList){
    res.status(404).json({ message: 'classes not found' });
    return;
  }

res.status(200).json({
      data: classesList,
      pagination: {
        page: currentPage,
        limit: limitPerPage,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitPerPage),
      },
    });

});

export const subjectsUserController = asyncHandler( async (req, res)=>{
      const subjectId = Number(req.params.id);
    const { role, page = 1, limit = 10 } = req.query;

    if (!Number.isFinite(subjectId)) {
      res.status(400).json({ error: "Invalid subject id" });
      return
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
            .where(and(eq(user.role, role), eq(classes.subjectId, subjectId)))
        : await db
            .select({ count: sql<number>`count(distinct ${user.id})` })
            .from(user)
            .leftJoin(enrollments, eq(user.id, enrollments.studentId))
            .leftJoin(classes, eq(enrollments.classId, classes.id))
            .where(and(eq(user.role, role), eq(classes.subjectId, subjectId)));

    const totalCount = countResult[0]?.count ?? 0;

    const usersList =
      role === "teacher"
        ? await db
            .select(baseSelect)
            .from(user)
            .leftJoin(classes, eq(user.id, classes.teacherId))
            .where(and(eq(user.role, role), eq(classes.subjectId, subjectId)))
            .groupBy(...groupByFields)
            .orderBy(desc(user.createdAt))
            .limit(limitPerPage)
            .offset(offset)
        : await db
            .select(baseSelect)
            .from(user)
            .leftJoin(enrollments, eq(user.id, enrollments.studentId))
            .leftJoin(classes, eq(enrollments.classId, classes.id))
            .where(and(eq(user.role, role), eq(classes.subjectId, subjectId)))
            .groupBy(...groupByFields)
            .orderBy(desc(user.createdAt))
            .limit(limitPerPage)
            .offset(offset);

    if(!usersList){
      res.status(400).json({
        message:"user list not found"
      })
    }

    res.status(200).json({
      data: usersList,
      pagination: {
        page: currentPage,
        limit: limitPerPage,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitPerPage),
      },
    });
});
