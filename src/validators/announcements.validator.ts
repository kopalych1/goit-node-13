import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

export const createAnnouncementSchema = z
  .object({
    title: z.string().min(3).max(100).openapi({ example: "Продам велосипед" }),
    description: z
      .string()
      .min(10)
      .max(2000)
      .openapi({ example: "Гірський велосипед, 21 швидкість" }),
    price: z.number().min(0).openapi({ example: 8000 }),
    category: z.string().min(2).max(50).openapi({ example: "sale" }),
  })
  .openapi("CreateAnnouncementBody");

export const updateAnnouncementSchema = createAnnouncementSchema
  .partial()
  .refine((v) => Object.keys(v).length > 0, {
    message: "At least one field is required",
  })
  .openapi("UpdateAnnouncementBody");

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive().openapi({ example: 1 }),
});

export const listQuerySchema = z.object({
  page: z.coerce
    .number()
    .int()
    .min(1)
    .optional()
    .default(1)
    .openapi({ example: 1 }),
  search: z.string().optional().openapi({ example: "ноутбук" }),
  sort: z.enum(["newest", "oldest"]).optional().default("newest"),
});
