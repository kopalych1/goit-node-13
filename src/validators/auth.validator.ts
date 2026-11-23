import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

export const registerSchema = z
  .object({
    username: z
      .string()
      .min(3)
      .max(30)
      .regex(/^[a-zA-Z0-9_]+$/, "Only letters, digits and underscore")
      .openapi({ example: "ivan_petrenko" }),
    email: z.string().email().max(100).openapi({ example: "ivan@example.com" }),
    password: z.string().min(6).max(100).openapi({ example: "secret123" }),
    name: z.string().min(1).max(50).openapi({ example: "Іван" }),
  })
  .openapi("RegisterBody");

export const loginSchema = z
  .object({
    username: z.string().min(1).openapi({ example: "ivan_petrenko" }),
    password: z.string().min(1).openapi({ example: "secret123" }),
  })
  .openapi("LoginBody");

export const refreshSchema = z
  .object({
    refreshToken: z.string().min(1).openapi({ example: "eyJhbGci..." }),
  })
  .openapi("RefreshBody");
