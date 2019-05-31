import createServer from "./createServer";

const launchServer = async () => {
  // Instatiate the server
  const server = createServer();

  // Start the server with CORS enabled
  (await server).start({
    
  });
};

launchServer();