import { createClient, RedisClientType } from "redis";
import dotenv from "dotenv";

dotenv.config();
class RedisPubSubClient {
  private pub: RedisClientType;
  private sub: RedisClientType;
  private connected = false;

  constructor() {
    this.pub = createClient({
      url: process.env.REDIS_URL! ?? "redis://localhost:6379",
      socket: {
      connectTimeout: 10000,
      keepAlive: true
  }
    }) as RedisClientType;
    this.sub = this.pub.duplicate() as RedisClientType;
  }

  async connect(): Promise<void> {
    if (this.connected) return;
    await Promise.all([this.pub.connect(), this.sub.connect()]);
    this.connected = true;
  }

  async subscribe(
    channel: string,
    callback: (message: string) => void,
  ): Promise<void> {
    await this.connect();
    await this.sub.subscribe(channel, callback);
  }

  /**
   * Subscribe using a glob pattern (Redis PSUBSCRIBE).
   * Use this whenever the channel name contains wildcards such as
   * "game:move:processed:*" — Redis SUBSCRIBE only matches exact names.
   */
  async pSubscribe(
    pattern: string,
    callback: (message: string, channel: string) => void,
  ): Promise<void> {
    await this.connect();
    await this.sub.pSubscribe(pattern, callback);
  }

  async publish(channel: string, message: string): Promise<void> {
    await this.connect();
    await this.pub.publish(channel, message);
  }
}

export const PubSub = new RedisPubSubClient();
