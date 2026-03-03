import Redis from 'ioredis';

// Use a mock/dummy redis pattern if not configured or unavailable
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

class RedisCache {
    private client: Redis | null = null;
    private connected: boolean = false;

    constructor() {
        try {
            this.client = new Redis(redisUrl, {
                lazyConnect: true,
                maxRetriesPerRequest: 1
            });

            this.client.on('error', (err) => {
                console.warn('Redis is not available, falling back to direct DB queries.');
                this.connected = false;
            });

            this.client.on('ready', () => {
                console.log('Connected to Redis');
                this.connected = true;
            });

            // Attempt connection but don't crash if dev environment lacks Redis
            this.client.connect().catch(() => { });
        } catch (err) {
            console.warn('Failed to initialize Redis client');
        }
    }

    async get(key: string): Promise<string | null> {
        if (!this.connected || !this.client) return null;
        try {
            return await this.client.get(key);
        } catch {
            return null;
        }
    }

    async setEx(key: string, seconds: number, value: string): Promise<void> {
        if (!this.connected || !this.client) return;
        try {
            await this.client.setex(key, seconds, value);
        } catch {
            // Ignore
        }
    }
}

export const redisCache = new RedisCache();
