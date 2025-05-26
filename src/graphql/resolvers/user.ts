import { GraphqlContext } from "../../types/types.utils";
import { users } from "../../db/schema/auth";
import { eq } from "drizzle-orm";
import { GraphQLError } from "graphql";

export const userResolvers = {
  Query: {
    me: async (_: any, __: any, context: GraphqlContext) => {
      const { user, db, req } = context;
      
      console.log("Me resolver - context user:", user);
      console.log("Me resolver - session user:", req?.session?.user);
      
      // If no user in context, try to get from session
      const currentUser = user || req?.session?.user;
      
      if (!currentUser?.id) {
        console.log("No authenticated user found");
        return null; // Return null instead of throwing to match GraphQL schema (User can be null)
      }
      
      // Update context with the resolved user
      context.user = currentUser;

      try {
        // First get the user
        const currentUser = context.user || user;
        if (!currentUser?.id) {
          throw new GraphQLError("User not found", {
            extensions: { code: "NOT_FOUND" },
          });
        }

        const [userData] = await db
          .select()
          .from(users)
          .where(eq(users.id as any, currentUser.id));

        if (!userData) {
          throw new GraphQLError("User not found", {
            extensions: { code: "NOT_FOUND" },
          });
        }

        // Then get the user's accounts with required fields for TradingAccount type
        // const userAccounts = await db
        //   .select({
        //     id: tradingAccounts.id,
        //     accountId: tradingAccounts.accountId,
        //     accountName: tradingAccounts.accountName,
        //     broker: tradingAccounts.broker,
        //     accountSize: tradingAccounts.accountSize,
        //     accountCurrency: tradingAccounts.accountCurrency,
        //     isProp: tradingAccounts.isProp,
        //     funded: tradingAccounts.funded,
        //     fundedAt: tradingAccounts.fundedAt,
        //     propFirm: tradingAccounts.propFirm,
        //     goal: tradingAccounts.goal,
        //     experienceLevel: tradingAccounts.experienceLevel,
        //     biggestChallenge: tradingAccounts.biggestChallenge,
        //     createdAt: tradingAccounts.createdAt,
        //     updatedAt: tradingAccounts.updatedAt,
        //   })
        //   .from(tradingAccounts)
        //   .where(eq(tradingAccounts.userId, user.id));

        // Return user with accounts
        return {
          ...userData,
          //   accounts: userAccounts,
        };
      } catch (error) {
        console.error("Error fetching user:", error);
        throw new GraphQLError("Failed to fetch user", {
          extensions: { code: "INTERNAL_SERVER_ERROR" },
        });
      }
    },
  },
  Mutation: {
    logout: async (
      _parent: unknown,
      _args: unknown,
      context: GraphqlContext
    ) => {
      const { req, res } = context;

      if (!req || !res) {
        throw new GraphQLError("Request/response not available in context");
      }

      // If there's no session, consider the user already logged out
      if (!req.session) {
        return {
          success: true,
          message: "No active session to log out from",
        };
      }

      return new Promise((resolve, reject) => {
        // Logout the user
        req.logout((err: Error | null) => {
          if (err) {
            console.error("Logout error:", err);
            return reject(new GraphQLError("Logout failed"));
          }

          // Destroy the session
          req.session.destroy((destroyErr: any) => {
            if (destroyErr) {
              console.error("Session destruction error:", destroyErr);
              return reject(new GraphQLError("Session destruction failed"));
            }

            // Clear the session cookie
            res.clearCookie("connect.sid", {
              path: "/",
              httpOnly: true,
              secure: process.env.NODE_ENV === "production",
              sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            });

            return resolve({
              success: true,
              message: "Successfully logged out",
            });
          });
        });
      });
    },
  },
};
