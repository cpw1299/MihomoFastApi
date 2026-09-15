// 产品类型定义
export interface Product {
  id: string;
  name: string;
  unitPrice: number;
  colors: string[];
  enabled?: boolean; // 是否在今日页面显示，默认true
}

// 工作记录类型定义
export interface WorkRecord {
  id: string;
  date: string;
  productId: string;
  productName: string;
  colorName: string;
  quantity: number;
  unitPrice: number;
  fee: number;
  createdAt: number;
}

// 应用设置类型定义
export interface AppSettings {
  serverType: 'webdav' | 'http' | 'sftp';
  serverUrl: string;
  remotePath: string;
  username?: string;
  password?: string;
  autoUpload: boolean;
  backupTimePolicy: 'onComplete' | 'daily21' | 'startupCatchup';
}

// 备份元数据类型定义
export interface BackupMeta {
  fileName: string;
  localPath: string;
  generatedAt: number;
  uploadStatus: 'pending' | 'success' | 'failed';
  lastUploadAttempt?: number;
  retryCount?: number;
}

// 日汇总类型定义
export interface DailySummary {
  date: string;
  totalFee: number;
  totalCount: number;
  itemsByProduct: Record<string, { count: number; fee: number }>;
}

// 产品草稿类型定义
export interface ProductDraft {
  name: string;
  unitPrice: number;
}

// 记录草稿类型定义
export interface RecordDraft {
  date: string;
  productId: string;
  quantity: number;
}

// 操作结果类型定义
export type ProductMutationResult = { ok: true; product: Product } | { ok: false; message: string };

export type RecordMutationResult =
  | { ok: true; record: WorkRecord }
  | { ok: false; message: string };

export type ImportDataResult =
  | { ok: true; productCount: number; recordCount: number }
  | { ok: false; message: string };

export type ProductRemoveResult = { ok: true } | { ok: false; message: string };

// 遗留数据类型（用于数据迁移）
export interface LegacyColor {
  colorName?: string;
  unitPrice?: number;
}

export interface LegacyProduct {
  id?: string;
  name?: string;
  unitPrice?: number;
  colors?: Array<string | LegacyColor>;
}

export interface LegacyProductWithIdentity extends LegacyProduct {
  id: string;
  name: string;
}

export interface LegacyRecord extends Partial<WorkRecord> {
  amount?: number;
}
