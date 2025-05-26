import { GraphQLError } from "graphql";
import { GraphqlContext } from "../../types/types.utils";

import { and, eq } from "drizzle-orm";

import { generateSnowflakeId } from "../../utils/snowflake";
import { AccountSetupInput } from "../typeDefs/account";
import { tradingAccounts } from "../../db/schema/account";
import { users } from "../../db/schema/auth";

export const accountResolvers = {
  Query: {
    tradingAccounts: async (_: unknown, __: unknown, ctx: GraphqlContext) => {
      const { db, user } = ctx;

      if (!user?.id) {
        throw new GraphQLError("Not authenticated", {
          extensions: { code: "UNAUTHORIZED" },
        });
      }

      const userId = user.id;

      return db
        .select()
        .from(tradingAccounts)
        .where(eq(tradingAccounts.userId, userId));
    },

    tradingAccount: async (
      _: unknown,
      args: { id: string },
      ctx: GraphqlContext
    ) => {
      const { db, user } = ctx;

      if (!user?.id) {
        throw new GraphQLError("Not authenticated", {
          extensions: { code: "UNAUTHORIZED" },
        });
      }

      const userId = user.id;

      const [account] = await db
        .select()
        .from(tradingAccounts)
        .where(
          and(
            eq(tradingAccounts.id, args.id),
            eq(tradingAccounts.userId, userId)
          )
        );

      return account ?? null;
    },
  },

  Mutation: {
    setupAccount: async (
      _: unknown,
      args: { input: AccountSetupInput },
      context: GraphqlContext
    ) => {
      console.log("=== setupAccount mutation called ===");
      console.log("Input:", args.input);
      const { input } = args;
      const { db, user } = context;

      if (!user?.id) {
        throw new GraphQLError("Not authenticated", {
          extensions: { code: "UNAUTHORIZED" },
        });
      }

      console.log("User ID from context:", user.id);

      const {
        goal,
        propFirm,
        broker,
        accountSize,
        accountCurrency,
        accountName,
        experienceLevel,
        biggestChallenge,
      } = input;

      // Sanity validation
      if (accountSize <= 0) {
        throw new GraphQLError("Account size must be a positive number");
      }

      try {
        const snowflakeId = generateSnowflakeId();

        // 1. Check if user already has any accounts
        console.log("Checking existing accounts for user:", user.id);
        const existingAccounts = await db
          .select()
          .from(tradingAccounts)
          .where(eq(tradingAccounts.userId, user.id));

        console.log("Existing accounts count:", existingAccounts.length);
        console.log("Existing accounts:", existingAccounts);

        // 2. If it's the user's first account, update onboardingStep
        if (existingAccounts.length === 0) {
          console.log(
            "This is the user's first account - updating onboarding status"
          );

          // First, let's see the current user state
          const [currentUser] = await db
            .select()
            .from(users)
            .where(eq(users.id, user.id))
            .limit(1);

          console.log("Current user state before update:", {
            id: currentUser?.id,
            onboardingStep: currentUser?.onboardingStep,
            onboardingCompleted: currentUser?.onboardingCompleted,
            updatedAt: currentUser?.updatedAt,
          });

          try {
            console.log("Attempting to update user with ID:", user.id);

            const updateResult = await db
              .update(users)
              .set({
                onboardingStep: "safety_net",
                updatedAt: new Date(),
                onboardingCompleted: false,
              })
              .where(eq(users.id, user.id))
              .returning();

            console.log("Update query executed successfully");
            console.log("Update result length:", updateResult.length);
            console.log("Update result:", updateResult);

            if (updateResult.length === 0) {
              console.error(
                "WARNING: Update returned no rows - user might not exist or ID mismatch"
              );

              // Let's verify the user exists
              const userExists = await db
                .select({ id: users.id })
                .from(users)
                .where(eq(users.id, user.id))
                .limit(1);

              console.log(
                "User exists check:",
                userExists.length > 0 ? "YES" : "NO"
              );
              if (userExists.length > 0) {
                console.log("User exists with ID:", userExists[0].id);
              }
            }

            // Verify the update by fetching the user again
            const [updatedUser] = await db
              .select()
              .from(users)
              .where(eq(users.id, user.id))
              .limit(1);

            console.log("User state after update:", {
              id: updatedUser?.id,
              onboardingStep: updatedUser?.onboardingStep,
              onboardingCompleted: updatedUser?.onboardingCompleted,
              updatedAt: updatedUser?.updatedAt,
            });

            // Compare before and after
            if (currentUser && updatedUser) {
              const changed =
                currentUser.onboardingStep !== updatedUser.onboardingStep ||
                currentUser.onboardingCompleted !==
                  updatedUser.onboardingCompleted;
              console.log("Onboarding status actually changed:", changed);
            }
          } catch (error) {
            console.error("Error updating user onboarding step:");
            console.error("Error type:", typeof error);
            console.error(
              "Error message:",
              error instanceof Error ? error.message : String(error)
            );
            console.error("Full error:", error);
            throw new Error(
              "Failed to update user onboarding status: " +
                (error instanceof Error ? error.message : String(error))
            );
          }
        } else {
          console.log("User already has accounts - skipping onboarding update");
        }

        console.log("Creating trading account...");
        const [account] = await db
          .insert(tradingAccounts)
          .values({
            accountId: snowflakeId,
            userId: user.id,
            goal: goal.toLowerCase() as any,
            isProp: goal === "PROP",
            propFirm: propFirm,
            broker: broker,
            accountSize: Math.floor(accountSize),
            accountCurrency: accountCurrency.toUpperCase() as any,
            accountName: accountName,
            experienceLevel: experienceLevel?.toLowerCase() as any,
            biggestChallenge: biggestChallenge?.map((c) =>
              c.toLowerCase()
            ) as any,
          })
          .returning();

        console.log("Trading account created:", account);

        // Get the latest user data to ensure we have the updated onboardingStep
        const [latestUser] = await db
          .select()
          .from(users)
          .where(eq(users.id, user.id))
          .limit(1);

        console.log("Final user state:", {
          id: latestUser?.id,
          onboardingStep: latestUser?.onboardingStep,
          onboardingCompleted: latestUser?.onboardingCompleted,
          updatedAt: latestUser?.updatedAt,
        });

        return {
          ...account,
          goal: account.goal.toUpperCase(),
          accountCurrency: account.accountCurrency.toUpperCase(),
          experienceLevel: account.experienceLevel?.toUpperCase() || null,
          biggestChallenge:
            account.biggestChallenge?.map((c: string) => c.toUpperCase()) || [],
          user: {
            id: latestUser.id,
            onboardingStep: latestUser.onboardingStep,
            onboardingCompleted: latestUser.onboardingCompleted,
            updatedAt: latestUser.updatedAt,
          },
        };
      } catch (error) {
        console.error("Error in setupAccount resolver:");
        console.error("Error type:", typeof error);
        console.error(
          "Error message:",
          error instanceof Error ? error.message : String(error)
        );
        console.error("Full error:", error);
        throw new GraphQLError("Failed to create trading account", {
          extensions: { code: "INTERNAL_SERVER_ERROR" },
        });
      }
    },
  },
};
