import { readConfig, setUser } from "./config.js";
import { fetchFeed } from "./rss.js";

import {
  createUser,
  getUserByName,
  deleteUsers,
  getUsers,
} from "./lib/db/queries/users.js";export type CommandHandler = (
  cmdName: string,
  ...args: string[]
) => Promise<void>;

export type CommandsRegistry = Record<string, CommandHandler>;

export async function handlerLogin(
  cmdName: string,
  ...args: string[]
): Promise<void> {
  if (args.length === 0) {
    throw new Error("username is required");
  }

  const username = args[0];

  const user = await getUserByName(username);

  if (!user) {
    throw new Error(`User ${username} does not exist`);
  }

  setUser(username);

  console.log(`User has been set to ${username}`);
}

export async function handlerRegister(
  cmdName: string,
  ...args: string[]
): Promise<void> {
  if (args.length === 0) {
    throw new Error("username is required");
  }

  const username = args[0];

  const existingUser = await getUserByName(username);

  if (existingUser) {
    throw new Error(`User ${username} already exists`);
  }

  const user = await createUser(username);

  setUser(username);

  console.log(`User ${username} was created`);
  console.log(user);
}

export function registerCommand(
  registry: CommandsRegistry,
  cmdName: string,
  handler: CommandHandler
): void {
  registry[cmdName] = handler;
}

export async function runCommand(
  registry: CommandsRegistry,
  cmdName: string,
  ...args: string[]
): Promise<void> {
  const handler = registry[cmdName];

  if (!handler) {
    throw new Error(`Unknown command: ${cmdName}`);
  }

  await handler(cmdName, ...args);
}



export async function handlerReset(
  cmdName: string,
  ...args: string[]
): Promise<void> {
  await deleteUsers();
  console.log("Database reset successfully");
}



export async function handlerUsers(
  cmdName: string,
  ...args: string[]
): Promise<void> {
  const allUsers = await getUsers();
  const config = readConfig();

  for (const user of allUsers) {
    if (user.name === config.currentUserName) {
      console.log(`* ${user.name} (current)`);
    } else {
      console.log(`* ${user.name}`);
    }
  }
}


export async function handlerAgg(
  cmdName: string,
  ...args: string[]
): Promise<void> {
  const feed = await fetchFeed("https://www.wagslane.dev/index.xml");

  console.log(JSON.stringify(feed, null, 2));
}
