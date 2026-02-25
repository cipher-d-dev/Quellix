import express from "express";
import { prisma } from "../config/db.ts";
import argon2 from "argon2";
import { randomBytes } from "crypto";
import { generateToken } from "../utils/generateToken.ts";

const register = async (req: express.Request, res: express.Response) => {
  try {
    const { email, password, fullName, username } = req.body;

    // Check if email exists
    const developerExists = await prisma.developer.findUnique({
      where: { email },
    });

    if (developerExists) {
      return res.status(400).json({
        success: false,
        error: "Looks like this email is already taken",
      });
    }

    // Check if username is taken (only if username was provided)
    if (username) {
      const usernameTaken = await prisma.developer.findUnique({
        where: { username },
      });

      if (usernameTaken) {
        // Use fullName if available, otherwise use email prefix
        const base = fullName?.trim() || email.split("@")[0];
        const newUsername = `${base.toLowerCase().replace(/\s+/g, "")}${Math.floor(Math.random() * 1000)}${randomBytes(2).toString("hex").slice(0, 3)}`;

        return res.status(400).json({
          success: false,
          error: `${username} is unavailable, try ${newUsername}`,
        });
      }
    }

    // Hash developer password
    const passwordHash = await argon2.hash(password);

    // Create Developer
    const developer = await prisma.developer.create({
      data: {
        fullName: fullName || null,
        email,
        passwordHash,
        username: username || null,
        emailVerified: false, // Will be set to true after email verification
      },
    });

    // Generate JWT token and set cookie
    generateToken(developer.id, res);

    return res.status(201).json({
      success: true,
      message:
        "Account created successfully! Please check your email to verify your account.",
      data: {
        developer: {
          id: developer.id,
          fullName: developer.fullName,
          email: developer.email,
          username: developer.username,
          emailVerified: developer.emailVerified,
        },
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({
      success: false,
      error: "Something went wrong during registration. Please try again.",
    });
  }
};

const login = async (req: express.Request, res: express.Response) => {
  try {
    const { email, password } = req.body;

    // Check if developer exists
    const developer = await prisma.developer.findUnique({
      where: { email },
    });

    if (!developer) {
      return res.status(401).json({
        success: false,
        error: "Invalid email or password",
      });
    }

    // Verify password
    const isPasswordValid = await argon2.verify(
      developer.passwordHash,
      password,
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: "Invalid email or password",
      });
    }

    // Optional: Block unverified users from logging in
    // Uncomment if you want to enforce email verification
    // if (!developer.emailVerified) {
    //   return res.status(403).json({
    //     success: false,
    //     error: "Please verify your email before logging in"
    //   })
    // }

    // Generate JWT token and set cookie
    generateToken(developer.id, res);

    return res.status(200).json({
      success: true,
      message: "Logged in successfully",
      data: {
        developer: {
          id: developer.id,
          fullName: developer.fullName,
          email: developer.email,
          username: developer.username,
          emailVerified: developer.emailVerified,
        },
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      success: false,
      error: "Something went wrong during login. Please try again.",
    });
  }
};

const logout = (req: express.Request, res: express.Response) => {
  try {
    res.clearCookie("jwt", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({
      success: false,
      error: "Something went wrong during logout. Please try again.",
    });
  }
};

export { register, login, logout };
