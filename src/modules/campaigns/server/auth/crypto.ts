import "server-only";
import { createHash, createHmac, randomBytes } from "node:crypto";
import { compare, hash } from "bcryptjs";

export const SESSION_SECONDS = 30 * 24 * 60 * 60;
export const tokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export const newSessionToken = () => randomBytes(32).toString("base64url");
export const privateKey = (secret: string, purpose: string, value: string) =>
  createHmac("sha256", secret).update(`${purpose}:${value}`).digest("hex");

// A server-side pepper protects the small PIN space if only Firestore is leaked.
// bcrypt still supplies a random salt and a cost of 12; the HMAC is not a password hash substitute.
const pepperPin = (secret: string, pin: string) =>
  privateKey(secret, "pin", pin);
export const hashPin = (secret: string, pin: string) =>
  hash(pepperPin(secret, pin), 12);
export const verifyPin = (secret: string, pin: string, pinHash: string) =>
  compare(pepperPin(secret, pin), pinHash);
let dummyHash: Promise<string> | undefined;
export const missingParticipantHash = (secret: string) =>
  (dummyHash ??= hashPin(secret, randomBytes(16).toString("hex")));
