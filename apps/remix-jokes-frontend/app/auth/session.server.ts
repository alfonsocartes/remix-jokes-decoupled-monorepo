import { createCookieSessionStorage, redirect, Session } from "remix";

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  throw new Error("SESSION_SECRET must be set");
}

export const authSessionStorage = createCookieSessionStorage({
  cookie: {
    name: "RJ_auth_session",
    // normally you want this to be `secure: true`
    // but that doesn't work on localhost for Safari
    // https://web.dev/when-to-use-local-https/
    secure: process.env.NODE_ENV === "production",
    secrets: [sessionSecret],
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 365 days
    httpOnly: true,
  },
});

export async function createAuthSession(
  accessToken: string,
  refreshToken: string,
  redirectTo: string
) {
  const session = await authSessionStorage.getSession();
  session.set("accessToken", accessToken);
  session.set("refreshToken", refreshToken);
  return redirect(redirectTo, {
    headers: {
      "Set-Cookie": await authSessionStorage.commitSession(session),
    },
  });
}

export function setAuthSession(
  session: Session,
  accessToken: string,
  refreshToken: string
): Session {
  session.set("accessToken", accessToken);
  session.set("refreshToken", refreshToken);

  return session;
}

type LoginForm = {
  username: string;
  password: string;
};

type AuthData = {
  accessToken: string;
  refreshToken: string;
};

type RegisterResponse = {
  data?: AuthData;
  error?: string;
};

export async function register({
  username,
  password,
}: LoginForm): Promise<RegisterResponse> {
  try {
    const response = await fetch(`${process.env.API_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    if (response.ok) {
      const data = await response.json();
      const { accessToken, refreshToken } = data;
      if (!accessToken || !refreshToken) {
        return { error: "No tokens returned from server" };
      }
      return { data: { accessToken, refreshToken } };
    } else {
      const json = await response.json();
      return { error: json.message };
    }
  } catch (error) {
    console.error(error);
    return { error: (error as Error).message };
  }
}

export async function login({ username, password }: LoginForm) {
  try {
    const response = await fetch(`${process.env.API_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();
    const { accessToken, refreshToken } = data;

    if (!accessToken || !refreshToken) {
      return null;
    }

    return { accessToken, refreshToken };
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function logout(request: Request) {
  const session = await authSessionStorage.getSession(
    request.headers.get("Cookie")
  );
  return redirect("/login", {
    headers: {
      "Set-Cookie": await authSessionStorage.destroySession(session),
    },
  });
}
