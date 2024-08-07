// Container import
import { initContainer, waitPreRequisites } from "@shared/container/index";

const Bootstrap = (async () => {
  try {
    console.clear();

    await initContainer();

    await waitPreRequisites();

    // Sequence of bootstrapping
    // await condition;

    // Start app
    const { init } = await import("../http/server");

    await init();
  } catch (err: any) {
    console.log(`❌ Bootstrap failed. Shutting down. ${err?.message}`);
    console.log(`${err?.message}`);
    process.exit(1);
  }
})();

export { Bootstrap };
