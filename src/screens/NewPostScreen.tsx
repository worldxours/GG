import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';

import { Colors, Spacing, Radius, Typography } from '../theme';
import { useAuth } from '../context/AuthContext';
import { ScreenHeader, PrimaryButton } from '../components';
import { createPost } from '../lib/postService';

// ── Meme templates (from GitHub Pages prototype hosting) ──────────────────────
const MEME_BASE = 'https://worldxours.github.io/runit-prototype/images/memes/';
const MEME_FILENAMES = [
  '2rgzeg3098z91.jpg',
  '351b28be-sports44-728x522.jpg',
  '40f9d10e-sports46-728x546.jpg',
  '591b2ecb-sports40.jpg',
  '5bd1850d-sports31.jpg',
  '66pn9h.gif',
  '80724499-sports15.jpg',
  'Alien God Looks Down at Lower Beings Empty Template.jpg',
  'Backing Up The Car Empty Template - Nope - voiture marche arri\u00e8re.jpg',
  'Clown ronald.jpg',
  'Indiana Jones totem - full clean bas.jpg',
  'John Cena laughing.jpg',
  'Lebron James at Monday Night Raw, 2003.jpg',
  'Messi.jpg',
  'Officer K.png',
  'Soap on the floor savon savonette douche ramasse.jpg',
  'Steve.jpg',
  'Wow genius so funny.jpg',
  '_Tell Me The Truth I_m Ready To Hear It_ _ Tell Me The Truth\u2026I_m\u2026I_m Ready To Hear It - Spider-Man Template.jpg',
  'ab sign.png',
  'adfirst into the sand.png',
  'average superhero fans.png',
  'crying kid gun.png',
  'damnagain.jfif',
  'download (18).png',
  'download (22).png',
  'dude into trash can.png',
  'dude throws rock at self.png',
  'ftsgyff4ltu6n4qh.jpg',
  'hoes mad.png',
  'img_2_1668731750125 (1).jpg',
  'interogation black.jpg',
  'jkj97diq0k0a1.jpg',
  'mickael jackson popcorn.png',
  'morgan freeman.png',
  'th.jpg',
  'types of headache maux douleur tete crane.png',
  'yH.gif',
];
const MEME_TEMPLATES = MEME_FILENAMES.map((f) => ({
  uri:   MEME_BASE + encodeURIComponent(f),
  label: f.replace(/\.[^.]+$/, '').slice(0, 28),
}));

// ── Sub-view type ─────────────────────────────────────────────────────────────
type SubView = 'compose' | 'meme-picker' | 'meme-editor';

// ── Screen width for meme grid ─────────────────────────────────────────────────
const { width: SCREEN_W } = Dimensions.get('window');
const MEME_TILE = (SCREEN_W - Spacing.lg * 2 - Spacing.sm) / 2;

