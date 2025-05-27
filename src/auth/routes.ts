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
      // Hardcoded frontend URLs
      const frontendUrl = 'https://journal-gamma-two.vercel.app';
      
      // Check user's onboarding status and redirect accordingly
      if (req.user) {
        const user = req.user as any;
        const redirectUrl = user.onboardingCompleted ? '/dashboard' : '/onboarding';
        const fullUrl = `${frontendUrl}${redirectUrl}`;
        
        console.log('Auth callback - Redirecting to:', fullUrl);
        res.redirect(fullUrl);
      } else {
        console.error('Auth callback - No user found in session');
        res.redirect(frontendUrl);
      }
    }
  );

  // Logout
  app.get("/api/logout", (req: Request, res: Response, next: NextFunction) => {
    req.logout(function (err: any) {
      if (err) {
        return next(err);
      }
      // Hardcoded frontend URL for logout
      const frontendUrl = 'https://journal-gamma-two.vercel.app';
      console.log('Logout - Redirecting to:', frontendUrl);
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
