import { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import prisma from "../../prisma/client.js";

const publicUser = {
  id: true,
  username: true,
  email: true,
  name: true,
} as const;

const issueTokens = async (user: { id: number; username: string }) => {
  const secret = process.env.JWT_SECRET as string;
  const accessToken = jwt.sign({ username: user.username }, secret, {
    subject: String(user.id),
    expiresIn: "15m",
  });
  // jti гарантирует уникальность токена даже при выдаче в ту же секунду
  const refreshToken = jwt.sign({ username: user.username }, secret, {
    subject: String(user.id),
    expiresIn: "7d",
    jwtid: randomUUID(),
  });
  return { accessToken, refreshToken };
};

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { username, email, password, name } = req.body;

    const existing = await prisma.user.findFirst({
      where: { OR: [{ username }, { email }] },
    });
    if (existing) {
      return res
        .status(409)
        .json({ message: "Username or email already taken" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { username, email, password: hashed, name },
      select: publicUser,
    });

    const tokens = await issueTokens(user);
    await prisma.refreshToken.create({
      data: { token: tokens.refreshToken, userId: user.id },
    });

    res.status(201).json({ user, ...tokens });
  } catch (err) {
    next(err);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { username, password } = req.body;

    const found = await prisma.user.findUnique({ where: { username } });
    const valid = found
      ? await bcrypt.compare(password, found.password)
      : false;
    if (!found || !valid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const tokens = await issueTokens(found);
    // Старый refresh token заменяется новым
    await prisma.$transaction([
      prisma.refreshToken.deleteMany({ where: { userId: found.id } }),
      prisma.refreshToken.create({
        data: { token: tokens.refreshToken, userId: found.id },
      }),
    ]);

    const { password: _pw, createdAt: _c, ...user } = found;
    res.status(200).json({ user, ...tokens });
  } catch (err) {
    next(err);
  }
};

export const refresh = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { refreshToken } = req.body;

    let payload: { sub?: string; username?: string };
    try {
      payload = jwt.verify(refreshToken, process.env.JWT_SECRET as string) as {
        sub?: string;
        username?: string;
      };
    } catch {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const stored = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });
    if (!stored) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const tokens = await issueTokens(stored.user);
    // Rotation: старый удаляем, новый записываем
    await prisma.$transaction([
      prisma.refreshToken.deleteMany({ where: { token: refreshToken } }),
      prisma.refreshToken.create({
        data: { token: tokens.refreshToken, userId: stored.userId },
      }),
    ]);

    res.status(200).json(tokens);
  } catch (err) {
    next(err);
  }
};

export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    await prisma.refreshToken.deleteMany({ where: { userId: req.user!.sub } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

export const me = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.sub },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
};
