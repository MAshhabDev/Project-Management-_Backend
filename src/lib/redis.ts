import { createClient } from "redis";
import config from "../config";

const isProduction = process.env.NODE_ENV === "production" || config.redis_host?.includes("upstash.io");

export const redisClient = createClient({
	username: config.redis_user || "default",
	password: config.redis_password,
	socket: {
		host: config.redis_host,
		port: Number(config.redis_port) || 6379,
		tls: isProduction ? true : undefined,
	},
});

redisClient.on("error", (err) => console.error("Redis Client Error:", err));
