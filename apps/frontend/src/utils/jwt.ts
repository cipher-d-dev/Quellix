import { jwtDecode } from "jwt-decode";

interface Payload {
  id: string;
  type: "developer" | "endUser";
  iat: number;
  exp: number;
}

export function decodeToken(token: string): Payload | null {
  try {
    return jwtDecode<Payload>(token);
  } catch {
    return null;
  }
}
export function isTokenExpired(token: string): boolean {
  const p = decodeToken(token);
  return !p || p.exp * 1000 < Date.now();
}
