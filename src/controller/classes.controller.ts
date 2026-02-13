import { asyncHandler } from "../utils/async-handler.utils";
import {  classes } from "../schema/index";
import { db } from "../db";
import { classSchema } from "../validators/class.schema";
import { customAlphabet } from 'nanoid';

const generateInviteCode = customAlphabet('23456789ABCDEFGHJKLMNPQRSTUVWXYZ', 8);

export const classesPostController = asyncHandler( async (req, res)=>{
    const validation = classSchema.safeParse(req.body);

    if (!validation.success) {
        res.status(400).json({ 
            message: "Validation failed", 
            errors: validation.error.flatten().fieldErrors // Returns nice messages like { name: ["Class name is too short"] }
        });
        return;
    }

    const validatedData = validation.data;

    const [ createClass ] = await db
        .insert(classes)
        .values({...validatedData, inviteCode: generateInviteCode(), schedules:[]})
        .returning({ id: classes.id })

        if( !createClass ) throw Error;

        res.status(201).json({
            data: createClass
        })
});