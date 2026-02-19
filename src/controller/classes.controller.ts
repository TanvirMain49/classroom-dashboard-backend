import { asyncHandler } from "../utils/async-handler.utils";
import { classes, departments, enrollments, subjects, user } from "../schema/index";
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

  const whereClause =
    filterConditions.length > 0 ? and(...filterConditions) : undefined;

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

export const classesGetDetailsController = asyncHandler( async(req, res)=>{
  const classId = Number(req.params.id);
  if(!Number.isFinite(classId)) { 
    res.status(400).json({ message: "No class found." }); 
    return;
  }
  const [ classDetails ] = await db
        .select({
          ...getTableColumns(classes),
          subject: {
            ...getTableColumns(subjects)
          },
           department: {
          ...getTableColumns(departments),
        },
          teacher: {
            ...getTableColumns(user)
          }
        })
        .from(classes)
        .leftJoin(subjects, eq(classes.subjectId, subjects.id))
        .leftJoin(user, eq(classes.teacherId, user.id))
        .leftJoin(departments, eq(subjects.departmentId, departments.id))
        .where(eq(classes.id, classId))

  if(!classDetails ) { 
    res.status(400).json({ message: "No class found." }); 
    return;
  }

  res.status(200).json({ data: classDetails });

});

export const classesUserController = asyncHandler(async (req, res) => {
  const classId = Number(req.params.id);

  if (!Number.isFinite(classId)) {
    res.status(400).json({ message: "Invalid Class ID provided." });
    return;
  }

  const { role , page = 1, limit = 10 } = req.query;
  if ( role !== "student") {
    res.status(400).json({ message: "This endpoint only supports student rosters." });
    return;
  }

  const currentPage = Math.max(1, Number(page));
  const limitPerPage = Math.max(1, Number(limit));
  const offset = (currentPage - 1) * limitPerPage;

  // 4. BaseSelect and GroupSelect
  const baseSelect = {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  const groupSelect = [
    user.id,
    user.name,
    user.email,
    user.image,
    user.role,
    user.createdAt,
    user.updatedAt,
  ];

  // 5. Query countResult
  const countResult = await db
    .select({ count: sql<number>`count(${user.id})` })
    .from(user)
    .leftJoin(enrollments, eq(user.id, enrollments.studentId))
    .where(
      and(
        eq(user.role, role),
        eq(enrollments.classId, classId)
      )
    );

  const totalCount = Number(countResult[0]?.count ?? 0);

  // 6. UserList Query
  const usersList = await db
    .select(baseSelect)
    .from(user)
    .leftJoin(enrollments, eq(user.id, enrollments.studentId))
    .where(
      and(
        eq(user.role, role),
        eq(enrollments.classId, classId)
      )
    )
    .groupBy(...groupSelect)
    .orderBy(desc(user.createdAt))
    .limit(limitPerPage)
    .offset(offset);

  // 7. Return Data
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
