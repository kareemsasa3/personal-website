import type {
  RhythmLabAudioBlobRecord,
  RhythmLabChart,
  RhythmLabPreferences,
  RhythmLabRun,
  RhythmLabSong,
  SaveSongWithBlobInput,
} from "./types";

export const RHYTHM_LAB_DB_NAME = "rhythm-lab-library";
export const RHYTHM_LAB_DB_VERSION = 1;
export const RHYTHM_LAB_PREFERENCES_ID = "rhythm-lab";

export const RHYTHM_LAB_STORES = {
  songs: "songs",
  audioBlobs: "audioBlobs",
  charts: "charts",
  runs: "runs",
  preferences: "preferences",
} as const;

export const RHYTHM_LAB_INDEXES = {
  songsByImportedAt: "songs.byImportedAt",
  songsByFingerprint: "songs.byFingerprint",
  chartsBySongId: "charts.bySongId",
  chartsBySongIdUpdatedAt: "charts.bySongIdUpdatedAt",
  runsByChartIdPlayedAt: "runs.byChartIdPlayedAt",
  runsBySongIdPlayedAt: "runs.bySongIdPlayedAt",
  runsByPlayedAt: "runs.byPlayedAt",
} as const;

export type RhythmLabDbErrorCode =
  | "unavailable"
  | "open-failed"
  | "blocked"
  | "transaction-failed"
  | "request-failed";

export class RhythmLabDbError extends Error {
  readonly code: RhythmLabDbErrorCode;
  readonly originalError?: unknown;

  constructor(
    code: RhythmLabDbErrorCode,
    message: string,
    originalError?: unknown
  ) {
    super(message);
    this.name = "RhythmLabDbError";
    this.code = code;
    this.originalError = originalError;
  }
}

const createStore = (
  db: IDBDatabase,
  storeName: string,
  options: IDBObjectStoreParameters = { keyPath: "id" }
) => {
  if (db.objectStoreNames.contains(storeName)) {
    return null;
  }

  return db.createObjectStore(storeName, options);
};

const createIndex = (
  store: IDBObjectStore | null,
  indexName: string,
  keyPath: string | string[],
  options?: IDBIndexParameters
) => {
  if (!store || store.indexNames.contains(indexName)) return;

  store.createIndex(indexName, keyPath, options);
};

const upgradeDatabase = (db: IDBDatabase) => {
  const songs = createStore(db, RHYTHM_LAB_STORES.songs);
  createIndex(
    songs,
    RHYTHM_LAB_INDEXES.songsByImportedAt,
    "importedAt"
  );
  createIndex(
    songs,
    RHYTHM_LAB_INDEXES.songsByFingerprint,
    "fingerprint",
    { unique: true }
  );

  createStore(db, RHYTHM_LAB_STORES.audioBlobs);

  const charts = createStore(db, RHYTHM_LAB_STORES.charts);
  createIndex(charts, RHYTHM_LAB_INDEXES.chartsBySongId, "songId");
  createIndex(charts, RHYTHM_LAB_INDEXES.chartsBySongIdUpdatedAt, [
    "songId",
    "updatedAt",
  ]);

  const runs = createStore(db, RHYTHM_LAB_STORES.runs);
  createIndex(runs, RHYTHM_LAB_INDEXES.runsByChartIdPlayedAt, [
    "chartId",
    "playedAt",
  ]);
  createIndex(runs, RHYTHM_LAB_INDEXES.runsBySongIdPlayedAt, [
    "songId",
    "playedAt",
  ]);
  createIndex(runs, RHYTHM_LAB_INDEXES.runsByPlayedAt, "playedAt");

  createStore(db, RHYTHM_LAB_STORES.preferences);
};

const requestToPromise = <T>(request: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(
        new RhythmLabDbError(
          "request-failed",
          "Rhythm Lab IndexedDB request failed.",
          request.error
        )
      );
  });

const transactionToPromise = (transaction: IDBTransaction): Promise<void> =>
  new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(
        new RhythmLabDbError(
          "transaction-failed",
          "Rhythm Lab IndexedDB transaction failed.",
          transaction.error
        )
      );
    transaction.onabort = () =>
      reject(
        new RhythmLabDbError(
          "transaction-failed",
          "Rhythm Lab IndexedDB transaction was aborted.",
          transaction.error
        )
      );
  });

const compareNewestFirst = (first: string, second: string) =>
  second.localeCompare(first);

const getStoreRecord = async <T>(
  db: IDBDatabase,
  storeName: string,
  id: string
): Promise<T | null> => {
  const transaction = db.transaction(storeName, "readonly");
  const request = transaction.objectStore(storeName).get(id);
  const record = await requestToPromise<T | undefined>(request);
  await transactionToPromise(transaction);

  return record ?? null;
};

const getAllStoreRecords = async <T>(
  db: IDBDatabase,
  storeName: string
): Promise<T[]> => {
  const transaction = db.transaction(storeName, "readonly");
  const request = transaction.objectStore(storeName).getAll();
  const records = await requestToPromise<T[]>(request);
  await transactionToPromise(transaction);

  return records;
};

const getAllFromIndex = async <T>(
  db: IDBDatabase,
  storeName: string,
  indexName: string,
  query: IDBValidKey | IDBKeyRange
): Promise<T[]> => {
  const transaction = db.transaction(storeName, "readonly");
  const request = transaction
    .objectStore(storeName)
    .index(indexName)
    .getAll(query);
  const records = await requestToPromise<T[]>(request);
  await transactionToPromise(transaction);

  return records;
};

