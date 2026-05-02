import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

export const useLocalAudioFile = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const hasSelectedFileRef = useRef(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPausedAfterVisibilityChange, setIsPausedAfterVisibilityChange] =
    useState(false);

  const clearObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const resetAudioElement = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    audio.removeAttribute("src");
    audio.load();
  }, []);

  const handleFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.currentTarget.files?.[0] ?? null;

      setError(null);
      setIsPausedAfterVisibilityChange(false);
      clearObjectUrl();

      if (!file) {
        hasSelectedFileRef.current = false;
        setFileName(null);
        resetAudioElement();
        return;
      }

      const objectUrl = URL.createObjectURL(file);
      const audio = audioRef.current;

      objectUrlRef.current = objectUrl;
      hasSelectedFileRef.current = true;
      setFileName(file.name);

      if (audio) {
        audio.pause();
        audio.src = objectUrl;
        audio.currentTime = 0;
        audio.load();
      }
    },
    [clearObjectUrl, resetAudioElement]
  );

  const playFromStart = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || !hasSelectedFileRef.current) return true;

    try {
      audio.pause();
      audio.currentTime = 0;
      await audio.play();
      setError(null);
      setIsPausedAfterVisibilityChange(false);
      return true;
    } catch {
      setError("Audio playback was blocked. Press Start again to retry.");
      return false;
    }
  }, []);

  const resumePlayback = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || !hasSelectedFileRef.current) return true;

    try {
      await audio.play();
      setError(null);
      setIsPausedAfterVisibilityChange(false);
      return true;
    } catch {
      setError("Audio playback was blocked. Press Resume to retry.");
      return false;
    }
  }, []);

  const pausePlayback = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const getElapsedMs = useCallback(() => {
    const audio = audioRef.current;
    return audio ? audio.currentTime * 1000 : 0;
  }, []);

  const isPlaybackComplete = useCallback(() => {
    const audio = audioRef.current;
    return Boolean(audio?.ended);
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      const audio = audioRef.current;
      if (!document.hidden || !audio || audio.paused) return;

      audio.pause();
      setIsPausedAfterVisibilityChange(true);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  useEffect(
    () => () => {
      resetAudioElement();
      clearObjectUrl();
    },
    [clearObjectUrl, resetAudioElement]
  );

  return {
    audioRef,
    fileName,
    error,
    hasSelectedFile: Boolean(fileName),
    isPausedAfterVisibilityChange,
    handleFileChange,
    playFromStart,
    resumePlayback,
    pausePlayback,
    getElapsedMs,
    isPlaybackComplete,
  };
};
