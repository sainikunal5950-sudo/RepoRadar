import app from "./app";
import config from "./config";

// Start Server
app.listen(config.port, () => {
  console.log(`🚀 RepoRadar API server running on port ${config.port}`);
  console.log(`📡 Accepting client requests from: ${config.clientUrl}`);
  console.log(`🩺 Health check available at: http://localhost:${config.port}/api/health`);
  console.log(`📂 Projects API available at: http://localhost:${config.port}/api/projects`);
});

export default app;
