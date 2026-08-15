import { useCallback, useEffect, useState } from "react";
import {
  deliveryRushAudio,
  type DeliveryRushSound,
  type DeliveryRushSoundOptions,
} from "../audio/deliveryRushAudio";

export function useDeliveryRushSound() {
  const [isSoundEnabled, setIsSoundEnabled] = useState(() =>
    deliveryRushAudio.isEnabled(),
  );

  useEffect(() => {
    const unsubscribe = deliveryRushAudio.subscribe(setIsSoundEnabled);

    deliveryRushAudio.preload();

    return unsubscribe;
  }, []);

  const unlockAudio = useCallback(() => {
    void deliveryRushAudio.unlock();
  }, []);

  const playSound = useCallback(
    (sound: DeliveryRushSound, options?: DeliveryRushSoundOptions) => {
      deliveryRushAudio.playSound(sound, options);
    },
    [],
  );

  const toggleSound = useCallback(() => deliveryRushAudio.toggleEnabled(), []);

  const startMusic = useCallback((playbackRate?: number) => {
    deliveryRushAudio.startMusic(playbackRate);
  }, []);

  const stopMusic = useCallback((fadeSeconds?: number) => {
    deliveryRushAudio.stopMusic(fadeSeconds);
  }, []);

  const setMusicPlaybackRate = useCallback((playbackRate: number) => {
    deliveryRushAudio.setMusicPlaybackRate(playbackRate);
  }, []);

  return {
    isSoundEnabled,
    playSound,
    setMusicPlaybackRate,
    startMusic,
    stopMusic,
    toggleSound,
    unlockAudio,
  };
}
