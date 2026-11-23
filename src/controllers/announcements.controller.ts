import { Request, Response, NextFunction } from "express";
import { Prisma } from "../../prisma/client.js";
import prisma from "../../prisma/client.js";

const PER_PAGE = 10;

const include = {
  user: { select: { id: true, username: true, email: true, name: true } },
} as const;

// userId отдельно не отдаём: автор уже есть в поле user
const omit = { userId: true } as const;

export const list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, search, sort } = res.locals.query as {
      page: number;
      search?: string;
      sort: "newest" | "oldest";
    };

    const where: Prisma.AnnouncementWhereInput = search?.trim()
      ? { title: { contains: search.trim(), mode: "insensitive" } }
      : {};
    const orderBy: Prisma.AnnouncementOrderByWithRelationInput = {
      createdAt: sort === "oldest" ? "asc" : "desc",
    };

    const [data, total] = await Promise.all([
      prisma.announcement.findMany({
        where,
        orderBy: [orderBy, { id: sort === "oldest" ? "asc" : "desc" }],
        skip: (page - 1) * PER_PAGE,
        take: PER_PAGE,
        include,
        omit,
      }),
      prisma.announcement.count({ where }),
    ]);

    res.status(200).json({
      data,
      pagination: {
        total,
        page,
        totalPages: Math.ceil(total / PER_PAGE),
        perPage: PER_PAGE,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getOne = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = Number(req.params.id);
    const announcement = await prisma.announcement.findUnique({
      where: { id },
      include,
      omit,
    });
    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found" });
    }
    res.status(200).json(announcement);
  } catch (err) {
    next(err);
  }
};

export const create = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { title, description, price, category } = req.body;
    const announcement = await prisma.announcement.create({
      data: { title, description, price, category, userId: req.user!.sub },
      include,
      omit,
    });
    res.status(201).json(announcement);
  } catch (err) {
    next(err);
  }
};

export const update = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.announcement.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: "Announcement not found" });
    }
    if (existing.userId !== req.user!.sub) {
      return res.status(403).json({ message: "Access denied" });
    }
    const announcement = await prisma.announcement.update({
      where: { id },
      data: req.body,
      include,
      omit,
    });
    res.status(200).json(announcement);
  } catch (err) {
    next(err);
  }
};

export const remove = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.announcement.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: "Announcement not found" });
    }
    if (existing.userId !== req.user!.sub) {
      return res.status(403).json({ message: "Access denied" });
    }
    await prisma.announcement.delete({ where: { id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};
