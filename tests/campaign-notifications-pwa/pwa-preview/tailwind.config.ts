import official from "../../../tailwind.config";
import path from "node:path";
export default {
  ...official,
  content: [
    path.resolve(process.cwd(), "../../../src/**/*.{ts,tsx}"),
    "./app/**/*.js",
  ],
};
