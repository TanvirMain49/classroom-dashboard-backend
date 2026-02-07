import { and, desc, eq, getTableColumns, ilike, or, sql } from "drizzle-orm";
import { asyncHandler } from "../utils/async-handler.utils";
import { departments, subjects } from "../schema";
import { db } from "../db";

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

export { subjectsController };
