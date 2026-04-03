import dotenv from "dotenv";
import path from "path";
import { startBot } from "./lib/bot";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

void startBot();
