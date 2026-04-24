export const CONTENT_FILE_BUCKET = "course-files";

const LIST_LIMIT = 100;
const MAX_STORAGE_DEPTH = 6;

type StorageFileItem = {
  name: string;
  id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  metadata?: {
    size?: number | string | null;
    contentLength?: number | string | null;
    content_length?: number | string | null;
  } | null;
};

type StorageListClient = {
  storage: {
    from: (bucket: string) => {
      list: (
        path?: string,
        options?: {
          limit?: number;
          offset?: number;
          sortBy?: {
            column: string;
            order: "asc" | "desc";
          };
        }
      ) => Promise<{
        data: StorageFileItem[] | null;
        error: { message: string } | null;
      }>;
    };
  };
};

export type ContentPdfStorageFile = {
  path: string;
  name: string;
  sizeBytes: number;
  createdAt: string | null;
  updatedAt: string | null;
};

function normalizeSize(value: number | string | null | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function isStorageDirectory(item: StorageFileItem) {
  return !item.name.toLowerCase().endsWith(".pdf") && !item.id && !item.metadata;
}

function buildStoragePath(prefix: string, name: string) {
  return `${prefix.replace(/\/$/, "")}/${name.replace(/^\//, "")}`;
}

export async function listOrganizationContentPdfFiles(
  admin: StorageListClient,
  organizationId: string
): Promise<ContentPdfStorageFile[]> {
  const bucket = admin.storage.from(CONTENT_FILE_BUCKET);
  const rootPrefix = `${organizationId}/courses`;
  const files: ContentPdfStorageFile[] = [];

  async function walk(prefix: string, depth: number) {
    if (depth > MAX_STORAGE_DEPTH) {
      return;
    }

    let offset = 0;

    while (true) {
      const { data, error } = await bucket.list(prefix, {
        limit: LIST_LIMIT,
        offset,
        sortBy: {
          column: "name",
          order: "asc"
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      const items = data ?? [];

      for (const item of items) {
        const itemPath = buildStoragePath(prefix, item.name);

        if (item.name.toLowerCase().endsWith(".pdf")) {
          files.push({
            path: itemPath,
            name: item.name,
            sizeBytes: normalizeSize(item.metadata?.size ?? item.metadata?.contentLength ?? item.metadata?.content_length),
            createdAt: item.created_at ?? null,
            updatedAt: item.updated_at ?? null
          });
        } else if (isStorageDirectory(item)) {
          await walk(itemPath, depth + 1);
        }
      }

      if (items.length < LIST_LIMIT) {
        break;
      }

      offset += LIST_LIMIT;
    }
  }

  await walk(rootPrefix, 0);

  return files;
}
