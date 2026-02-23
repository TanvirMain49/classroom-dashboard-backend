import { user as userTable, session as sessionTable } from '../db/schema'; // Adjust path to your schema

// We extract the types directly from your database schema definitions
type User = typeof userTable.$inferSelect;
type Session = typeof sessionTable.$inferSelect;

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string | null;
        role: string | null;
        image: string | null;
        emailVerified: boolean;
      };
    }
  }
}

export {};