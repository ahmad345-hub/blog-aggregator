# Blog Aggregator

A CLI application for collecting and reading posts from RSS feeds.

Built using TypeScript, PostgreSQL, Drizzle ORM, and Node.js.

## Requirements

* Node.js
* PostgreSQL
* npm

## Setup

Clone the repository and install dependencies:

```bash
git clone https://github.com/ahmad345-hub/blog-aggregator.git
cd blog-aggregator
npm install
```

Create a PostgreSQL database called `gator` and run:

```bash
npx drizzle-kit migrate
```

Create `~/.gatorconfig.json`:

```json
{
  "db_url": "postgres://postgres:password@localhost:5432/gator?sslmode=disable",
  "current_user_name": ""
}
```

Change the database password if needed.

## Commands

```bash
npm run start register <username>
npm run start login <username>
npm run start users
npm run start addfeed "<name>" "<url>"
npm run start feeds
npm run start follow "<url>"
npm run start unfollow "<url>"
npm run start following
npm run start agg 1m
npm run start browse
npm run start browse 5
npm run start reset
```

`agg` collects posts from the RSS feeds. Use `Ctrl+C` to stop it.

`browse` shows the latest posts from the feeds followed by the current user.
