import { Hono } from "https://deno.land/x/hono/mod.ts";
import { cors, logger } from "https://deno.land/x/hono/middleware.ts";
import * as kv from "./kv_store.tsx";
const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-8303dfdf/health", (c: any) => {
  return c.text("OK");
});

if (typeof Deno !== "undefined" && Deno.serve) {
  Deno.serve(app.fetch);
}