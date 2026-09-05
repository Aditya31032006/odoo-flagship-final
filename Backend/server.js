import app from './src/app.js';
import connectDB from './src/config/database.js';
import config from './src/config/config.js';
import { initEmailWorker } from './src/jobs/emailQueue.js';


const PORT = config.PORT || 3000;

async function startServer() {
  try {
    await connectDB();
    console.log('Database connection established successfully.');

 
   


    initEmailWorker();

    app.listen(PORT, () => {
      console.log(`DealFlow360 Backend server listening on port ${PORT} in ${config.NODE_ENV || 'development'} mode`);
    });
  } catch (error) {
    console.error('Fatal: Server startup failed:', error);
    process.exit(1);
  }
}

startServer();