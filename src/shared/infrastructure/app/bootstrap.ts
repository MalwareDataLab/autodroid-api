// Container import
import {
  initContainer,
  initAndWaitPreRequisites,
} from "@shared/container/index";

// Util import
import { logger } from "@shared/utils/logger";

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
    logger.error(`❌ Bootstrap failed. Shutting down. ${err?.message}`);
    logger.error(`${err?.message}`);
    process.exit(1);
  }
})();

export { Bootstrap };
