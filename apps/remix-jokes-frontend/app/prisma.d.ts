/**
 * Model User
 *
 */
export type User = {
  id: string;
  username: string;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Model Password
 *
 */
export type Password = {
  hash: string;
  userId: string;
};

/**
 * Model Joke
 *
 */
export type Joke = {
  id: string;
  jokesterId: string;
  createdAt: Date;
  updatedAt: Date;
  name: string;
  content: string;
};
