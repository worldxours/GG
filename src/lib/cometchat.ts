import { CometChat } from '@cometchat/chat-sdk-react-native';

const APP_ID   = process.env.EXPO_PUBLIC_COMETCHAT_APP_ID   ?? '';
const REGION   = process.env.EXPO_PUBLIC_COMETCHAT_REGION   ?? 'us';
const AUTH_KEY = process.env.EXPO_PUBLIC_COMETCHAT_AUTH_KEY ?? '';

export async function initCometChat(): Promise<void> {
  const settings = new CometChat.AppSettingsBuilder()
    .subscribePresenceForAllUsers()
    .setRegion(REGION)
    .autoEstablishSocketConnection(true)
    .build();
  await CometChat.init(APP_ID, settings);
}

export async function createCometChatUser(uid: string, displayName: string): Promise<void> {
  const user = new CometChat.User(uid);
  user.setName(displayName);
  try {
    await CometChat.createUser(user, AUTH_KEY);
  } catch (e: any) {
    // ERR_UID_ALREADY_EXISTS — user already created, safe to ignore
    if (e?.code !== 'ERR_UID_ALREADY_EXISTS') throw e;
  }
}

export async function loginCometChat(uid: string): Promise<void> {
  try {
    await CometChat.login(uid, AUTH_KEY);
  } catch (e: any) {
    // Already logged in — safe to ignore
    if (e?.code === 'ERR_ALREADY_LOGGED_IN') return;
    throw e;
  }
}

export async function logoutCometChat(): Promise<void> {
  try {
    await CometChat.logout();
  } catch {
    // Ignore logout errors (e.g. not logged in)
  }
}
