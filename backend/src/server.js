import "../instrument.mjs"; // Sentry initialization
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { ENV } from "./config/env.js";
import { connectDB } from "./config/db.js";
import { clerkMiddleware } from "@clerk/express";
// Inngest will be imported dynamically inside startServer to avoid
// path-to-regexp errors during module evaluation.
let functions, inngest;
import chatRoutes from "./routes/chat.route.js";
import cors from "cors";
import * as Sentry from "@sentry/node";

const app = express();

// Helper to safely execute a registration and log errors without crashing
const safe = (fn, desc) => {
  try {
    fn();
    console.log(`Registered: ${desc}`);
  } catch (err) {
    console.error(`Failed to register: ${desc}`);
    console.error(err && err.stack ? err.stack : err);
  }
};

// Get __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Sentry middleware (v7 stable) ---
safe(() => app.use(Sentry.Handlers.requestHandler()), 'Sentry requestHandler');
safe(() => app.use(Sentry.Handlers.tracingHandler()), 'Sentry tracingHandler');

// --- Middlewares ---
safe(() => app.use(express.json()), 'express.json');
safe(() => app.use(cors({ origin: ENV.CLIENT_URL, credentials: true })), 'cors');
safe(() => app.use(clerkMiddleware()), 'clerkMiddleware');

// --- Debug Sentry route ---
safe(() => app.get("/debug-sentry", (req, res) => {
  throw new Error("My first Sentry error!");
}), '/debug-sentry');

// --- API routes ---
safe(() => app.use("/api/chat", chatRoutes), '/api/chat routes');

// --- Inngest route ---
// We'll dynamically import and mount Inngest functions inside startServer
// (see startServer below).

// --- Serve frontend static files ---
const publicPath = path.join(__dirname, "../public");
safe(() => app.use(express.static(publicPath)), 'static publicPath');

// --- Catch-all route for React Router ---
// Must come after express.static
safe(() => app.get("/*", (req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
}), 'catch-all /*');

// --- Sentry error handler (after all routes) ---
safe(() => app.use(Sentry.Handlers.errorHandler()), 'Sentry errorHandler');

// --- Start server ---
const startServer = async () => {
  try {
    await connectDB();
    // Dynamically import Inngest config so any path-to-regexp parse errors
    // don't crash the module load phase.
    try {
      const inngestModule = await import("./config/inngest.js");
      functions = inngestModule.functions;
      inngest = inngestModule.inngest;

      if (functions && inngest) {
        try {
          const { serve } = await import("inngest/express");
          app.use("/api/inngest", serve({ client: inngest, functions }));
        } catch (e) {
          console.error("Failed to mount Inngest routes at runtime:", e.message || e);
        }
      }
    } catch (e) {
      console.warn("Unable to load Inngest config dynamically:", e.message || e);
    }
    // Debug: list registered routes (best-effort)
    try {
      if (app._router && app._router.stack) {
        console.log("Registered routes:");
        app._router.stack.forEach((layer) => {
          if (layer.route && layer.route.path) {
            const methods = Object.keys(layer.route.methods).join(",");
            console.log(`  ${methods} ${layer.route.path}`);
          } else if (layer.name === "router" && layer.regexp) {
            console.log(`  router ${layer.regexp}`);
          }
        });
      }
    } catch (err) {
      console.warn("Could not list routes:", err.message || err);
    }
    app.listen(ENV.PORT, () => {
      console.log("🚀 Server started on port:", ENV.PORT);
    });
  } catch (error) {
    console.error("❌ Error starting server:", error);
    process.exit(1);
  }
};

startServer();

export default app;
