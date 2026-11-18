import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer as createViteServer } from "vite";
import { createApiApp } from "./server/app.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3000;
const HOST = "0.0.0.0";

async function startServer() {
  const app = createApiApp();

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.use((_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log("============================================================");
    console.log("Starting Goa Courier Services™ Google Review Reply System...");
    console.log(`Listening on http://${HOST}:${PORT}`);
    console.log("============================================================");
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
