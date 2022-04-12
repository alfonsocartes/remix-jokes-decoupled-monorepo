import { json, LoaderFunction } from "remix";
import { useLoaderData, Link, useCatch } from "remix";
import { getRandomJoke } from "~/models/jokes.server";
import { Joke } from "~/prisma";

type LoaderData = { randomJoke: Joke | undefined };

export const loader: LoaderFunction = async ({ request }) => {
  const randomJoke = await getRandomJoke();
  if (!randomJoke) {
    throw new Response("No random joke found", {
      status: 404,
    });
  }
  return json<LoaderData>({ randomJoke });
};

export default function JokesIndexRoute() {
  const data = useLoaderData<LoaderData>();

  if (data.randomJoke)
    return (
      <div>
        <p>Here's a random joke:</p>
        <p>{data.randomJoke.content}</p>
        <Link to={data.randomJoke.id}>"{data.randomJoke.name}" Permalink</Link>
      </div>
    );
}

export function CatchBoundary() {
  const caught = useCatch();

  if (caught.status === 404) {
    return (
      <div className="error-container">There are no jokes to display.</div>
    );
  }
  throw new Error(`Unexpected caught response with status: ${caught.status}`);
}

export function ErrorBoundary() {
  return <div className="error-container">I did a whoopsies.</div>;
}
