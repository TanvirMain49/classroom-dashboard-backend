import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db"; 
import * as schema from "../schema/auth"

const betterAuthSecret = process.env.BETTER_AUTH_SECRET;
const frontendUrl = process.env.FRONTEND_URL;
const betterAuthUrl = process.env.BETTER_AUTH_URL;
if (!betterAuthSecret || !frontendUrl || !betterAuthUrl) {
  throw new Error("BETTER_AUTH_SECRET, FRONTEND_URL, and BETTER_AUTH_URL are required.");
}


export const auth = betterAuth({
    secret: betterAuthSecret,
    trustedOrigins: [frontendUrl],
    database: drizzleAdapter(db, {
        provider: "pg", 
        schema
    }),
    baseURL: `${betterAuthUrl}/api/v1/auth`,
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