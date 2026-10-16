process.once("disconnect", () => {
  process.kill(process.pid, "SIGKILL");
});
