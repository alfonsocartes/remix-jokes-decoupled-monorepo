import type { LoaderFunction, ActionFunction, MetaFunction } from "remix";
import { json } from "remix";
import { useLoaderData, useCatch, useParams } from "remix";
import { JokeDisplay } from "~/components/joke";
import { getUser } from "~/models/user.server";
import { deleteJoke, getJoke } from "~/models/jokes.server";
import authenticated from "~/auth/authenticated.server";
import type { Joke } from "@prisma/client";

type LoaderData = { joke: Joke; isOwner: boolean };

export const meta: MetaFunction = ({
  data,
}: {
  data: LoaderData | undefined;
}) => {
  if (!data) {
    return {
      title: "No joke",
      description: "No joke found",
    };
  }
  return {
    title: `"${data.joke.name}" joke`,
    description: `Enjoy the "${data.joke.name}" joke and much more`,
  };
};

export const loader: LoaderFunction = async ({ request, params }) => {
  const { jokeId } = params;
  if (!jokeId) {
    throw new Response("What a joke! Not found.", {
      status: 404,
    });
  }

  const joke = await getJoke(jokeId);
  if (!joke) {
    throw new Response("What a joke! Not found.", {
      status: 404,
    });
  }

  const success = async () => {
    const user = await getUser(request);
    let userId = user?.id;
    const isOwner = userId === joke.jokesterId;
    return json<LoaderData>({
      joke,
      isOwner: isOwner,
    });
  };

  const failure = () => {
    return json<LoaderData>({
      joke,
      isOwner: false,
    });
  };

  return authenticated(request, success, failure);
};

export const action: ActionFunction = async ({ request, params }) => {
  const form = await request.formData();
  if (form.get("_method") === "delete") {
    const { jokeId } = params;
    if (!jokeId) {
      throw new Response("What a joke! Not found.", {
        status: 404,
      });
    }

    const success = async () => {
      return deleteJoke(request, jokeId);
    };

    const failure = () => {
      throw new Response("Not authorized.", { status: 401 });
    };

    return authenticated(request, success, failure);
  }
};

export default function JokeRoute() {
  const data = useLoaderData<LoaderData>();

  return <JokeDisplay joke={data.joke} isOwner={data.isOwner} />;
}

export function CatchBoundary() {
  const caught = useCatch();
  switch (caught.status) {
    case 404: {
      return <div className="error-container">{caught.data}</div>;
    }
    case 401: {
      return <div className="error-container">{caught.data}</div>;
    }
    default: {
      throw new Error(`Unhandled error: ${caught.status}`);
    }
  }
}

export function ErrorBoundary({ error }: { error: Error }) {
  console.error(error);

  const { jokeId } = useParams();
  return (
    <div className="error-container">{`There was an error loading joke by the id ${jokeId}. Sorry.`}</div>
  );
}
