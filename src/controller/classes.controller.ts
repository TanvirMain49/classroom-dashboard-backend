import { asyncHandler } from "../utils/async-handler.utils";
import { classes, subjects, user } from "../schema/index";
import { db } from "../db";
import { classSchema } from "../validators/class.schema";
import { customAlphabet } from "nanoid";
import { and, desc, eq, getTableColumns, ilike, or, sql } from "drizzle-orm";

const generateInviteCode = customAlphabet(
  "23456789ABCDEFGHJKLMNPQRSTUVWXYZ",
  8,
);

export const classesPostController = asyncHandler(async (req, res) => {
  const validation = classSchema.safeParse(req.body);

  if (!validation.success) {
    res.status(400).json({
      message: "Validation failed",
      errors: validation.error.flatten().fieldErrors, // Returns nice messages like { name: ["Class name is too short"] }
    });
    return;
  }

  const validatedData = validation.data;

  const [createClass] = await db
    .insert(classes)
    .values({
      ...validatedData,
      inviteCode: generateInviteCode(),
      schedules: [],
    })
    .returning({ id: classes.id });

  if (!createClass) throw Error("Class creation failed");

  res.status(201).json({
    data: createClass,
  });
});

export const classesGetController = asyncHandler(async (req, res) => {
  const { search, subject, teacher, page = 1, limit = 10 } = req.query;
//   console.log("subjects: ", subject);

  const pageParam = Array.isArray(page) ? page[0] : page;
  const limitParam = Array.isArray(limit) ? limit[0] : limit;

  const currentPage = Math.max(1, Number(pageParam) || 1);
  const limitPerPage = Math.max(1, Number(limitParam) || 10);

  const offset = (currentPage - 1) * limitPerPage;

  const filterConditions = [];

  if (search) {
    filterConditions.push(
      or(
        ilike(classes.name, `%${search}%`),
        ilike(classes.inviteCode, `%${search}%`),
      ),
    );
  }

  if (subject) {
    filterConditions.push(ilike(subjects.name, `%${subject}%`));
  }

  if (teacher) {
    filterConditions.push(ilike(user.name, `%${teacher}%`));
  }
  console.log(filterConditions)

  const whereClause =
    filterConditions.length > 0 ? and(...filterConditions) : undefined;

    // console.log(whereClause);

  const resultCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(classes)
    .leftJoin(subjects, eq(classes.subjectId, subjects.id))
    .leftJoin(user, eq(classes.teacherId, user.id))
    .where(whereClause);

  if (!resultCount) {
    throw new Error("Failed to fetch classes count from database");
  }
  const totalCount = resultCount[0]?.count ?? 0;

  const classesList = await db
    .select({
      ...getTableColumns(classes),
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
    .leftJoin(user, eq(classes.teacherId, user.id))
    .leftJoin(subjects, eq(classes.subjectId, subjects.id))
    .where(whereClause)
    .offset(offset)
    .limit(limitPerPage)
    .orderBy(desc(classes.createdAt));

  if (!classesList) {
    throw new Error("Failed to fetch classes from database");
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
