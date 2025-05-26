import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import express, { NextFunction } from "express";
import http from "http";
import cors from "cors";
import resolvers from "./graphql/resolvers/index.js";
import typeDefs from "./graphql/typeDefs/index.js";
import { db } from "./db/index.js";
import { PubSub } from "graphql-subscriptions";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { WebSocketServer } from "ws";
import { useServer } from "graphql-ws/lib/use/ws";
import type { CorsOptions, CorsRequest } from "cors";
// --- Modular auth imports ---
import { setupPassport } from "./auth/passport.js";
import { registerAuthRoutes } from "./auth/routes.js";
import passport from "passport";
import session from "express-session";
import { env } from "./utils/env.js";

// Load environment variables
console.log('🌐 Environment:', {
  NODE_ENV: env.NODE_ENV,
  APP_URL: env.APP_URL,
  API_URL: env.API_URL,
  DATABASE_URL: env.DATABASE_URL ? '✅ Set' : '❌ Missing',
  SESSION_SECRET: env.SESSION_SECRET ? '✅ Set' : '❌ Missing',
  GOOGLE_CLIENT_ID: env.GOOGLE_CLIENT_ID ? '✅ Set' : '❌ Missing',
  GOOGLE_CALLBACK_URL: env.GOOGLE_CALLBACK_URL,
});

interface MyContext {
  token?: String;
}

// CORS configuration
const corsOptions: CorsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) {
      return callback(null, true);
    }
    
    try {
      const originUrl = new URL(origin);
      const allowedOrigins = Array.isArray(env.CORS_ORIGIN) 
        ? env.CORS_ORIGIN 
        : [env.CORS_ORIGIN];
      
      const isAllowed = allowedOrigins.some(allowed => {
        try {
          const allowedUrl = new URL(allowed);
          return originUrl.hostname === allowedUrl.hostname && 
                originUrl.protocol === allowedUrl.protocol;
        } catch {
          return false;
        }
      });
      
      if (isAllowed || origin.endsWith('studio.apollographql.com')) {
        return callback(null, true);
      }
      
      console.log("CORS blocked origin:", origin);
      return callback(new Error(`Origin '${origin}' not allowed by CORS`));
    } catch (error) {
      console.error('Error processing CORS origin:', error);
      return callback(null, false);
    }
  },
  credentials: true,
  optionsSuccessStatus: 200 // Some legacy browsers choke on 204
};

const app = express();

// Session configuration
app.use(
  session({
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: env.isProduction,
      httpOnly: true,
      sameSite: env.isProduction ? 'none' : 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
      domain: env.isProduction ? new URL(env.APP_URL).hostname : undefined,
    },
  })
);

// Trust proxy in production for correct cookie handling
if (env.isProduction) {
  app.set("trust proxy", 1);
}

const httpServer = http.createServer(app);

// --- Auth setup ---
setupPassport();

// Initialize Passport and session
app.use(passport.initialize());
app.use(passport.session());

// Register auth routes
registerAuthRoutes(app);

// Create a PubSub instance
const pubsub = new PubSub();

// Create executable schema
const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

// Set up WebSocket server for subscriptions
const wsServer = new WebSocketServer({
  server: httpServer,
  path: "/graphql",
});

// Set up WebSocket server
const serverCleanup = useServer(
  {
    schema,
    context: async (ctx: { connectionParams?: { session?: any } }) => {
      // Get session from connection params if available
      const session = ctx.connectionParams?.session || null;
      return { session, db, pubsub };
    },
  },
  wsServer
);

// Create Apollo Server
const server = new ApolloServer<MyContext>({
  schema,
  csrfPrevention: true,
  plugins: [
    ApolloServerPluginDrainHttpServer({ httpServer }),
    {
      async serverWillStart() {
        return {
          async drainServer() {
            await serverCleanup.dispose();
          },
        };
      },
    },
  ],
});

// Only apply CORS, express.json, etc. to /graphql
async function startServer() {
  await server.start();

  app.use(
    "/graphql",
    cors(corsOptions),
    express.json(),
    expressMiddleware(server, {
      context: async ({ req, res }) => {
        // Get user from either Passport's req.user or session
        const user = req.user || req.session?.user || null;
        console.log("GraphQL context - user:", user);

        return {
          db,
          user,
          session: req.session,
          req,
          res,
          pubsub,
        };
      },
    })
  );

  const port = process.env.PORT || 4000;
  await new Promise<void>((resolve) => httpServer.listen({ port }, resolve));

  console.log(`🚀 Server ready at http://localhost:${port}/graphql`);
  console.log(`🔌 WebSocket server ready at ws://localhost:${port}/graphql/ws`);
}

startServer();
