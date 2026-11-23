import { z } from "zod";
import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
  extendZodWithOpenApi,
} from "@asteasolutions/zod-to-openapi";
import {
  registerSchema,
  loginSchema,
  refreshSchema,
} from "./validators/auth.validator.js";
import {
  createAnnouncementSchema,
  updateAnnouncementSchema,
  idParamSchema,
  listQuerySchema,
} from "./validators/announcements.validator.js";

extendZodWithOpenApi(z);

export const registry = new OpenAPIRegistry();

const bearerAuth = registry.registerComponent("securitySchemes", "bearerAuth", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
});

const UserSchema = z
  .object({
    id: z.number().int().openapi({ example: 1 }),
    username: z.string().openapi({ example: "ivan_petrenko" }),
    email: z.string().openapi({ example: "ivan@example.com" }),
    name: z.string().openapi({ example: "Іван" }),
  })
  .openapi("User");

const MeSchema = UserSchema.extend({
  createdAt: z.string().openapi({ example: "2025-01-10T12:00:00.000Z" }),
}).openapi("Me");

const TokensSchema = z
  .object({
    accessToken: z.string().openapi({ example: "eyJhbGci..." }),
    refreshToken: z.string().openapi({ example: "eyJhbGci..." }),
  })
  .openapi("Tokens");

const AuthResponseSchema = z
  .object({
    user: UserSchema,
    accessToken: z.string(),
    refreshToken: z.string(),
  })
  .openapi("AuthResponse");

const AnnouncementSchema = z
  .object({
    id: z.number().int().openapi({ example: 5 }),
    title: z.string().openapi({ example: "Продам ноутбук ASUS" }),
    description: z.string().openapi({ example: "Відмінний стан, 16GB RAM" }),
    price: z.number().openapi({ example: 18000 }),
    category: z.string().openapi({ example: "sale" }),
    createdAt: z.string().openapi({ example: "2025-01-10T12:00:00.000Z" }),
    updatedAt: z.string().openapi({ example: "2025-01-10T12:00:00.000Z" }),
    user: UserSchema,
  })
  .openapi("Announcement");

const AnnouncementListSchema = z
  .object({
    data: z.array(AnnouncementSchema),
    pagination: z.object({
      total: z.number().int().openapi({ example: 23 }),
      page: z.number().int().openapi({ example: 2 }),
      totalPages: z.number().int().openapi({ example: 3 }),
      perPage: z.number().int().openapi({ example: 10 }),
    }),
  })
  .openapi("AnnouncementList");

const ErrorSchema = z
  .object({
    message: z.string().openapi({ example: "Validation error" }),
    errors: z
      .array(z.object({ field: z.string(), message: z.string() }))
      .optional(),
  })
  .openapi("Error");

const json = <T extends z.ZodType>(schema: T) => ({
  "application/json": { schema },
});
const err = (description: string) => ({
  description,
  content: json(ErrorSchema),
});
const secured = [{ [bearerAuth.name]: [] }];

// ---------- Auth ----------
registry.registerPath({
  method: "post",
  path: "/auth/register",
  tags: ["Auth"],
  summary: "Реєстрація користувача",
  request: { body: { required: true, content: json(registerSchema) } },
  responses: {
    201: { description: "Створено", content: json(AuthResponseSchema) },
    400: err("Помилка валідації"),
    409: err("Username or email already taken"),
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/login",
  tags: ["Auth"],
  summary: "Вхід користувача",
  request: { body: { required: true, content: json(loginSchema) } },
  responses: {
    200: { description: "Успішний вхід", content: json(AuthResponseSchema) },
    400: err("Помилка валідації"),
    401: err("Invalid credentials"),
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/refresh",
  tags: ["Auth"],
  summary: "Оновлення пари токенів (token rotation)",
  request: { body: { required: true, content: json(refreshSchema) } },
  responses: {
    200: { description: "Нова пара токенів", content: json(TokensSchema) },
    400: err("Помилка валідації"),
    401: err("Невалідний refresh token"),
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/logout",
  tags: ["Auth"],
  summary: "Вихід (інвалідація refresh token)",
  security: secured,
  responses: {
    204: { description: "Без тіла відповіді" },
    401: err("Не автентифіковано"),
  },
});

registry.registerPath({
  method: "get",
  path: "/auth/me",
  tags: ["Auth"],
  summary: "Профіль поточного користувача",
  security: secured,
  responses: {
    200: { description: "Профіль", content: json(MeSchema) },
    401: err("Не автентифіковано"),
  },
});

// ---------- Announcements ----------
registry.registerPath({
  method: "get",
  path: "/announcements",
  tags: ["Announcements"],
  summary: "Список оголошень (пагінація, пошук, сортування)",
  request: { query: listQuerySchema },
  responses: {
    200: { description: "Список", content: json(AnnouncementListSchema) },
    400: err("Помилка валідації"),
  },
});

registry.registerPath({
  method: "get",
  path: "/announcements/{id}",
  tags: ["Announcements"],
  summary: "Одне оголошення за ID",
  request: { params: idParamSchema },
  responses: {
    200: { description: "Оголошення", content: json(AnnouncementSchema) },
    400: err("Помилка валідації"),
    404: err("Не знайдено"),
  },
});

registry.registerPath({
  method: "post",
  path: "/announcements",
  tags: ["Announcements"],
  summary: "Створити оголошення",
  security: secured,
  request: {
    body: { required: true, content: json(createAnnouncementSchema) },
  },
  responses: {
    201: { description: "Створено", content: json(AnnouncementSchema) },
    400: err("Помилка валідації"),
    401: err("Не автентифіковано"),
  },
});

registry.registerPath({
  method: "patch",
  path: "/announcements/{id}",
  tags: ["Announcements"],
  summary: "Часткове оновлення (лише автор)",
  security: secured,
  request: {
    params: idParamSchema,
    body: { required: true, content: json(updateAnnouncementSchema) },
  },
  responses: {
    200: { description: "Оновлено", content: json(AnnouncementSchema) },
    400: err("Помилка валідації"),
    401: err("Не автентифіковано"),
    403: err("Access denied"),
    404: err("Не знайдено"),
  },
});

registry.registerPath({
  method: "delete",
  path: "/announcements/{id}",
  tags: ["Announcements"],
  summary: "Видалити оголошення (лише автор)",
  security: secured,
  request: { params: idParamSchema },
  responses: {
    204: { description: "Видалено, без тіла відповіді" },
    400: err("Помилка валідації"),
    401: err("Не автентифіковано"),
    403: err("Access denied"),
    404: err("Не знайдено"),
  },
});

export const generateOpenApiDocument = () =>
  new OpenApiGeneratorV3(registry.definitions).generateDocument({
    openapi: "3.0.0",
    info: { title: "Announcements Board API", version: "1.0.0" },
    servers: [{ url: "/" }],
  });
