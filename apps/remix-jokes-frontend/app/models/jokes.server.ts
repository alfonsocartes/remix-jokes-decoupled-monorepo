import type { Joke } from "@prisma/client";
import { redirect } from "remix";
import { getAccessToken } from "~/auth/jwt.server";
import { logout } from "~/auth/session.server";

export interface CreateJokeInputData {
  name: string;
  content: string;
}

export async function createJoke(
  request: Request,
  data: CreateJokeInputData
): Promise<Joke> {
  const accessToken = await getAccessToken(request);
  if (!accessToken) {
    // user not logged in
    throw logout(request);
  }

  try {
    // Authorized route. The access token has the userId in the JWT payload
    const response = await fetch(`${process.env.API_URL}/jokes/new/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // prettier-ignore
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify(data),
    });

    const { joke } = await response.json();
    return joke;
  } catch {
    throw logout(request);
  }
}

export async function getAllJokes(): Promise<Joke[]> {
  try {
    const response = await fetch(`${process.env.API_URL}/jokes`);
    const { jokeListItems } = await response.json();
    return jokeListItems;
  } catch {
    return [];
  }
}

export async function getRandomJoke(): Promise<Joke | null> {
  try {
    const response = await fetch(`${process.env.API_URL}/jokes/random`);
    const { randomJoke } = await response.json();
    return randomJoke;
  } catch {
    return null;
  }
}

export async function getJoke(jokeId: string): Promise<Joke | null> {
  try {
    const response = await fetch(`${process.env.API_URL}/jokes/${jokeId}`);
    const { joke } = await response.json();
    return joke;
  } catch {
    return null;
  }
}

export async function getUsersJokes(request: Request): Promise<Joke[]> {
  const accessToken = await getAccessToken(request);
  if (!accessToken) {
    // user not logged in
    throw logout(request);
  }

  try {
    // Authorized route. The access token has the userId in the JWT payload
    const response = await fetch(`${process.env.API_URL}/jokes`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        // prettier-ignore
        "Authorization": `Bearer ${accessToken}`,
      },
    });

    const { jokeListItems } = await response.json();
    return jokeListItems;
  } catch (error) {
    console.error("getUsersJokes error", error);
    throw logout(request);
  }
}

export async function deleteJoke(request: Request, jokeId: string) {
  const accessToken = await getAccessToken(request);
  if (!accessToken) {
    // user not logged in
    throw logout(request);
  }
  try {
    // Authorized route. The access token has the userId in the JWT payload
    const response = await fetch(`${process.env.API_URL}/jokes/${jokeId}/`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        // prettier-ignore
        "Authorization": `Bearer ${accessToken}`,
      },
    });
    if (response.status === 200) {
      return redirect("/jokes");
    } else {
      const { message } = await response.json();
      throw new Response(message, { status: response.status });
    }
  } catch (error) {
    throw logout(request);
  }
}
