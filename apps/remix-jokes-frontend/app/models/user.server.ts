import type { User } from "@prisma/client";
import { getAccessToken } from "~/auth/jwt.server";

export async function getUser(request: Request): Promise<User | null> {
  const accessToken = await getAccessToken(request);

  if (!accessToken) {
    return null;
  }

  try {
    const response = await fetch(`${process.env.API_URL}/user`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const { user } = await response.json();
    return user;
  } catch (error) {
    console.error("getUser error", error);
    return null;
  }
}
