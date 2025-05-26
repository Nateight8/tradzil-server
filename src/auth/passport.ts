import passport from "passport";
import {
  Strategy as GoogleStrategy,
  Profile as GoogleProfile,
  VerifyCallback,
} from "passport-google-oauth20";
import "dotenv/config";
import { db } from "../db/index.js";
import { users, User as DbUser } from "../db/schema/index.js";
import { eq } from "drizzle-orm";
import { Snowflake } from "@theinternetfolks/snowflake";

// Extend the Express User type to match our database user type
declare global {
  namespace Express {
    interface User extends DbUser {}
  }
}

export function setupPassport() {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.AUTH_GOOGLE_ID || "",
        clientSecret: process.env.AUTH_GOOGLE_SECRET || "",
        callbackURL:
          process.env.GOOGLE_CALLBACK_URL ||
          "http://localhost:4000/api/auth/google/callback",
      },
      async (
        accessToken: string,
        refreshToken: string,
        profile: GoogleProfile,
        done: VerifyCallback
      ) => {
        try {
          // Find user by Google profile id
          const googleId = profile.id;
          const email = profile.emails?.[0]?.value;
          if (!email)
            return done(new Error("No email found in Google profile"));

          // Check if a user with this email already exists
          const existingUserByEmail = await db.query.users.findFirst({
            where: (users: any, { eq }: any) => eq(users.email, email as string),
          });
          if (existingUserByEmail) {
            // Map all null fields to undefined for compatibility
            const sanitizedUser = Object.fromEntries(
              Object.entries(existingUserByEmail).map(([k, v]) => [
                k,
                v === null ? undefined : v,
              ])
            );
            return done(null, sanitizedUser as any);
          }

          // Otherwise, create new user
          const newUser = {
            id: googleId,
            name: profile.displayName || undefined,
            email,
            image: profile.photos?.[0]?.value || undefined,
            participantId: Snowflake.generate(),
            // Optional fields are left undefined
          };

          await db.insert(users).values(newUser);

          // Fetch and return the created user
          const existingUser = await db.query.users.findFirst({
            where: (users: any, { eq }: any) => eq(users.id, googleId as string),
          });

          // Map all null fields to undefined for compatibility
          const sanitizedCreatedUser = existingUser
            ? Object.fromEntries(
                Object.entries(existingUser).map(([k, v]) => [
                  k,
                  v === null ? undefined : v,
                ])
              )
            : undefined;

          return done(null, sanitizedCreatedUser as any);
        } catch (err) {
          return done(err as Error);
        }
      }
    )
  );

  passport.serializeUser(
    (user: any, done: (err: any, id?: unknown) => void) => {
      done(null, user);
    }
  );

  passport.deserializeUser(
    (obj: any, done: (err: any, user?: any | false | null) => void) => {
      done(null, obj);
    }
  );

  return passport;
}
