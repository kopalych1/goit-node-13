import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import swaggerUi from "swagger-ui-express";
import { Prisma } from "./prisma/client.js";
import authRoutes from "./src/routes/auth.routes.js";
import announcementsRoutes from "./src/routes/announcements.routes.js";
import { generateOpenApiDocument } from "./src/openapi.js";

const app = express();

app.use(express.json());

app.use("/auth", authRoutes);
app.use("/announcements", announcementsRoutes);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(generateOpenApiDocument()));

app.use((_req: Request, res: Response) => {
  res.status(404).json({ message: "Not found" });
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
    return res.status(404).json({ message: "Record not found" });
  }
  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json({ message: "Invalid JSON" });
  }
  console.error(err);
  res.status(500).json({ message: "Internal server error" });
});

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`API docs: http://localhost:${PORT}/api-docs`);
});

export default app;
