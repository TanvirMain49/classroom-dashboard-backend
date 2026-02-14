import { and, desc, ilike, or, sql } from "drizzle-orm";
import { asyncHandler } from "../utils/async-handler.utils";
import { departments } from "../schema";
import { db } from "../db";

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
                ilike(departments.code, `%${search}%`)
            )
        );
    }

    const whereClause = filterConditions.length > 0 ? and(...filterConditions) : undefined;

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
        .select()
        .from(departments)
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
            totalPage: Math.ceil(totalCount / limitPerPage)
        }
    });
});