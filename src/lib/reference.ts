import { randomInt } from "node:crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I

/** e.g. GUV-26-7KQ4XM — short enough to read over the phone. */
export function newReference(prefix: string, date = new Date()) {
  let code = "";
  for (let i = 0; i < 6; i++) code += ALPHABET[randomInt(ALPHABET.length)];
  return `${prefix}-${String(date.getFullYear()).slice(2)}-${code}`;
}
