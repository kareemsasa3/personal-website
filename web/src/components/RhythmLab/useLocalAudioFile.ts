import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  getAudioBlob,
  getPreferences,
  getSong,
  openRhythmLabDb,
  RHYTHM_LAB_PREFERENCES_ID,
  savePreferences,
  saveSongWithBlob,
} from "./library/rhythmLabDb";
import type { RhythmLabPreferences, RhythmLabSong } from "./library/types";

const DEFAULT_SCROLL_SPEED = 1;

const createFileFingerprint = (file: File) =>
  `${file.name}:${file.size}:${file.lastModified}:${file.type}`;

const createStorageKey = (prefix: string, fingerprint: string) =>
  `${prefix}-${encodeURIComponent(fingerprint)}`;

const createSongTitle = (fileName: string) =>
  fileName.replace(/\.[^/.]+$/, "") || fileName;

const createPreferences = (
  activeSongId: string | null,
  previousPreferences: RhythmLabPreferences | null = null
): RhythmLabPreferences => ({
  id: RHYTHM_LAB_PREFERENCES_ID,
  activeSongId,
  activeChartId: previousPreferences?.activeChartId ?? null,
  defaultScrollSpeed:
    previousPreferences?.defaultScrollSpeed ?? DEFAULT_SCROLL_SPEED,
  updatedAt: new Date().toISOString(),
});

export const useLocalAudioFile = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const dbRef = useRef<IDBDatabase | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const hasSelectedFileRef = useRef(false);
  const restoreRequestIdRef = useRef(0);
  const isMountedRef = useRef(true);
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

  const setAudioSource = useCallback(
    (objectUrl: string, nextFileName: string) => {
      const audio = audioRef.current;

      resetAudioElement();
      clearObjectUrl();

      objectUrlRef.current = objectUrl;
      hasSelectedFileRef.current = true;
      setFileName(nextFileName);

      if (audio) {
        audio.src = objectUrl;
        audio.currentTime = 0;
        audio.load();
      }
    },
    [clearObjectUrl, resetAudioElement]
  );

  const clearSelectedAudio = useCallback(() => {
    hasSelectedFileRef.current = false;
    setFileName(null);
    resetAudioElement();
    clearObjectUrl();
  }, [clearObjectUrl, resetAudioElement]);

  const getDb = useCallback(async () => {
    if (dbRef.current) return dbRef.current;

    const db = await openRhythmLabDb();
    dbRef.current = db;
    return db;
  }, []);

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.currentTarget.files?.[0] ?? null;

      restoreRequestIdRef.current += 1;
      setError(null);
      setIsPausedAfterVisibilityChange(false);

      if (!file) {
        clearSelectedAudio();
        return;
      }

      const objectUrl = URL.createObjectURL(file);
      setAudioSource(objectUrl, file.name);

      try {
        const db = await getDb();
        const now = new Date().toISOString();
        const existingPreferences = await getPreferences(db);
        const fingerprint = createFileFingerprint(file);
        const song: RhythmLabSong = {
          id: createStorageKey("song", fingerprint),
          title: createSongTitle(file.name),
          filename: file.name,
          durationMs: null,
          mimeType: file.type || "audio/*",
          sizeBytes: file.size,
          lastModified: Number.isFinite(file.lastModified)
            ? file.lastModified
            : null,
          audioBlobId: createStorageKey("audio", fingerprint),
          fingerprint,
          importedAt: now,
          updatedAt: now,
        };

        await saveSongWithBlob(db, { song, blob: file });
        await savePreferences(
          db,
          createPreferences(song.id, existingPreferences)
        );
      } catch {
        if (!isMountedRef.current) return;

        setError(
          "Storage is unavailable. Audio will work for this session only."
        );
      }
    },
    [clearSelectedAudio, getDb, setAudioSource]
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
    isMountedRef.current = true;

    const handleVisibilityChange = () => {
      const audio = audioRef.current;
      if (!document.hidden || !audio || audio.paused) return;

      audio.pause();
      setIsPausedAfterVisibilityChange(true);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      isMountedRef.current = false;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    const restoreRequestId = restoreRequestIdRef.current + 1;
    restoreRequestIdRef.current = restoreRequestId;

    const restoreActiveSong = async () => {
      try {
        const db = await getDb();
        const preferences = await getPreferences(db);
        const activeSongId = preferences?.activeSongId ?? null;

        if (!activeSongId) return;

        const song = await getSong(db, activeSongId);
        if (!song) {
          await savePreferences(db, createPreferences(null, preferences));
          return;
        }

        const blob = await getAudioBlob(db, song.audioBlobId);
        if (!blob) {
          await savePreferences(db, createPreferences(null, preferences));
          return;
        }

        if (
          !isMountedRef.current ||
          restoreRequestId !== restoreRequestIdRef.current
        ) {
          return;
        }

        const objectUrl = URL.createObjectURL(blob);
        setAudioSource(objectUrl, song.filename);
        setError(null);
      } catch {
        if (
          !isMountedRef.current ||
          restoreRequestId !== restoreRequestIdRef.current
        ) {
          return;
        }

        clearSelectedAudio();
        setError("Saved audio could not be restored. Silent mode is available.");
      }
    };

    void restoreActiveSong();
  }, [clearSelectedAudio, getDb, setAudioSource]);

  useEffect(
    () => () => {
      resetAudioElement();
      clearObjectUrl();
      dbRef.current?.close();
      dbRef.current = null;
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
