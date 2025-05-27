import { Express, Request, Response, NextFunction } from "express";
import passport from "passport";

export function registerAuthRoutes(app: Express) {
  // Google OAuth login
  app.get(
    "/api/auth/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
  );

  // Google OAuth callback
  app.get(
    "/api/auth/google/callback",
    (req: Request, res: Response, next: NextFunction) => {
      console.log("=== Google OAuth Callback ===");
      console.log("Request URL:", req.originalUrl);
      console.log("Request headers:", req.headers);
      console.log("Session ID:", req.sessionID);
      next();
    },
    passport.authenticate("google", {
      failureRedirect: "/login",
      session: true,
    }),
    (req: Request, res: Response) => {
      // Use APP_URL from environment variables, fallback to localhost:3000 if not set
      const frontendUrl = process.env.APP_URL;
      // || "http://localhost:3000"
      // Check user's onboarding status and redirect accordingly
      if (req.user) {
        const user = req.user as any;

        if (user.onboardingCompleted) {
          // User has completed onboarding - redirect to dashboard
          res.redirect(`${frontendUrl}/dashboard`);
        } else {
          // User hasn't completed onboarding - redirect to onboarding
          res.redirect(`${frontendUrl}/onboarding`);
        }
      } else {
        // Fallback if no user (shouldn't happen with successful auth)
        res.redirect(frontendUrl!);
      }
    }
  );

  // Logout
  app.get("/api/logout", (req: Request, res: Response, next: NextFunction) => {
    req.logout(function (err: any) {
      if (err) {
        return next(err);
      }
      const frontendUrl =
        process.env.NODE_ENV === "production"
          ? "https://journal-gamma-two.vercel.app"
          : "http://localhost:3000";
      res.redirect(frontendUrl);
    });
  });

  // Debug endpoint to check session/user
  app.get("/api/me", (req: Request, res: Response) => {
    res.json({ user: req.user, session: req.session });
  });

  // Optional: Enhanced user info endpoint with onboarding status
  app.get("/api/user/status", (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const user = req.user as any;
    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        onboardingCompleted: user.onboardingCompleted,
        onboardingStep: user.onboardingStep,
      },
      redirectTo: user.onboardingCompleted ? "/dashboard" : "/onboarding",
    });
  });
}
