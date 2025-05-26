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
    passport.authenticate("google", { failureRedirect: "/" }),
    (req: Request, res: Response) => {
      const frontendUrl =
        process.env.NODE_ENV === "production"
          ? "https://journal-gamma-two.vercel.app"
          : "http://localhost:3000";
      res.redirect(frontendUrl);
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
}
