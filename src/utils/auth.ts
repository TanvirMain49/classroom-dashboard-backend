import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db";
import * as schema from "../schema/auth";
import { emailOTP } from "better-auth/plugins";
import { Resend } from "resend";

const betterAuthSecret = process.env.BETTER_AUTH_SECRET;
const frontendUrl = process.env.FRONTEND_URL;
const betterAuthUrl = process.env.BETTER_AUTH_URL;
if (!betterAuthSecret || !frontendUrl || !betterAuthUrl) {
  throw new Error(
    "BETTER_AUTH_SECRET, FRONTEND_URL, and BETTER_AUTH_URL are required.",
  );
}

const resend = new Resend(process.env.RESEND_API_KEY);

export const auth = betterAuth({
  secret: betterAuthSecret,
  trustedOrigins: [frontendUrl],
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  baseURL: `${betterAuthUrl}/api/v1/auth`,
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day (every 1 day the session expiration is updated)
    freshAge: 60 * 5
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      authExtraConfig: {
        access_type: "offline", // Always ask for offline access
        prompt: "select_account", // Let them pick their school account, but don't force consent every time
      },
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    },
  },
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: "student",
        input: true,
      },
      imageCldPubId: {
        type: "string",
        required: false,
        input: true,
      },
    },
  },
});
