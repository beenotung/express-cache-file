export type Content = {
  buffer: Buffer;
  mimeType: string;
  expire?: number;
};

export type Cache = {
  capacity?: number; // bytes
  unsedSize: number; // bytes
  expireInterval?: number;
  files: Record<string, Content>;
};

export type Callback = (err: any, content: Content) => void;

export type GetFileFn = (file: string, cb: Callback) => void;
