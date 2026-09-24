import "ts-node/register/transpile-only";
import("./src/lib/moneyfusion-sync.server")
  .then(async (mod) => {
    try {
      console.log('Calling syncDeposit("TEST-REF")...');
      const res = await mod.syncDeposit("TEST-REF");
      console.log("syncDeposit result:", res);
      process.exit(0);
    } catch (err) {
      console.error("syncDeposit threw:", err);
      process.exit(2);
    }
  })
  .catch((err) => {
    console.error("Import failed:", err);
    process.exit(1);
  });
