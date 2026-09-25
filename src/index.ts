import {
  CommandsRegistry,
  handlerLogin,
  handlerRegister,
  handlerReset,
  handlerUsers,
  handlerAgg,
  registerCommand,
  runCommand,
} from "./commands.js";async function main() {
  const registry: CommandsRegistry = {};

  registerCommand(registry, "login", handlerLogin);
  registerCommand(registry, "register", handlerRegister);
  registerCommand(registry, "reset", handlerReset);
  registerCommand(registry, "users", handlerUsers);
  registerCommand(registry, "agg", handlerAgg);

  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error("not enough arguments");
    process.exit(1);
  }

  const cmdName = args[0];
  const cmdArgs = args.slice(1);

  try {
    await runCommand(registry, cmdName, ...cmdArgs);
  } catch (error) {
    if (error instanceof Error) {
      console.error(error.message);
    }

    process.exit(1);
  }

  process.exit(0);
}

main();
