export type StoredFile = {
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
};

export interface FileStorageAdapter {
  put(file: StoredFile): Promise<StoredFile>;
  getDownloadUrl(fileUrl: string): Promise<string>;
}

export class LocalFileStorageAdapter implements FileStorageAdapter {
  async put(file: StoredFile) {
    return file;
  }

  async getDownloadUrl(fileUrl: string) {
    return fileUrl;
  }
}

export function getFileStorageAdapter(): FileStorageAdapter {
  return new LocalFileStorageAdapter();
}
