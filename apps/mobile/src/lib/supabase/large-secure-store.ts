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
// On web there is no SecureStore (and `expo-secure-store`'s web shim touches
// `window`, which breaks under Expo Router's static rendering). Web is only a
// development convenience here — the real targets are iOS/Android — so it
// falls back to plain AsyncStorage (localStorage) with no encryption.
export class LargeSecureStore {
  private get isWeb() {
    return Platform.OS === "web";
  }

  private async encrypt(key: string, value: string): Promise<string> {
    const encryptionKey = crypto.getRandomValues(new Uint8Array(32));
    const cipher = new aesjs.ModeOfOperation.ctr(encryptionKey, new aesjs.Counter(1));
    const encryptedBytes = cipher.encrypt(aesjs.utils.utf8.toBytes(value));

    await SecureStore.setItemAsync(key, aesjs.utils.hex.fromBytes(encryptionKey));

    return aesjs.utils.hex.fromBytes(encryptedBytes);
  }

  private async decrypt(key: string, value: string): Promise<string | null> {
    const encryptionKeyHex = await SecureStore.getItemAsync(key);
    if (!encryptionKeyHex) return null;

    const cipher = new aesjs.ModeOfOperation.ctr(
      aesjs.utils.hex.toBytes(encryptionKeyHex),
      new aesjs.Counter(1),
    );
    const decryptedBytes = cipher.decrypt(aesjs.utils.hex.toBytes(value));

    return aesjs.utils.utf8.fromBytes(decryptedBytes);
  }

  async getItem(key: string): Promise<string | null> {
    const stored = await AsyncStorage.getItem(key);
    if (!stored) return null;
    if (this.isWeb) return stored;
    return this.decrypt(key, stored);
  }

  async removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
    if (!this.isWeb) await SecureStore.deleteItemAsync(key);
  }

  async setItem(key: string, value: string): Promise<void> {
    if (this.isWeb) {
      await AsyncStorage.setItem(key, value);
      return;
    }
    const encrypted = await this.encrypt(key, value);
    await AsyncStorage.setItem(key, encrypted);
  }
}
