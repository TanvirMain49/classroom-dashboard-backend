import { and, desc, eq, getTableColumns, ilike, or, sql } from "drizzle-orm";
import { asyncHandler } from "../utils/async-handler.utils";
import { departments, subjects } from "../schema";
import { db } from "../db";
import { subjectCreateSchema } from "../validators/subject.schema";

const subjectsController = asyncHandler(async (req, res) => {
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

const subjectsPostController = asyncHandler(async (req, res) => {
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

export { subjectsController, subjectsPostController };
