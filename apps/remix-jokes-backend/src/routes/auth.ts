import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import express, { NextFunction, Request, Response } from "express";
import { db } from "../db.server";
import type { User } from "@prisma/client";
import redisClient from "../redis_client";

const ACCESS_TOKEN_EXPIRATION_TIME = "90m";
const REFRESH_TOKEN_EXPIRATION_TIME = "1y";
const ISSUER = "[APPNAME, DOMAIN, ...]";

declare module "jsonwebtoken" {
  export interface UserIDJwtPayload extends jwt.JwtPayload {
    userId: string;
  }
}

if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

const redisRefreshTokensBlacklist = redisClient;

const router = express.Router();

const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;
if (!accessTokenSecret) {
  throw new Error("ACCESS_TOKEN_SECRET must be set");
}

const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET;
if (!refreshTokenSecret) {
  throw new Error("REFRESH_TOKEN_SECRET must be set");
}

// Authentication Middleware
async function authenticateUser(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(422)
        .json({ message: "Username and password must be provided" });
    }

    const user = await db.user.findUnique({
      where: { username },
      include: {
        password: true,
      },
    });

    if (user && user.password) {
      const isCorrectPassword = await bcrypt.compare(
        password,
        user.password.hash
      );
      if (isCorrectPassword) {
        req.user = user;
        next();
      } else {
        return res.status(403).json({ message: "Error: incorrect password" });
      }
    } else {
      return res.status(403).json({ message: "Error: user doesn't exists" });
    }
  } catch (error) {
    return res.status(403).json({ message: "Error: database error" });
  }
}

function generateAccessToken(userId: string) {
  const payload = { userId };
  const options = {
    expiresIn: ACCESS_TOKEN_EXPIRATION_TIME,
    issuer: ISSUER,
    audience: userId,
  };

  if (!accessTokenSecret) {
    throw new Error("ACCESS_TOKEN_SECRET must be set");
  }
  return jwt.sign(payload, accessTokenSecret, options);
}

function generateRefreshToken(userId: string) {
  const payload = { userId };
  const options = {
    expiresIn: REFRESH_TOKEN_EXPIRATION_TIME,
    issuer: ISSUER,
    audience: userId,
  };
  if (!refreshTokenSecret) {
    throw new Error("REFRESH_TOKEN_SECRET must be set");
  }
  return jwt.sign(payload, refreshTokenSecret, options);
}

// params: username, password in req.body
router.post("/login", authenticateUser, async (req: Request, res: Response) => {
  // The frontend should check if the has a cookie with the tokens before making this call, if it has them, then it's already logged in

  // We get the user id from the middleware
  const userId = req.user.id;

  try {
    const accessToken = generateAccessToken(userId);
    const refreshToken = generateRefreshToken(userId);
    if (accessToken && refreshToken) {
      // Delete from blacklist if it had it
      await redisRefreshTokensBlacklist.DEL(userId);
      res
        .status(200)
        .json({ accessToken: accessToken, refreshToken: refreshToken });
    } else {
      res.status(500).json({ message: "Error: could not generate tokens" });
    }
  } catch (error) {
    res.status(500).json({ message: "Authorization token not found." });
  }
});

router.post("/register", async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(422)
        .json({ message: "Username and password must be provided" });
    }

    const userExists = await db.user.findFirst({
      where: { username },
    });

    if (userExists) {
      return res.status(422).json({ message: "User already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user: User = await db.user.create({
      data: {
        username,
        password: {
          create: {
            hash: passwordHash,
          },
        },
      },
    });

    if (user?.id) {
      const userId = user.id;
      try {
        const accessToken = generateAccessToken(user.id);
        const refreshToken = generateRefreshToken(userId);
        if (accessToken && refreshToken) {
          res
            .status(200)
            .json({ accessToken: accessToken, refreshToken: refreshToken });
        } else {
          res.status(500).json({ message: "Error: could not generate tokens" });
        }
      } catch (error) {
        res.status(500).json({ message: "Authorization token not found." });
      }
    } else {
      return res
        .status(422)
        .json({ message: "Error creating user in the database" });
    }
  } catch (error) {
    console.error(error);
    return res.status(400).json({ message: "Error creating user" });
  }
});

// Route to create a new access token if the user has a valid refresh token
router.post("/token", async (req: Request, res: Response) => {
  const refreshToken = req.body.refreshToken;

  if (refreshToken === null) return res.sendStatus(401);

  try {
    const payload = <jwt.UserIDJwtPayload>(
      jwt.verify(refreshToken, refreshTokenSecret)
    );
    const response = await redisRefreshTokensBlacklist.GET(payload.userId);
    if (response === null) {
      // Token has not been found
      const accessToken = generateAccessToken(payload.userId);
      return res
        .status(200)
        .json({ accessToken: accessToken, refreshToken: refreshToken });
    }
    return res.status(403).json({ message: "Error: please log in again" });
  } catch (error) {
    return res.status(403).json({ message: (error as Error).message });
  }
});

router.delete("/logout", async (req, res) => {
  const refreshToken = req.body.refreshToken;

  if (refreshToken === null) return res.sendStatus(401);

  try {
    const payload = <jwt.UserIDJwtPayload>(
      jwt.verify(refreshToken, refreshTokenSecret)
    );

    // If we have a valid refresh token, we can add it to the Redis blacklist for 1y
    const timeout = 365 * 24 * 60 * 60;

    const response = await redisRefreshTokensBlacklist.SET(
      payload.userId,
      refreshToken
    );
    await redisClient.expire(payload.userId, timeout);
    if (response) {
      return res
        .status(200)
        .json({ message: "Successfully logged out manually" });
    }
  } catch (error) {
    return res.status(403).json({ message: (error as Error).message });
  }
});

export function authorizationRequired(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null) return res.sendStatus(401);

  if (!accessTokenSecret) {
    res.status(500).json({ message: "Authorization token not found." });
  } else {
    jwt.verify(token, accessTokenSecret, (err, payload) => {
      // if the client gets back a 401, it needs to refresh the access token with the refresh token using the /token route
      if (err) {
        console.error(err.message);
        return res.sendStatus(401);
      }
      req.user = payload;
      next();
    });
  }
}

router.get("/test", authorizationRequired, (req, res) => {
  res.status(200).json({ message: "Authorized" });
});

export default router;
