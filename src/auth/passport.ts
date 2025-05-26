import passport from "passport";
import {
  Strategy as GoogleStrategy,
  Profile as GoogleProfile,
  VerifyCallback,
} from "passport-google-oauth20";
import "dotenv/config";
import { db } from "../db/index.js";
import { OnboardingStep, users } from "../db/schema/index.js";
import type { InferSelectModel } from "drizzle-orm";

type DbUser = InferSelectModel<typeof users>;
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
        callbackURL: (() => {
          // In production, we need to use the public URL
          if (process.env.NODE_ENV === "production") {
            return "https://tradzil-server.onrender.com/api/auth/google/callback";
          }
          // In development, use localhost
          return "http://localhost:4000/api/auth/google/callback";
        })(),
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
            where: (users: any, { eq }: any) =>
              eq(users.email, email as string),
          });

          if (existingUserByEmail) {
            // Check onboarding status for existing user
            if (existingUserByEmail.onboardingCompleted) {
              // User has completed onboarding - they should go to dashboard
              const sanitizedUser = Object.fromEntries(
                Object.entries(existingUserByEmail).map(([k, v]) => [
                  k,
                  v === null ? undefined : v,
                ])
              );
              // Add a flag to indicate dashboard redirect
              (sanitizedUser as any).shouldRedirectToDashboard = true;
              return done(null, sanitizedUser as any);
            } else {
              // User hasn't completed onboarding
              // Only set onboardingStep to "account_setup" if it's NULL/undefined
              // This preserves progress if they're already in a later step
              let shouldUpdateOnboardingStep = false;
              let updatedUser = existingUserByEmail;

              if (!existingUserByEmail.onboardingStep) {
                // User has no onboarding step set, initialize to account_setup
                shouldUpdateOnboardingStep = true;

                await db
                  .update(users)
                  .set({ onboardingStep: "account_setup" })
                  .where(eq(users.email, email));

                // Fetch updated user
                const fetchedUser = await db.query.users.findFirst({
                  where: (users: any, { eq }: any) =>
                    eq(users.email, email as string),
                });

                if (fetchedUser) {
                  updatedUser = fetchedUser;
                }
              }
              // If user already has an onboardingStep, don't modify it

              const sanitizedUser = Object.fromEntries(
                Object.entries(updatedUser).map(([k, v]) => [
                  k,
                  v === null ? undefined : v,
                ])
              );

              // Add a flag to indicate onboarding redirect
              (sanitizedUser as any).shouldRedirectToOnboarding = true;
              return done(null, sanitizedUser as any);
            }
          }

          // Otherwise, create new user
          const newUser = {
            id: googleId,
            name: profile.displayName || undefined,
            email,
            image: profile.photos?.[0]?.value || undefined,
            participantId: Snowflake.generate(),
            onboardingCompleted: false, // Explicitly set to false for new users
            // onboardingStep will be set to NULL by default for new users
            // It will be set to "account_setup" on first login above
          };

          await db.insert(users).values(newUser);

          // Fetch and return the created user
          const existingUser = await db.query.users.findFirst({
            where: (users: any, { eq }: any) =>
              eq(users.id, googleId as string),
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

          // New users should go to onboarding
          if (sanitizedCreatedUser) {
            (sanitizedCreatedUser as any).shouldRedirectToOnboarding = true;
          }

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

// Helper function to handle post-authentication redirect logic
export function getPostAuthRedirect(user: any): string {
  const baseUrl =
    process.env.NODE_ENV === "production"
      ? "https://your-frontend-domain.com"
      : "http://localhost:3000"; // Adjust to your frontend URL

  if (user.shouldRedirectToDashboard) {
    return `${baseUrl}/dashboard`;
  } else if (user.shouldRedirectToOnboarding) {
    return `${baseUrl}/onboarding`;
  } else {
    // Default fallback
    return user.onboardingCompleted
      ? `${baseUrl}/dashboard`
      : `${baseUrl}/onboarding`;
  }
}
