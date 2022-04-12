import { redirect } from "remix";
import { getAccessToken, refreshAccessToken } from "./jwt.server";
import { authSessionStorage, setAuthSession } from "./session.server";

export default async function authenticated(
  request: Request,
  successFunction: () => Response | Promise<Response>,
  failureFunction: () => Response | Promise<Response>,
  redirectTo?: string
): Promise<Response> {
  try {
    let session = await authSessionStorage.getSession(
      request.headers.get("Cookie")
    );
    const url = new URL(request.url);
    const redirectUrl =
      redirectTo || `${url.origin}${url.pathname}${url.search}`;

    const validAccessToken = await getAccessToken(request);
    if (validAccessToken === null) {
      const { accessToken, refreshToken, errorMessage } =
        await refreshAccessToken(session);
      if (errorMessage || !accessToken || !refreshToken) {
        throw new Error("refreshUserToken " + errorMessage);
      }
      session = setAuthSession(session, accessToken, refreshToken);
      return redirect(redirectUrl, {
        headers: {
          "Set-Cookie": await authSessionStorage.commitSession(session),
        },
      });
    }

    return await successFunction();
  } catch {
    return failureFunction();
  }
}
