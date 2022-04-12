import jwt from "jsonwebtoken";
import { Session } from "remix";
import { authSessionStorage, logout } from "./session.server";

const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;
if (!accessTokenSecret) {
  throw new Error("ACCESS_TOKEN_SECRET must be set");
}

type Tokens = {
  accessToken?: string;
  refreshToken?: string;
  errorMessage?: string;
};

export async function getAccessToken(request: Request): Promise<string | null> {
  const session = await authSessionStorage.getSession(
    request.headers.get("Cookie")
  );

  const accessToken = session.get("accessToken");

  if (!accessToken) {
    throw logout(request);
  }

  if (!accessTokenSecret) {
    throw new Error("ACCESS_TOKEN_SECRET must be set");
  }

  try {
    jwt.verify(accessToken, accessTokenSecret);
    return accessToken;
  } catch {
    return null;
  }
}

export async function refreshAccessToken(session: Session): Promise<Tokens> {
  try {
    const refreshToken = session.get("refreshToken");

    if (!refreshToken) {
      return { errorMessage: "User not logged in" };
    }
    // get new access token from API
    const response = await fetch(`${process.env.API_URL}/auth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (response.ok) {
      const { accessToken } = await response.json();
      if (!accessToken) {
        throw new Error("Access token not found in response");
      }
      return {
        accessToken: accessToken as string,
        refreshToken: refreshToken as string,
      };
    } else {
      throw new Error("Error refreshing access token with API");
    }
  } catch (error) {
    return { errorMessage: (error as Error).message };
  }
}
