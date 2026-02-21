import express from "express";
import { prisma } from "../config/db.ts";
import argon2 from "argon2";
import { randomBytes } from "crypto";
import { generateToken } from "../utils/generateToken.ts";

const register = async (req: express.Request, res: express.Response) => {
  const { email, password, fullName, username } = req.body;

  const developerExists = await prisma.developer.findUnique({
    where: { email: email },
  });

  const usernameTaken = await prisma.developer.findFirst({
    where: { username: username },
  });

  //   Check if user exists
  if (developerExists) {
    return res.status(400).json({
      error: "Looks like this email is already taken",
    });
  }
  //   Check is username is taken
  if (usernameTaken) {
    const newUsername = `${fullName.trim().toLowerCase()}${Math.floor(Math.random() * 10)}${randomBytes(2).toString("hex").slice(0, 3)}`;

    return res.status(400).json({
      error: `${username} is unavailable, try ${newUsername}`,
    });
  }

  //   Hash developer password
  const passwordHash = await argon2.hash(password);

  //   Create Developer
  const developer = await prisma.developer.create({
    data: { fullName, email, passwordHash, username },
  });

  // Generate JWT token
  const token = generateToken(developer.id, res);

  return res.status(201).json({
    status: "success",
    data: {
      developer: {
        id: developer.id,
        fullName: developer.fullName,
        email: developer.email,
        username: developer.username,
      },
    },
    token
  });
};

const login = async (req: express.Request, res: express.Response) => {
  const { email, password } = req.body;
  const key = email.includes("@") ? "email" : "username";

  // Check if developer exists
  const developerExists = await prisma.developer.findUnique({
    where: email.includes("@") ? { email } : { username: email },
  });

  if (!developerExists) {
    return res.status(401).json({
      error: `Invalid ${key} or password`,
    });
  }

  // Verify password
  const isPasswordValid = await argon2.verify(
    developerExists.passwordHash,
    password,
  );

  if (!isPasswordValid) {
    return res.status(401).json({
      error: `Invalid ${key} or password`,
    });
  }

  // Generate JWT token
  const token = generateToken(developerExists.id, res);

  res.status(200).json({
    status: "success",
    data: {
      developer: {
        id: developerExists.id,
        email: developerExists.email,
      },
    },
    token
  });
};

const logout = (req: express.Request, res: express.Response) => {
  res.clearCookie("jwt", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });
  res.status(200).json({
    status: "success",
    message: "Logged out successfully",
  });
};

export { register, login, logout };
