import "../instrument.mjs";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { ENV } from "./config/env.js";
import { connectDB } from "./config/db.js";
import { clerkMiddleware } from "@clerk/express";
import { functions, inngest } from "./config/inngest.js";
import { serve } from "inngest/express";
import chatRoutes from "./routes/chat.route.js";
import cors from "cors";
import * as Sentry from "@sentry/node";

const app = express();

// Get __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middlewares
app.use(express.json());
app.use(cors({ origin: ENV.CLIENT_URL, credentials: true }));
app.use(clerkMiddleware()); // req.auth will be available in the request object

// Debug Sentry route
app.get("/debug-sentry", (req, res) => {
  throw new Error("My first Sentry error!");
});

// API routes
app.use("/api/inngest", serve({ client: inngest, functions }));
app.use("/api/chat", chatRoutes);

// Serve frontend static files
app.use(express.static(path.join(__dirname, "public")));

// Catch-all route → frontend index.html (use RegExp, not "*")
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Sentry error handler (after routes)
Sentry.setupExpressErrorHandler(app);

const startServer = async () => {
  try {
    await connectDB();
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
