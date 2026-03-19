// Web stub — CometChat is a native-only module.
// Metro picks cometchat.native.ts for iOS/Android; this file is used for web.
// All functions are no-ops so AuthContext works unchanged on web.

export async function initCometChat(): Promise<void> {}

export async function createCometChatUser(_uid: string, _displayName: string): Promise<void> {}

export async function loginCometChat(_uid: string): Promise<void> {}

export async function logoutCometChat(): Promise<void> {}
