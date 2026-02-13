import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db"; 
import * as schema from "../schema/auth"

export const auth = betterAuth({
    secret: process.env.BETTER_AUTH_SECRET!,
    trustedOrigins: [ process.env.FRONTEND_URL! ],
    database: drizzleAdapter(db, {
        provider: "pg", 
        schema
    }),
    baseURL: `${process.env.BETTER_AUTH_URL}/api/v1/auth`,
    // This tells Better Auth to look for its internal logic at this sub-path
    basePath: "/api/v1/auth",
    emailAndPassword: {
        enabled: true
    },
    user : {
        additionalFields: {
            role: {
                type: 'string', required: true, defaultValue: 'student', input: true,
            },
            imageCldPubId: {
                type: 'string', required: false, input: true,
            }
        }
    }
});