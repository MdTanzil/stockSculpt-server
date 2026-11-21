const mongoose = require("mongoose");
require("dotenv").config();
// All models, so their schema indexes can be created explicitly (below).
const models = require("../model");

// Memoized connection promise: connect once, then create every model's
// indexes. Mongoose's background auto-indexing is unreliable on serverless
// — the function can freeze before it finishes, and once started it is
// never retried on that instance — which left the unique barcode index
// uncreated (duplicate barcodes were silently accepted until this fix).
// createIndexes is a no-op for indexes that already exist with the same
// spec, so this is cheap on warm instances.
let ready = null;

async function dbConnect() {
  if (!ready) {
    ready = (async () => {
      try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("✅ Connected to MongoDB");
        for (const model of Object.values(models)) {
          try {
            await model.createIndexes();
          } catch (indexError) {
            // One model's index failure (e.g. pre-existing duplicate data)
            // must not block the other models' indexes.
            console.error(
              `❌ Index creation failed for ${model.modelName}:`,
              indexError.message
            );
          }
        }
      } catch (error) {
        console.error("❌ Error connecting to MongoDB:", error.message);
      }
    })();
  }
  return ready;
}

module.exports = { dbConnect };
