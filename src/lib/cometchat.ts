// CometChat SDK requires a development build (not Expo Go).
// Install + configure during EAS Build setup (Phase 5).
// Stubbed here so imports resolve cleanly.

export const COMETCHAT_APP_ID = process.env.EXPO_PUBLIC_COMETCHAT_APP_ID ?? '';
export const COMETCHAT_REGION = process.env.EXPO_PUBLIC_COMETCHAT_REGION ?? 'us';
export const COMETCHAT_AUTH_KEY = process.env.EXPO_PUBLIC_COMETCHAT_AUTH_KEY ?? '';

export async function initCometChat(): Promise<void> {
  // TODO (Phase 5): import { CometChat } from '@cometchat/chat-sdk-react-native'
  // await CometChat.init(COMETCHAT_APP_ID, new CometChat.AppSettingsBuilder()
  //   .subscribePresenceForAllUsers()
  //   .setRegion(COMETCHAT_REGION)
  //   .build());
  console.log('[CometChat] stub — dev build required');
}
