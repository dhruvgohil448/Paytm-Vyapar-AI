export async function playSoundboxClip(): Promise<void> {
  try {
    const { createAudioPlayer, setAudioModeAsync } = await import("expo-audio");
    await setAudioModeAsync({ playsInSilentMode: true });
    const player = createAudioPlayer(require("../assets/soundbox.m4a"));
    let released = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let subscription: { remove(): void } | undefined;
    const finish = () => {
      if (released) return;
      released = true;
      clearTimeout(timer);
      subscription?.remove();
      player.release();
    };
    subscription = player.addListener("playbackStatusUpdate", (status) => {
      if (status.didJustFinish) finish();
    });
    timer = setTimeout(finish, 15000);
    player.play();
  } catch {
    // The pay result still shows if this Expo Go build has no audio module.
  }
}
