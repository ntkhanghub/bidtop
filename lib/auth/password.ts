import { hash, verify } from "@node-rs/argon2";

// hash()/verify() default to Argon2id (CLAUDE.md's required scheme) when no
// algorithm option is passed.
export function hashPassword(password: string): Promise<string> {
  return hash(password);
}

export function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  return verify(passwordHash, password);
}
