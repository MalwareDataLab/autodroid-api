// Container import
import {
  initContainer,
  initAndWaitPreRequisites,
} from "@shared/container/index";

const Bootstrap = (async () => {
  try {
    console.clear();

    initContainer();

    await initAndWaitPreRequisites();

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
