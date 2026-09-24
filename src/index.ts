import { readConfig, setUser } from "./config";

function main() {
  setUser("Ahmad");

  const config = readConfig();

  console.log(config);
}

main();
