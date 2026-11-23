import { Request, Response, NextFunction } from "express";
import { ZodType } from "zod";

const formatIssues = (error: {
  issues: { path: PropertyKey[]; message: string }[];
}) =>
  error.issues.map((i) => ({ field: i.path.join("."), message: i.message }));

export const validateBody =
  (schema: ZodType) => (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body ?? {});
    if (!result.success) {
      return res
        .status(400)
        .json({
          message: "Validation error",
          errors: formatIssues(result.error),
        });
    }
    req.body = result.data;
    next();
  };

export const validateParams =
  (schema: ZodType) => (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      return res
        .status(400)
        .json({
          message: "Validation error",
          errors: formatIssues(result.error),
        });
    }
    next();
  };

// В Express 4 req.query можно перезаписывать; кладём результат в res.locals на случай Express 5
export const validateQuery =
  (schema: ZodType) => (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return res
        .status(400)
        .json({
          message: "Validation error",
          errors: formatIssues(result.error),
        });
    }
    res.locals.query = result.data;
    next();
  };
