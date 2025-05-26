import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../db/schema";
import { PubSub } from "graphql-subscriptions";
import { Request, Response } from 'express';

export interface User {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  // Add any other fields you expect from the user object
}

import { Session as ExpressSession } from 'express-session';

export interface Session extends ExpressSession {
  user?: User;
  // Add any other session properties you need
}

declare module 'express-session' {
  interface SessionData {
    user?: User;
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export interface GraphqlContext {
  user?: User | null;
  session: Session | null;
  req: Request;
  res: Response;
  db: PostgresJsDatabase<typeof schema> & {
    $client: postgres.Sql<{}>;
  };
  pubsub: PubSub;
}
