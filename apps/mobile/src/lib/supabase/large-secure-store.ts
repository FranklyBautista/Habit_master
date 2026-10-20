import "react-native-get-random-values";

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as aesjs from "aes-js";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// expo-secure-store (iOS Keychain) rejects values over ~2048 bytes, and a
// Supabase session (JWT + refresh token) usually exceeds that. The session
// itself goes to AsyncStorage encrypted with a random AES-256 key that lives
// in SecureStore instead — Supabase's documented pattern for Expo/React
// Native (https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native?auth-store=secure-store).
//
// Unlike that guide, the key is created once and reused, and every operation
// runs through one queue. The guide writes a fresh key on each setItem before
// the ciphertext, so two overlapping writes (or the OS killing the app between
// the two) left a key that no longer matched the stored value: decryption gave
// garbage and Supabase dropped the session, logging the user out on its own.
// Each write gets its own random counter, stored next to the ciphertext, so
// reusing the key never reuses a CTR keystream.
//
// On web there is no SecureStore (and `expo-secure-store`'s web shim touches
// `window`, which breaks under Expo Router's static rendering). Web is only a
// development convenience here — the real targets are iOS/Android — so it
// falls back to plain AsyncStorage (localStorage) with no encryption.
export class LargeSecureStore {
  private queue: Promise<unknown> = Promise.resolve();

  private get isWeb() {
    return Platform.OS === "web";
  }

  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.queue.then(operation, operation);
    this.queue = result.catch(() => undefined);
    return result;
  }

  private async encryptionKey(key: string): Promise<Uint8Array> {
    const existing = await SecureStore.getItemAsync(key);
    if (existing) return aesjs.utils.hex.toBytes(existing);

    const created = crypto.getRandomValues(new Uint8Array(32));
    await SecureStore.setItemAsync(key, aesjs.utils.hex.fromBytes(created));
    return created;
  }

  private async encrypt(key: string, value: string): Promise<string> {
    const counter = crypto.getRandomValues(new Uint8Array(16));
    const cipher = new aesjs.ModeOfOperation.ctr(
      await this.encryptionKey(key),
      new aesjs.Counter(counter),
    );
    const encryptedBytes = cipher.encrypt(aesjs.utils.utf8.toBytes(value));

    return `${aesjs.utils.hex.fromBytes(counter)}:${aesjs.utils.hex.fromBytes(encryptedBytes)}`;
  }

  private async decrypt(key: string, value: string): Promise<string | null> {
    const encryptionKeyHex = await SecureStore.getItemAsync(key);
    if (!encryptionKeyHex) return null;

    // Values written before the counter was stored have no prefix and used
    // the fixed counter 1.
    const [counterHex, cipherHex] = value.includes(":")
      ? value.split(":", 2)
      : [undefined, value];
    const cipher = new aesjs.ModeOfOperation.ctr(
      aesjs.utils.hex.toBytes(encryptionKeyHex),
      new aesjs.Counter(counterHex ? aesjs.utils.hex.toBytes(counterHex) : 1),
    );
    const decrypted = aesjs.utils.utf8.fromBytes(
      cipher.decrypt(aesjs.utils.hex.toBytes(cipherHex)),
    );

    // A wrong key yields garbage rather than an error; Supabase stores JSON.
    JSON.parse(decrypted);
    return decrypted;
  }

  getItem(key: string): Promise<string | null> {
    return this.enqueue(async () => {
      const stored = await AsyncStorage.getItem(key);
      if (!stored) return null;
      if (this.isWeb) return stored;
      try {
        return await this.decrypt(key, stored);
      } catch {
        return null;
      }
    });
  }

  removeItem(key: string): Promise<void> {
    return this.enqueue(async () => {
      await AsyncStorage.removeItem(key);
      if (!this.isWeb) await SecureStore.deleteItemAsync(key);
    });
  }

  setItem(key: string, value: string): Promise<void> {
    return this.enqueue(async () => {
      if (this.isWeb) {
        await AsyncStorage.setItem(key, value);
        return;
      }
      const encrypted = await this.encrypt(key, value);
      await AsyncStorage.setItem(key, encrypted);
    });
  }
}
