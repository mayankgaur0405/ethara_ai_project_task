import { createApp } from "./app.js";
import { config } from "./config.js";
import { connectToDatabase } from "./db.js";
import { User } from "./models/User.js";
import { seedDatabase } from "./seed.js";

async function start() {
  await connectToDatabase();
  const userCount = await User.countDocuments();
  if (userCount === 0) {
    await seedDatabase();
  }
  const app = createApp();

  app.listen(config.port, () => {
    console.log(`Server running on http://localhost:${config.port}`);
  });
}

start().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});