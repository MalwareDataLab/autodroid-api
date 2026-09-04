import { startMcpServer } from "./server";

startMcpServer().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
