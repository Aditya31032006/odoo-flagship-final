import Redis from 'ioredis';
import config from './config.js';

export const redisConnection = {
  host: config.REDIS_HOST,
  port: config.REDIS_PORT,
  username: config.REDIS_USERNAME,
  password: config.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

export const redisClient = new Redis(redisConnection);

redisClient.on('connect', () => {
  console.log('⚡ Redis client connected successfully.');
});

redisClient.on('error', (err) => {
  console.error('❌ Redis client connection error:', err.message);
});

export default redisClient;
