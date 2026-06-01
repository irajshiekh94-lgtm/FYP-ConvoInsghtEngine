import express from "express";
import type { Request, Response, NextFunction } from "express";
import http from "http";
import { registerRoutes } from "./routes";
import fs from "fs";
import path from "path";

const app = express();
const log = console.log;

/* ---------------------------------- TYPES --------------------------------- */
declare module "http" {
  interface IncomingMessage {
    rawBody?: Buffer;
  }
}

/* ---------------------------------- CORS ---------------------------------- */
function setupCors(app: express.Application) {
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS"
    );
    res.header("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }

    next();
  });
}

/* ------------------------------ BODY PARSING ------------------------------- */
function setupBodyParsing(app: express.Application) {
  app.use(
    express.json({
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      },
    })
  );
  app.use(express.urlencoded({ extended: false }));
}

/* ----------------------------- REQUEST LOGGING ----------------------------- */
function setupRequestLogging(app: express.Application) {
  app.use((req, res, next) => {
    const start = Date.now();

    res.on("finish", () => {
      if (!req.path.startsWith("/api")) return;
      const duration = Date.now() - start;
      log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
    });

    next();
  });
}

/* ----------------------------- EXPO UTILITIES ------------------------------ */
function getAppName(): string {
  try {
    const appJson = JSON.parse(
      fs.readFileSync(path.resolve(process.cwd(), "app.json"), "utf-8")
    );
    return appJson.expo?.name ?? "Expo App";
  } catch {
    return "Expo App";
  }
}

function serveExpoManifest(platform: string, res: Response) {
  const manifestPath = path.resolve(
    process.cwd(),
    "static-build",
    platform,
    "manifest.json"
  );

  if (!fs.existsSync(manifestPath)) {
    return res.status(404).json({
      error: `Manifest not found for platform: ${platform}`,
    });
  }

  res.setHeader("expo-protocol-version", "1");
  res.setHeader("expo-sfv-version", "0");
  res.setHeader("content-type", "application/json");

  res.send(fs.readFileSync(manifestPath, "utf-8"));
}

function serveLandingPage(req: Request, res: Response, template: string) {
  const protocol = req.protocol || "http";
  const host = req.get("host");
  const baseUrl = `${protocol}://${host}`;

  const html = template
    .replace(/BASE_URL_PLACEHOLDER/g, baseUrl)
    .replace(/APP_NAME_PLACEHOLDER/g, getAppName());

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}

function configureExpoRouting(app: express.Application) {
  log("Serving static Expo files with dynamic manifest routing");

  const templatePath = path.resolve(
    process.cwd(),
    "server",
    "templates",
    "landing-page.html"
  );

  const landingTemplate = fs.existsSync(templatePath)
    ? fs.readFileSync(templatePath, "utf-8")
    : "<h1>Expo App</h1>";

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith("/api")) return next();

    if (req.path === "/" || req.path === "/manifest") {
      const platform = req.header("expo-platform");
      if (platform === "ios" || platform === "android") {
        return serveExpoManifest(platform, res);
      }

      if (req.path === "/") {
        return serveLandingPage(req, res, landingTemplate);
      }
    }

    next();
  });

  app.use("/assets", express.static(path.resolve(process.cwd(), "assets")));
  app.use(express.static(path.resolve(process.cwd(), "static-build")));

  log("Expo routing enabled");
}

/* ------------------------------ ERROR HANDLER ------------------------------ */
function setupErrorHandler(app: express.Application) {
  app.use(
    (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
      const error = err as { status?: number; message?: string };
      res.status(error.status ?? 500).json({
        message: error.message ?? "Internal Server Error",
      });
      console.error(err);
    }
  );
}

/* --------------------------------- BOOT ---------------------------------- */
(async () => {
  setupCors(app);
  setupBodyParsing(app);
  setupRequestLogging(app);

  configureExpoRouting(app);

  const server: http.Server = await registerRoutes(app);

  setupErrorHandler(app);

  // ✅ SAFE PORT (macOS-compatible)
  const PORT = Number(process.env.PORT) || 3001;
  const HOST = "127.0.0.1";

  server.on("error", (err: any) => {
    if (err.code === "EADDRINUSE") {
      console.error(`❌ Port ${PORT} is already in use`);
      process.exit(1);
    }
    throw err;
  });

  server.listen(PORT, HOST, () => {
    log(`✅ Express server running at http://${HOST}:${PORT}`);
  });
})();
