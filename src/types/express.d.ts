import { User } from "./types.utils";

declare global {
  namespace Express {
    // Extend the Express Request type to include Passport.js methods
    interface Request {
      // These are the standard Passport.js methods
      login(user: any, callback: (err?: any) => void): void;
      login(user: any, options: any, callback: (err?: any) => void): void;
      logout(callback: (err?: any) => void): void;
      logout(): void;
      isAuthenticated(): boolean;
      isUnauthenticated(): boolean;
      
      // The user property is added by Passport
      user?: User;
      
      // The session property is added by express-session
      session?: any;
    }
  }
}

export {};
