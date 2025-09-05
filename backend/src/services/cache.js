// Caching service using Redis for improved performance
import { createClient } from 'redis';
import crypto from 'crypto';

class CacheService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.retryAttempts = 0;
    this.maxRetries = 3;
  }

  async connect() {
    try {
      // Create Redis client with fallback configuration
      this.client = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        socket: {
          connectTimeout: 5000,
          lazyConnect: true,
          reconnectDelay: 1000,
        },
        // Disable automatic retries to prevent flooding
        retry_delay: false,
      });

      // Error handling
      this.client.on('error', (err) => {
        if (this.retryAttempts < this.maxRetries) {
          console.warn(`Redis Client Error (attempt ${this.retryAttempts + 1}/${this.maxRetries}):`, err.message);
          this.retryAttempts++;
        }
        this.isConnected = false;
        
        // If max retries reached, don't attempt to reconnect
        if (this.retryAttempts >= this.maxRetries) {
          console.log('Redis connection failed after max retries. Using in-memory cache only.');
          this.client = null;
        }
      });

      this.client.on('connect', () => {
        console.log('Redis Client Connected');
        this.isConnected = true;
        this.retryAttempts = 0;
      });

      this.client.on('ready', () => {
        console.log('Redis Client Ready');
        this.isConnected = true;
      });

      this.client.on('end', () => {
        console.log('Redis Client Disconnected');
        this.isConnected = false;
      });

      // Try to connect with timeout
      const connectPromise = this.client.connect();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), 5000)
      );
      
      await Promise.race([connectPromise, timeoutPromise]);
      
    } catch (error) {
      console.warn('Redis connection failed, using in-memory cache fallback:', error.message);
      this.isConnected = false;
      this.initializeInMemoryCache();
    }
  }

  // In-memory cache fallback
  initializeInMemoryCache() {
    this.memoryCache = new Map();
    this.cacheTimestamps = new Map();
    
    // Clean up expired entries every 5 minutes
    setInterval(() => {
      const now = Date.now();
      for (const [key, timestamp] of this.cacheTimestamps.entries()) {
        if (now - timestamp > 3600000) { // 1 hour default TTL
          this.memoryCache.delete(key);
          this.cacheTimestamps.delete(key);
        }
      }
    }, 300000); // 5 minutes
  }

  // Generate cache key from parameters
  generateKey(prefix, params) {
    const paramString = typeof params === 'object' ? JSON.stringify(params) : String(params);
    const hash = crypto.createHash('md5').update(paramString).digest('hex');
    return `${prefix}:${hash}`;
  }

  async get(key) {
    try {
      if (this.isConnected && this.client) {
        const value = await this.client.get(key);
        return value ? JSON.parse(value) : null;
      } else {
        // Fallback to in-memory cache
        const value = this.memoryCache?.get(key);
        if (value && this.cacheTimestamps?.get(key)) {
          const age = Date.now() - this.cacheTimestamps.get(key);
          if (age < 3600000) { // 1 hour
            return value;
          } else {
            this.memoryCache.delete(key);
            this.cacheTimestamps.delete(key);
          }
        }
        return null;
      }
    } catch (error) {
      console.warn('Cache get error:', error.message);
      return null;
    }
  }

  async set(key, value, ttlSeconds = 3600) {
    try {
      if (this.isConnected && this.client) {
        await this.client.setEx(key, ttlSeconds, JSON.stringify(value));
      } else {
        // Fallback to in-memory cache
        if (this.memoryCache) {
          this.memoryCache.set(key, value);
          this.cacheTimestamps.set(key, Date.now());
        }
      }
    } catch (error) {
      console.warn('Cache set error:', error.message);
    }
  }

  async del(key) {
    try {
      if (this.isConnected && this.client) {
        await this.client.del(key);
      } else {
        // Fallback to in-memory cache
        if (this.memoryCache) {
          this.memoryCache.delete(key);
          this.cacheTimestamps.delete(key);
        }
      }
    } catch (error) {
      console.warn('Cache delete error:', error.message);
    }
  }

  async clear(pattern = '*') {
    try {
      if (this.isConnected && this.client) {
        const keys = await this.client.keys(pattern);
        if (keys.length > 0) {
          await this.client.del(keys);
        }
      } else {
        // Clear in-memory cache
        if (this.memoryCache) {
          this.memoryCache.clear();
          this.cacheTimestamps.clear();
        }
      }
    } catch (error) {
      console.warn('Cache clear error:', error.message);
    }
  }

  async disconnect() {
    try {
      if (this.client) {
        await this.client.disconnect();
      }
    } catch (error) {
      console.warn('Redis disconnect error:', error.message);
    }
  }
}

// Create singleton instance
const cacheService = new CacheService();

// Content-specific caching functions
export const ContentCache = {
  // Cache AI-generated content for similar topics/keywords
  async getCachedContent(topic, keyword, contentType, platformTarget) {
    const key = cacheService.generateKey('content', { topic, keyword, contentType, platformTarget });
    return await cacheService.get(key);
  },

  async setCachedContent(topic, keyword, contentType, platformTarget, content, ttl = 3600) {
    const key = cacheService.generateKey('content', { topic, keyword, contentType, platformTarget });
    await cacheService.set(key, content, ttl);
  },

  // Cache user statistics
  async getCachedStats(userId, period) {
    const key = cacheService.generateKey('stats', { userId, period });
    return await cacheService.get(key);
  },

  async setCachedStats(userId, period, stats, ttl = 1800) { // 30 minutes
    const key = cacheService.generateKey('stats', { userId, period });
    await cacheService.set(key, stats, ttl);
  },

  // Cache analytics data
  async getCachedAnalytics(userId, startDate, endDate) {
    const key = cacheService.generateKey('analytics', { userId, startDate: startDate.toISOString(), endDate: endDate.toISOString() });
    return await cacheService.get(key);
  },

  async setCachedAnalytics(userId, startDate, endDate, analytics, ttl = 1800) {
    const key = cacheService.generateKey('analytics', { userId, startDate: startDate.toISOString(), endDate: endDate.toISOString() });
    await cacheService.set(key, analytics, ttl);
  },

  // Cache performance scores
  async getCachedPerformance(userId) {
    const key = cacheService.generateKey('performance', { userId });
    return await cacheService.get(key);
  },

  async setCachedPerformance(userId, performance, ttl = 3600) {
    const key = cacheService.generateKey('performance', { userId });
    await cacheService.set(key, performance, ttl);
  },

  // Invalidate user-specific caches when content is created/updated
  async invalidateUserCache(userId) {
    await cacheService.clear(`stats:*${userId}*`);
    await cacheService.clear(`analytics:*${userId}*`);
    await cacheService.clear(`performance:*${userId}*`);
  },

  // Clear all caches
  async clearAll() {
    await cacheService.clear();
  }
};

// Initialize cache service
export const initializeCache = async () => {
  await cacheService.connect();
};

// Graceful shutdown
export const shutdownCache = async () => {
  await cacheService.disconnect();
};

export default cacheService;
