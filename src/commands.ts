import { readConfig, setUser } from "./config.js";
import {
  createPost,
  getPostsForUser,
} from "./lib/db/queries/posts.js";
import { fetchFeed } from "./rss.js";
import {
  createFeedFollow,
  getFeedFollowsForUser,
    deleteFeedFollow,
} from "./lib/db/queries/feedFollows.js";
import {
  createFeed,
  getFeeds,
  getFeedByUrl,
  markFeedFetched,
getNextFeedToFetch,
} from "./lib/db/queries/feeds.js";
import type { Feed, User } from "./lib/db/schema.js";

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
  if (args.length < 1) {
    throw new Error("time_between_reqs is required");
  }

  const durationStr = args[0];
  const timeBetweenRequests = parseDuration(durationStr);

  console.log(`Collecting feeds every ${durationStr}`);

  const handleError = (error: unknown) => {
    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(error);
    }
  };

  scrapeFeeds().catch(handleError);

  const interval = setInterval(() => {
    scrapeFeeds().catch(handleError);
  }, timeBetweenRequests);

  await new Promise<void>((resolve) => {
    process.on("SIGINT", () => {
      console.log("Shutting down feed aggregator...");
      clearInterval(interval);
      resolve();
    });
  });
}


export function printFeed(feed: Feed, user: User): void {
  console.log(`Feed ID: ${feed.id}`);
  console.log(`Feed Name: ${feed.name}`);
  console.log(`Feed URL: ${feed.url}`);
  console.log(`User: ${user.name}`);
  console.log(`Created At: ${feed.createdAt}`);
  console.log(`Updated At: ${feed.updatedAt}`);
}



export async function handlerAddFeed(
  cmdName: string,
  user: User,
  ...args: string[]
): Promise<void> {
  if (args.length < 2) {
    throw new Error("name and url are required");
  }

  const name = args[0];
  const url = args[1];

  const feed = await createFeed(name, url, user.id);

  const follow = await createFeedFollow(user.id, feed.id);

  printFeed(feed, user);

  console.log(`${follow.userName} is now following ${follow.feedName}`);
}




export async function handlerFeeds(
  cmdName: string,
  ...args: string[]
): Promise<void> {
  const allFeeds = await getFeeds();

  for (const result of allFeeds) {
    console.log(`Name: ${result.feed.name}`);
    console.log(`URL: ${result.feed.url}`);
    console.log(`User: ${result.user.name}`);
    console.log();
  }
}

export async function handlerFollow(
  cmdName: string,
  user: User,
  ...args: string[]
): Promise<void> {
  if (args.length < 1) {
    throw new Error("url is required");
  }

  const url = args[0];

  const feed = await getFeedByUrl(url);

  if (!feed) {
    throw new Error("Feed does not exist");
  }

  const follow = await createFeedFollow(user.id, feed.id);

  console.log(`${follow.userName} is now following ${follow.feedName}`);
}

export async function handlerFollowing(
  cmdName: string,
  user: User,
  ...args: string[]
): Promise<void> {
  const follows = await getFeedFollowsForUser(user.id);

  for (const follow of follows) {
    console.log(follow.feedName);
  }
}


export function middlewareLoggedIn(
  handler: UserCommandHandler
): CommandHandler {
  return async (cmdName: string, ...args: string[]) => {
    const config = readConfig();

    if (!config.currentUserName) {
      throw new Error("No current user");
    }

    const user = await getUserByName(config.currentUserName);

    if (!user) {
      throw new Error(`User ${config.currentUserName} not found`);
    }

    await handler(cmdName, user, ...args);
  };
}


export async function handlerUnfollow(
  cmdName: string,
  user: User,
  ...args: string[]
): Promise<void> {
  if (args.length < 1) {
    throw new Error("url is required");
  }

  const url = args[0];

  await deleteFeedFollow(user.id, url);

  console.log(`Unfollowed ${url}`);
}


export async function scrapeFeeds(): Promise<void> {
  const feed = await getNextFeedToFetch();

  if (!feed) {
    console.log("No feeds found");
    return;
  }

  console.log(`Fetching ${feed.name}...`);

  const rssFeed = await fetchFeed(feed.url);

  await markFeedFetched(feed.id);

  for (const item of rssFeed.channel.item) {
    const publishedAt = new Date(item.pubDate);

    if (isNaN(publishedAt.getTime())) {
      console.log(`Invalid date for post: ${item.title}`);
      continue;
    }

    await createPost(
      item.title,
      item.link,
      item.description,
      publishedAt,
      feed.id
    );
  }
}



export function parseDuration(durationStr: string): number {
  const regex = /^(\d+)(ms|s|m|h)$/;
  const match = durationStr.match(regex);

  if (!match) {
    throw new Error("Invalid duration");
  }

  const value = Number(match[1]);
  const unit = match[2];

  switch (unit) {
    case "ms":
      return value;

    case "s":
      return value * 1000;

    case "m":
      return value * 60 * 1000;

    case "h":
      return value * 60 * 60 * 1000;

    default:
      throw new Error("Invalid duration");
  }
}


export async function handlerBrowse(
  cmdName: string,
  user: User,
  ...args: string[]
): Promise<void> {
  let limit = 2;

  if (args.length > 0) {
    limit = Number(args[0]);

    if (isNaN(limit) || limit <= 0) {
      throw new Error("limit must be a positive number");
    }
  }

  const userPosts = await getPostsForUser(user.id, limit);

  for (const result of userPosts) {
    const post = result.post;

    console.log(`Title: ${post.title}`);
    console.log(`URL: ${post.url}`);
    console.log(`Description: ${post.description ?? ""}`);
    console.log(`Published At: ${post.publishedAt}`);
    console.log();
  }
}
