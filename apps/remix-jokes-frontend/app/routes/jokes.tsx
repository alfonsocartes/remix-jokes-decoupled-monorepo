import {
  Form,
  json,
  Link,
  LinksFunction,
  LoaderFunction,
  Outlet,
  useLoaderData,
} from "remix";
import stylesUrl from "../styles/jokes.css";
import { getUser } from "~/models/user.server";
import { getAllJokes } from "~/models/jokes.server";
import { Joke, User } from "~/prisma";
import authenticated from "~/auth/authenticated.server";

export const links: LinksFunction = () => {
  return [
    {
      rel: "stylesheet",
      href: stylesUrl,
    },
  ];
};

type LoaderData = {
  user: User | null;
  jokeListItems: Joke[] | null;
};

export const loader: LoaderFunction = async ({ request }) => {
  const jokeListItems = await getAllJokes();

  const success = async () => {
    const user = await getUser(request);

    return json<LoaderData>({
      user,
      jokeListItems,
    });
  };

  const failure = () => {
    return json<LoaderData>({
      user: null,
      jokeListItems,
    });
  };

  return authenticated(request, success, failure);
};

export default function JokesRoute() {
  const data = useLoaderData<LoaderData>();

  return (
    <div className="jokes-layout">
      <header className="jokes-header">
        <div className="container">
          <h1 className="home-link">
            <Link to="/" title="Remix Jokes" aria-label="Remix Jokes">
              <span className="logo">🤪</span>
              <span className="logo-medium">J🤪KES</span>
            </Link>
          </h1>
          {data.user ? (
            <div className="user-info">
              <span>{`Hi ${data.user.username}`}</span>
              {/* The reason that we're using an action (rather than a loader) is because we want to avoid CSRF problems by using a POST request rather than a GET request. This is why the logout button is a form and not a link. */}
              <Form action="/logout" method="post">
                <button type="submit" className="button">
                  Logout
                </button>
              </Form>
            </div>
          ) : (
            <Link to="/login">Login</Link>
          )}
        </div>
      </header>
      <main className="jokes-main">
        <div className="container">
          <div className="jokes-list">
            <Link to=".">Get a random joke</Link>
            <p>Here are a few more jokes to check out:</p>
            {data.jokeListItems && (
              <ul>
                {data.jokeListItems.map((joke) => (
                  <li key={joke.id}>
                    <Link prefetch="intent" to={joke.id}>
                      {joke.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Link to="new" className="button">
              Add your own
            </Link>
          </div>
          <div className="jokes-outlet">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