const getFromIndex = async <T>(
  db: IDBDatabase,
  storeName: string,
  indexName: string,
  query: IDBValidKey | IDBKeyRange
): Promise<T | null> => {
  const transaction = db.transaction(storeName, "readonly");
  const request = transaction
    .objectStore(storeName)
    .index(indexName)
    .get(query);
  const record = await requestToPromise<T | undefined>(request);
  await transactionToPromise(transaction);

  return record ?? null;
};

const putStoreRecord = async <T>(
  db: IDBDatabase,
  storeName: string,
  record: T
): Promise<T> => {
  const transaction = db.transaction(storeName, "readwrite");
  transaction.objectStore(storeName).put(record);
  await transactionToPromise(transaction);

  return record;
};

export const openRhythmLabDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      reject(
        new RhythmLabDbError(
          "unavailable",
          "IndexedDB is not available in this browser context."
        )
      );
      return;
    }

    const request = window.indexedDB.open(
      RHYTHM_LAB_DB_NAME,
      RHYTHM_LAB_DB_VERSION
    );

    request.onupgradeneeded = () => {
      upgradeDatabase(request.result);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(
        new RhythmLabDbError(
          "open-failed",
          "Unable to open the Rhythm Lab IndexedDB database.",
          request.error
        )
      );
    request.onblocked = () =>
      reject(
        new RhythmLabDbError(
          "blocked",
          "Rhythm Lab IndexedDB upgrade was blocked by another open tab."
        )
      );
  });

export const saveSongWithBlob = async (
  db: IDBDatabase,
  { song, blob }: SaveSongWithBlobInput
): Promise<RhythmLabSong> => {
  const existingSong = await getSongByFingerprint(db, song.fingerprint);
  if (existingSong) {
    return existingSong;
  }

  const transaction = db.transaction(
    [RHYTHM_LAB_STORES.audioBlobs, RHYTHM_LAB_STORES.songs],
    "readwrite"
  );
  const audioBlobRecord: RhythmLabAudioBlobRecord = {
    id: song.audioBlobId,
    blob,
  };

  transaction.objectStore(RHYTHM_LAB_STORES.audioBlobs).put(audioBlobRecord);
  transaction.objectStore(RHYTHM_LAB_STORES.songs).put(song);
  await transactionToPromise(transaction);

  return song;
};

export const getSongs = async (db: IDBDatabase): Promise<RhythmLabSong[]> => {
  const songs = await getAllStoreRecords<RhythmLabSong>(
    db,
    RHYTHM_LAB_STORES.songs
  );

  return songs.sort((first, second) =>
    compareNewestFirst(first.importedAt, second.importedAt)
  );
};

export const getSong = (
  db: IDBDatabase,
  songId: string
): Promise<RhythmLabSong | null> =>
  getStoreRecord<RhythmLabSong>(db, RHYTHM_LAB_STORES.songs, songId);

export const getSongByFingerprint = (
  db: IDBDatabase,
  fingerprint: string
): Promise<RhythmLabSong | null> =>
  getFromIndex<RhythmLabSong>(
    db,
    RHYTHM_LAB_STORES.songs,
    RHYTHM_LAB_INDEXES.songsByFingerprint,
    fingerprint
  );

export const getAudioBlob = async (
  db: IDBDatabase,
  audioBlobId: string
): Promise<Blob | null> => {
  const record = await getStoreRecord<RhythmLabAudioBlobRecord>(
    db,
    RHYTHM_LAB_STORES.audioBlobs,
    audioBlobId
  );

  return record?.blob ?? null;
};

export const saveChart = (
  db: IDBDatabase,
  chart: RhythmLabChart
): Promise<RhythmLabChart> =>
  putStoreRecord(db, RHYTHM_LAB_STORES.charts, chart);

export const getChartsForSong = async (
  db: IDBDatabase,
  songId: string | null
): Promise<RhythmLabChart[]> => {
  const charts =
    songId === null
      ? (await getAllStoreRecords<RhythmLabChart>(
          db,
          RHYTHM_LAB_STORES.charts
        )).filter((chart) => chart.songId === null)
      : await getAllFromIndex<RhythmLabChart>(
          db,
          RHYTHM_LAB_STORES.charts,
          RHYTHM_LAB_INDEXES.chartsBySongId,
          songId
        );

  return charts.sort((first, second) =>
    compareNewestFirst(first.updatedAt, second.updatedAt)
  );
};

export const saveRun = (
  db: IDBDatabase,
  run: RhythmLabRun
): Promise<RhythmLabRun> => putStoreRecord(db, RHYTHM_LAB_STORES.runs, run);

export const getRunsForChart = async (
  db: IDBDatabase,
  chartId: string
): Promise<RhythmLabRun[]> => {
  const lowerBound: [string, string] = [chartId, ""];
  const upperBound: [string, string] = [chartId, "\uffff"];
  const runs = await getAllFromIndex<RhythmLabRun>(
    db,
    RHYTHM_LAB_STORES.runs,
    RHYTHM_LAB_INDEXES.runsByChartIdPlayedAt,
    IDBKeyRange.bound(lowerBound, upperBound)
  );

  return runs.sort((first, second) =>
    compareNewestFirst(first.playedAt, second.playedAt)
  );
};

export const getPreferences = (
  db: IDBDatabase
): Promise<RhythmLabPreferences | null> =>
  getStoreRecord<RhythmLabPreferences>(
    db,
    RHYTHM_LAB_STORES.preferences,
    RHYTHM_LAB_PREFERENCES_ID
  );

export const savePreferences = (
  db: IDBDatabase,
  preferences: RhythmLabPreferences
): Promise<RhythmLabPreferences> =>
  putStoreRecord(db, RHYTHM_LAB_STORES.preferences, preferences);
