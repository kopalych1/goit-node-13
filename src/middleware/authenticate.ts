import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const token = header.slice(7).trim();
  try {
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET as string,
    ) as unknown as {
      sub: string | number;
      username: string;
    };
    req.user = { sub: Number(payload.sub), username: payload.username };
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
