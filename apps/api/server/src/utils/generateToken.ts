import e from "express";
import jwt from "jsonwebtoken"

interface TokenPayload {
  id: string
}

export const generateToken = (userId: string, res: e.Response): string => {
  const secretKey = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRES_IN || "7d";

  if (!secretKey) {
    throw new Error("JWT_SECRET must be defined in environment variables")
  }

  const payload: TokenPayload = { id: userId };
  
  const token = jwt.sign(payload, secretKey as string, { expiresIn } as jwt.SignOptions)
  
  res.cookie("jwt", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 1000 * 60 * 60 * 24 * 7,
  });
  return token;
}