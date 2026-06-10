import { createApp } from "./app.js";

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "127.0.0.1";
const app = await createApp();

const server = app.listen(port, host, () => {
  console.log(`FAQ chatbot prototype is running at http://${host}:${port}`);
});

server.on("error", (error) => {
  console.error("Failed to start FAQ chatbot prototype:", error);
  process.exitCode = 1;
});

process.on("SIGINT", () => {
  server.close(() => {
    process.exit(0);
  });
});

process.on("SIGTERM", () => {
  server.close(() => {
    process.exit(0);
  });
});