// ── NewPostScreen ─────────────────────────────────────────────────────────────
export default function NewPostScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();

  const [subView, setSubView]               = useState<SubView>('compose');
  const [caption, setCaption]               = useState('');
  const [photoUri, setPhotoUri]             = useState<string | null>(null);
  const [isMeme, setIsMeme]                 = useState(false);
  const [memeUri, setMemeUri]               = useState<string | null>(null);
  const [topText, setTopText]               = useState('');
  const [botText, setBotText]               = useState('');
  const [pendingMemeUri, setPendingMemeUri] = useState<string | null>(null);
  const [posting, setPosting]               = useState(false);
  const [errorMsg, setErrorMsg]             = useState<string | null>(null);

  const captionRef = useRef<TextInput>(null);

  const currentUid = user?.uid ?? '';

  // The active image for the post
  const activeImageUri = isMeme ? memeUri : photoUri;

  // Post button is enabled when there's a caption OR an image
  const canPost = (caption.trim().length > 0 || activeImageUri !== null) && !posting;

  // ── Cancel: return to Home tab ───────────────────────────────────────────────
  const handleCancel = () => {
    setSubView('compose');
    setCaption('');
    setPhotoUri(null);
    setIsMeme(false);
    setMemeUri(null);
    setTopText('');
    setBotText('');
    setErrorMsg(null);
    (navigation as any).navigate('Home');
  };

  // ── Photo picker ─────────────────────────────────────────────────────────────
  const handlePickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      setPhotoUri(result.assets[0].uri);
      setIsMeme(false);
      setMemeUri(null);
    }
  };

  // ── Meme picker: select template → go to editor ───────────────────────────────
  const handleSelectMemeTemplate = (uri: string) => {
    setPendingMemeUri(uri);
    setTopText('');
    setBotText('');
    setSubView('meme-editor');
  };

  // ── Meme editor: confirm → back to compose with meme data ─────────────────────
  const handleUseMeme = () => {
    if (!pendingMemeUri) return;
    setMemeUri(pendingMemeUri);
    setIsMeme(true);
    setPhotoUri(null);
    setSubView('compose');
  };

  // ── Post ─────────────────────────────────────────────────────────────────────
  const handlePost = async () => {
    if (!canPost || !currentUid) return;
    setPosting(true);
    setErrorMsg(null);
    try {
      if (isMeme && memeUri) {
        await createPost({
          type:    'meme',
          userId:  currentUid,
          imageUrl: memeUri,
          caption:  caption.trim() || null,
          topText:  topText.trim() || null,
          botText:  botText.trim() || null,
        });
      } else {
        await createPost({
          type:     'photo',
          userId:   currentUid,
          imageUrl: photoUri,
          caption:  caption.trim() || null,
        });
      }
      // Reset and go Home
      handleCancel();
    } catch (e: any) {
      console.error('NewPostScreen: post error', e);
      setErrorMsg(e?.message ?? 'Could not post. Try again.');
    } finally {
      setPosting(false);
    }
  };

  // ── Render sub-views ──────────────────────────────────────────────────────────
  if (subView === 'meme-picker') {
    return <MemePicker onSelect={handleSelectMemeTemplate} onBack={() => setSubView('compose')} />;
  }

  if (subView === 'meme-editor') {
    return (
      <MemeEditor
        memeUri={pendingMemeUri}
        topText={topText}
        botText={botText}
        onTopText={setTopText}
        onBotText={setBotText}
        onUse={handleUseMeme}
        onBack={() => setSubView('meme-picker')}
      />
    );
  }

  // ── Compose view ──────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader
        title="New Post"
        onBack={null}
        rightElement={
          <TouchableOpacity onPress={handleCancel} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.cancelText}>✕</Text>
          </TouchableOpacity>
        }
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Image preview */}
          {activeImageUri && (
            <View style={styles.imagePreviewWrap}>
              <Image
                source={{ uri: activeImageUri }}
                style={styles.imagePreview}
                resizeMode={isMeme ? 'contain' : 'cover'}
              />
              {isMeme && topText ? (
                <Text style={[styles.memeOverlay, styles.memeOverlayTop]}>
                  {topText.toUpperCase()}
                </Text>
              ) : null}
              {isMeme && botText ? (
                <Text style={[styles.memeOverlay, styles.memeOverlayBot]}>
                  {botText.toUpperCase()}
                </Text>
              ) : null}
              <TouchableOpacity
                style={styles.clearImageBtn}
                onPress={() => { setPhotoUri(null); setIsMeme(false); setMemeUri(null); }}
              >
                <Text style={styles.clearImageText}>✕</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Caption input */}
          <TouchableOpacity
            activeOpacity={1}
            style={styles.captionWrap}
            onPress={() => captionRef.current?.focus()}
          >
            <TextInput
              ref={captionRef}
              style={styles.captionInput}
              placeholder="What's on your mind?"
              placeholderTextColor={Colors.muted}
              value={caption}
              onChangeText={setCaption}
              multiline
              textAlignVertical="top"
              maxLength={300}
            />
            {caption.length > 0 && (
              <Text style={styles.charCount}>{caption.length}/300</Text>
            )}
          </TouchableOpacity>

          {/* Action buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={handlePickPhoto} activeOpacity={0.8}>
              <Text style={styles.actionIcon}>📷</Text>
              <Text style={styles.actionLabel}>Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => setSubView('meme-picker')}
              activeOpacity={0.8}
            >
              <Text style={styles.actionIcon}>😂</Text>
              <Text style={styles.actionLabel}>Meme</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => (navigation as any).navigate('NewWager')}
              activeOpacity={0.8}
            >
              <Text style={styles.actionIcon}>🎯</Text>
              <Text style={styles.actionLabel}>Wager</Text>
            </TouchableOpacity>
          </View>

          {/* Error banner */}
          {errorMsg && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>⚠ {errorMsg}</Text>
              <TouchableOpacity onPress={() => setErrorMsg(null)}>
                <Text style={styles.errorDismiss}>✕</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Post button */}
          <View style={styles.postBtnWrap}>
            <PrimaryButton
              label="Post"
              onPress={handlePost}
              loading={posting}
              disabled={!canPost}
            />
          </View>

          <View style={{ height: Spacing.xxxl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Meme Picker sub-view ──────────────────────────────────────────────────────
function MemePicker({
  onSelect,
  onBack,
}: {
  onSelect: (uri: string) => void;
  onBack: () => void;
}) {
  const renderItem = ({ item }: { item: typeof MEME_TEMPLATES[0] }) => (
    <TouchableOpacity
      style={styles.memeTile}
      onPress={() => onSelect(item.uri)}
      activeOpacity={0.8}
    >
      <Image source={{ uri: item.uri }} style={styles.memeTileImage} resizeMode="cover" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Pick a Meme" onBack={onBack} />
      <FlatList
        data={MEME_TEMPLATES}
        keyExtractor={(item) => item.uri}
        numColumns={2}
        renderItem={renderItem}
        contentContainerStyle={styles.memeGrid}
        showsVerticalScrollIndicator={false}
        columnWrapperStyle={styles.memeRow}
      />
    </SafeAreaView>
  );
}

// ── Meme Editor sub-view ──────────────────────────────────────────────────────
function MemeEditor({
  memeUri,
  topText,
  botText,
  onTopText,
  onBotText,
  onUse,
  onBack,
}: {
  memeUri: string | null;
  topText: string;
  botText: string;
  onTopText: (t: string) => void;
  onBotText: (t: string) => void;
  onUse: () => void;
  onBack: () => void;
}) {
  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Edit Meme" onBack={onBack} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.editorContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Meme preview */}
          <View style={styles.editorPreviewWrap}>
            {memeUri ? (
              <Image
                source={{ uri: memeUri }}
                style={styles.editorImage}
                resizeMode="contain"
              />
            ) : null}
            {topText ? (
              <Text style={[styles.editorOverlay, styles.editorOverlayTop]}>
                {topText.toUpperCase()}
              </Text>
            ) : null}
            {botText ? (
              <Text style={[styles.editorOverlay, styles.editorOverlayBot]}>
                {botText.toUpperCase()}
              </Text>
            ) : null}
          </View>

          {/* Text inputs */}
          <View style={styles.editorInputsWrap}>
            <TextInput
              style={styles.editorInput}
              placeholder="Top text..."
              placeholderTextColor={Colors.muted}
              value={topText}
              onChangeText={onTopText}
              maxLength={80}
              returnKeyType="next"
              autoCapitalize="characters"
            />
            <TextInput
              style={[styles.editorInput, { marginTop: Spacing.sm }]}
              placeholder="Bottom text..."
              placeholderTextColor={Colors.muted}
              value={botText}
              onChangeText={onBotText}
              maxLength={80}
              returnKeyType="done"
              autoCapitalize="characters"
            />
          </View>

          <View style={styles.editorBtnWrap}>
            <PrimaryButton label="Use This" onPress={onUse} />
          </View>

          <View style={{ height: Spacing.xxxl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: Colors.bg },
  flex:          { flex: 1 },
  scroll:        { flex: 1 },
  scrollContent: { paddingBottom: Spacing.xl },

  cancelText: {
    fontSize: 18,
    color: Colors.muted,
    paddingHorizontal: 4,
  },

  // Image preview
  imagePreviewWrap: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    borderRadius: Radius.card,
    overflow: 'hidden',
    backgroundColor: '#000',
    aspectRatio: 4 / 3,
  },
  imagePreview: {
    ...StyleSheet.absoluteFillObject,
  },
  memeOverlay: {
    position: 'absolute',
    left: 0, right: 0,
    fontFamily: Typography.heading,
    fontSize: 22,
    color: '#fff',
    textAlign: 'center',
    paddingHorizontal: Spacing.sm,
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  memeOverlayTop: { top: 10 },
  memeOverlayBot: { bottom: 10 },
  clearImageBtn: {
    position: 'absolute',
    top: 8, right: 8,
    width: 28, height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearImageText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  // Caption
  captionWrap: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    backgroundColor: Colors.raised,
    borderRadius: Radius.input,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    minHeight: 100,
  },
  captionInput: {
    color: Colors.text,
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    lineHeight: 22,
    minHeight: 70,
  },
  charCount: {
    fontSize: 10,
    color: Colors.muted,
    textAlign: 'right',
    marginTop: 4,
  },

  // Action buttons
  actionRow: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: Colors.raised,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 4,
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  actionIcon:  { fontSize: 20 },
  actionLabel: { fontSize: 10, fontWeight: '700', color: Colors.muted, letterSpacing: 0.5 },

  // Error
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderWidth: 1,
    borderColor: Colors.loss,
  },
  errorText:    { fontSize: 13, color: Colors.loss, flex: 1 },
  errorDismiss: { fontSize: 14, color: Colors.loss, paddingLeft: 8 },

  // Post button
  postBtnWrap: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
  },

  // Meme grid
  memeGrid: { padding: Spacing.lg },
  memeRow:  { gap: Spacing.sm },
  memeTile: {
    width: MEME_TILE,
    height: MEME_TILE,
    borderRadius: Radius.md,
    overflow: 'hidden',
    backgroundColor: Colors.raised,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  memeTileImage: { width: '100%', height: '100%' },

  // Meme editor
  editorContent: { paddingBottom: Spacing.xl },
  editorPreviewWrap: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    aspectRatio: 4 / 3,
    borderRadius: Radius.card,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  editorImage: {
    ...StyleSheet.absoluteFillObject,
  },
  editorOverlay: {
    position: 'absolute',
    left: 0, right: 0,
    fontFamily: Typography.heading,
    fontSize: 22,
    color: '#fff',
    textAlign: 'center',
    paddingHorizontal: Spacing.sm,
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  editorOverlayTop: { top: 10 },
  editorOverlayBot: { bottom: 10 },
  editorInputsWrap: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
  },
  editorInput: {
    backgroundColor: Colors.bg,
    borderRadius: Radius.input,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    color: Colors.text,
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
  },
  editorBtnWrap: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
  },
});
