import { and, desc, eq, getTableColumns, ilike, or, sql } from "drizzle-orm";
import { asyncHandler } from "../utils/async-handler.utils";
import { user } from "../schema";
import { db } from "../db";

export const usersController = asyncHandler( async(req, res)=>{
    const { search, role, page= 1, limit= 10 } = req.query;

    const currentPage = Math.max(1, +page);
    const limitPerPage = Math.max(1, +limit);
    const offset = ( currentPage - 1 ) * limitPerPage;

    const filterConditions = [];

    if(search){
        filterConditions.push(
            or(
                ilike(user.name,  `%${search}%`),
                ilike(user.email, `%${search}%`)
            )
        )
    }

    if(role){
        filterConditions.push(
            eq(user.role, role as UserRoles)
        )
    }

    const whereClause = filterConditions.length > 0 ? and(...filterConditions) : undefined;

    const resultCount = await db
        .select({count: sql<number>`count(*)`})
        .from(user)
        .where(whereClause)
    
    const totalCount = resultCount[0]?.count ?? 0;

    const userList = await db
        .select()
        .from(user)
        .where(whereClause)
        .offset(offset)
        .limit(limitPerPage)
        .orderBy(desc(user.createdAt))

    res.status(200).json({
        data: userList,
        pagination:{
            page: currentPage,
            limit: limitPerPage,
            total: totalCount,
            totalPage: Math.ceil(totalCount / limitPerPage)
        }
    })

});