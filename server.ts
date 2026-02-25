import express from "express";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize SQLite database
const db = new Database("templates.db");
db.exec(`
  CREATE TABLE IF NOT EXISTS templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    baseTemplateId TEXT NOT NULL,
    zonesConfig TEXT NOT NULL,
    type TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // API: Save template
  app.post("/api/templates", (req, res) => {
    const { name, baseTemplateId, zonesConfig, type } = req.body;
    try {
      const stmt = db.prepare("INSERT INTO templates (name, baseTemplateId, zonesConfig, type) VALUES (?, ?, ?, ?)");
      const result = stmt.run(name, baseTemplateId, JSON.stringify(zonesConfig), type);
      res.json({ id: result.lastInsertRowid, status: "success" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // API: Get templates
  app.get("/api/templates", (req, res) => {
    try {
      const templates = db.prepare("SELECT * FROM templates ORDER BY createdAt DESC").all();
      // Parse zonesConfig back to object
      const parsedTemplates = templates.map((t: any) => ({
        ...t,
        zonesConfig: JSON.parse(t.zonesConfig)
      }));
      res.json(parsedTemplates);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // API: Delete template
  app.delete("/api/templates/:id", (req, res) => {
    const { id } = req.params;
    try {
      db.prepare("DELETE FROM templates WHERE id = ?").run(id);
      res.json({ status: "success" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Proxy route to bypass X-Frame-Options and CSP
  app.get("/api/proxy", async (req, res) => {
    const targetUrl = req.query.url as string;
    if (!targetUrl) return res.status(400).send("URL is required");

    try {
      const response = await axios.get(targetUrl, {
        responseType: "text",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        },
        timeout: 10000,
      });

      // Set headers to allow embedding
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Access-Control-Allow-Origin", "*");
      
      let html = response.data;
      
      // Inject <base> tag to fix relative links (CSS, JS, Images)
      try {
        const urlObj = new URL(targetUrl);
        const baseUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname.substring(0, urlObj.pathname.lastIndexOf('/') + 1)}`;
        
        // Find <head> and inject <base>
        if (html.includes("<head>")) {
          html = html.replace("<head>", `<head><base href="${baseUrl}">`);
        } else if (html.includes("<HEAD>")) {
          html = html.replace("<HEAD>", `<HEAD><base href="${baseUrl}">`);
        } else {
          html = `<base href="${baseUrl}">${html}`;
        }
      } catch (e) {
        console.error("Base URL error:", e);
      }

      res.send(html);
    } catch (error: any) {
      console.error("Proxy error:", error.message);
      res.status(500).send(`Error fetching URL: ${error.message}`);
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
