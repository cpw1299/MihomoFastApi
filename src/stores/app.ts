import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
  Product,
  WorkRecord,
  AppSettings,
  BackupMeta,
  ProductDraft,
  RecordDraft,
  ProductMutationResult,
  RecordMutationResult,
  ImportDataResult,
  ProductRemoveResult,
  LegacyProduct,
  LegacyRecord,
} from '@/types';
import { 
  readVersionedJson, 
  writeVersionedJson, 
  clearAllStorage,
  STORAGE_KEYS 
} from '@/utils/storage';
import {
  createId,
  normalizeProductName,
  isValidUnitPrice,
  isValidDateString,
  calculateFee,
} from '@/utils';
import defaultProducts from '@/config/default-products.json';

/**
 * 产品数据规范化函数 - 兼容原始数据格式
 */
function normalizeProducts(products: LegacyProduct[]): Product[] {
  const hasIdentity = (
    product: LegacyProduct
  ): product is LegacyProduct & { id: string; name: string } =>
    typeof product.id === 'string' && typeof product.name === 'string';

  const getColorUnitPrice = (
    color: string | { colorName?: string; unitPrice?: number }
  ): number | undefined => {
    if (typeof color === 'string') {
      return undefined;
    }
    return color.unitPrice;
  };

  return products.filter(hasIdentity).map(product => {
    const colors = Array.isArray(product.colors) ? product.colors : [];
    const normalizedColors = colors
      .map(color => (typeof color === 'string' ? color : color.colorName))
      .filter((color): color is string => typeof color === 'string' && color.length > 0);
    const fallbackUnitPrice = colors
      .map(getColorUnitPrice)
      .find(price => typeof price === 'number');
    const unitPrice =
      typeof product.unitPrice === 'number' ? product.unitPrice : (fallbackUnitPrice ?? 0);
    return {
      id: product.id,
      name: product.name,
      unitPrice,
      colors: normalizedColors,
      enabled: product.enabled !== false, // 默认true，兼容旧数据
    };
  });
}

/**
 * 记录数据规范化函数 - 兼容原始数据格式
 */
function normalizeRecords(records: LegacyRecord[]): WorkRecord[] {
  return records
    .filter(
      record => typeof record.productId === 'string' && typeof record.productName === 'string'
    )
    .map(record => {
      const quantity =
        typeof record.quantity === 'number' && record.quantity > 0 ? record.quantity : 0;
      const unitPrice = typeof record.unitPrice === 'number' ? record.unitPrice : 0;
      const fee =
        typeof record.fee === 'number'
          ? record.fee
          : typeof record.amount === 'number'
            ? record.amount
            : quantity * unitPrice;
      const createdAt = typeof record.createdAt === 'number' ? record.createdAt : Date.now();
      const date =
        typeof record.date === 'string' && record.date
          ? record.date
          : new Date(createdAt).toISOString().slice(0, 10);
      return {
        id: typeof record.id === 'string' && record.id ? record.id : String(createdAt),
        date,
        productId: record.productId as string,
        productName: record.productName as string,
        colorName: typeof record.colorName === 'string' ? record.colorName : '',
        quantity,
        unitPrice,
        fee: Number(fee.toFixed(2)),
        createdAt,
      };
    })
    .filter(record => record.quantity > 0);
}

// 默认设置
const defaultSettings: AppSettings = {
  serverType: 'webdav',
  serverUrl: '',
  remotePath: 'backups',
  autoUpload: true,
  backupTimePolicy: 'onComplete',
};

/**
 * 应用状态管理Store
 */
export const useAppStore = defineStore('app', () => {
  // 状态定义
  const settings = ref<AppSettings>(defaultSettings);
  const products = ref<Product[]>([]);
  const records = ref<WorkRecord[]>([]);
  const backups = ref<BackupMeta[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // 计算属性
  const totalQuantity = computed(() =>
    records.value.reduce((sum, record) => sum + record.quantity, 0)
  );

  const totalAmount = computed(() =>
    Number(records.value.reduce((sum, record) => sum + record.fee, 0).toFixed(2))
  );

  const todayTotal = computed(() => {
    const today = new Date().toISOString().slice(0, 10);
    return records.value
      .filter(record => record.date === today)
      .reduce((sum, record) => sum + record.fee, 0);
  });

  // 方法定义
  /**
   * 初始化产品数据
   */
  function initProducts(): void {
    try {
      const { data } = readVersionedJson<Product[]>(STORAGE_KEYS.products, []);
      if (data.length === 0) {
        // 使用默认产品配置
        products.value = defaultProducts as Product[];
        writeVersionedJson(STORAGE_KEYS.products, products.value);
      } else {
        // 规范化产品数据，处理可能的旧数据格式
        const normalized = normalizeProducts(data as LegacyProduct[]);
        const hasChanged = JSON.stringify(normalized) !== JSON.stringify(data);
        if (hasChanged) {
          writeVersionedJson(STORAGE_KEYS.products, normalized);
        }
        products.value = normalized;
      }
    } catch (err) {
      console.error('初始化产品数据失败:', err);
      error.value = '初始化产品数据失败';
    }
  }

  /**
   * 初始化记录数据
   */
  function initRecords(): void {
    try {
      const { data } = readVersionedJson<WorkRecord[]>(STORAGE_KEYS.records, []);
      const normalized = normalizeRecords(data as LegacyRecord[]);
      const hasChanged = JSON.stringify(normalized) !== JSON.stringify(data);
      if (hasChanged) {
        writeVersionedJson(STORAGE_KEYS.records, normalized);
      }
      records.value = normalized;
    } catch (err) {
      console.error('初始化记录数据失败:', err);
      error.value = '初始化记录数据失败';
    }
  }

  /**
   * 创建新产品
   */
  function createProduct(input: ProductDraft): ProductMutationResult {
    const name = normalizeProductName(input.name);
    if (!name) {
      return { ok: false, message: '工件名称不能为空' };
    }
    if (!isValidUnitPrice(input.unitPrice)) {
      return { ok: false, message: '单价必须大于0' };
    }
    const hasDuplicate = products.value.some(item => item.name.trim() === name);
    if (hasDuplicate) {
      return { ok: false, message: '工件名称已存在' };
    }
    const product: Product = {
      id: createId(),
      name,
      unitPrice: Number(input.unitPrice.toFixed(2)),
      colors: [],
    };
    products.value.push(product);
    writeVersionedJson(STORAGE_KEYS.products, products.value);
    return { ok: true, product };
  }

  /**
 * 更新产品基本信息
 */
function updateProductBasic(id: string, input: ProductDraft): ProductMutationResult {
  const name = normalizeProductName(input.name);
  if (!name) {
    return { ok: false, message: '工件名称不能为空' };
  }
  if (!isValidUnitPrice(input.unitPrice)) {
    return { ok: false, message: '单价必须大于0' };
  }
  const targetIndex = products.value.findIndex(item => item.id === id);
  if (targetIndex < 0) {
    return { ok: false, message: '工件不存在' };
  }
  const hasDuplicate = products.value.some(item => item.id !== id && item.name.trim() === name);
  if (hasDuplicate) {
    return { ok: false, message: '工件名称已存在' };
  }
  const target = products.value[targetIndex];
  products.value[targetIndex] = {
    ...target,
    name,
    unitPrice: Number(input.unitPrice.toFixed(2)),
  };
  writeVersionedJson(STORAGE_KEYS.products, products.value);
  return { ok: true, product: products.value[targetIndex] };
}

/**
 * 更新产品显示状态
 */
function updateProductEnabled(id: string, enabled: boolean): ProductMutationResult {
  const targetIndex = products.value.findIndex(item => item.id === id);
  if (targetIndex < 0) {
    return { ok: false, message: '工件不存在' };
  }
  products.value[targetIndex] = {
    ...products.value[targetIndex],
    enabled,
  };
  writeVersionedJson(STORAGE_KEYS.products, products.value);
  return { ok: true, product: products.value[targetIndex] };
}

  /**
   * 保存设置
   */
  function saveSettings(newSettings: Partial<AppSettings>): void {
    settings.value = { ...settings.value, ...newSettings };
    writeVersionedJson(STORAGE_KEYS.settings, settings.value);
  }

  /**
   * 删除产品
   */
  function removeProduct(id: string): ProductRemoveResult {
    const hasRelatedRecord = records.value.some(item => item.productId === id);
    if (hasRelatedRecord) {
      return { ok: false, message: '该工件已有记录，暂不支持删除' };
    }
    products.value = products.value.filter(item => item.id !== id);
    writeVersionedJson(STORAGE_KEYS.products, products.value);
    return { ok: true };
  }

  /**
   * 创建新记录
   */
  function createRecord(input: RecordDraft): RecordMutationResult {
    const product = products.value.find(item => item.id === input.productId);
    if (!product) {
      return { ok: false, message: '请选择工件' };
    }
    if (!isValidDateString(input.date)) {
      return { ok: false, message: '日期格式不正确' };
    }
    if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
      return { ok: false, message: '数量必须是正整数' };
    }
    const unitPrice = product.unitPrice;
    if (!isValidUnitPrice(unitPrice)) {
      return { ok: false, message: '工件单价必须大于0' };
    }
    const createdAt = Date.now();
    const record: WorkRecord = {
      id: createId(),
      date: input.date,
      productId: product.id,
      productName: product.name,
      colorName: '',
      quantity: input.quantity,
      unitPrice,
      fee: calculateFee(input.quantity, unitPrice),
      createdAt,
    };
    records.value.push(record);
    writeVersionedJson(STORAGE_KEYS.records, records.value);
    return { ok: true, record };
  }

  /**
   * 删除记录
   */
  function removeRecord(id: string): void {
    records.value = records.value.filter(item => item.id !== id);
    writeVersionedJson(STORAGE_KEYS.records, records.value);
  }

  /**
   * 导出数据
   */
  function exportData(): string {
    const payload = {
      schemaVersion: 1,
      exportedAt: Date.now(),
      products: products.value,
      records: records.value,
    };
    return JSON.stringify(payload, null, 2);
  }

  /**
   * 导入数据
   */
  function importData(raw: string): ImportDataResult {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { ok: false, message: '导入文件不是有效JSON' };
    }
    if (!parsed || typeof parsed !== 'object') {
      return { ok: false, message: '导入文件格式不正确' };
    }
    const productsValue = parsed.products;
    const recordsValue = parsed.records;
    if (!Array.isArray(productsValue) || !Array.isArray(recordsValue)) {
      return { ok: false, message: '导入文件缺少products或records字段' };
    }

    // 规范化导入的数据
    const normalizedProducts = normalizeProducts(productsValue as LegacyProduct[]);
    const normalizedRecords = normalizeRecords(recordsValue as LegacyRecord[]);

    if (normalizedProducts.length === 0 && productsValue.length > 0) {
      return { ok: false, message: '导入工件数据格式不正确' };
    }
    if (normalizedRecords.length === 0 && recordsValue.length > 0) {
      return { ok: false, message: '导入记录数据格式不正确' };
    }

    products.value = normalizedProducts;
    records.value = normalizedRecords;
    writeVersionedJson(STORAGE_KEYS.products, products.value);
    writeVersionedJson(STORAGE_KEYS.records, records.value);
    return {
      ok: true,
      productCount: products.value.length,
      recordCount: records.value.length,
    };
  }

  /**
   * 设置备份列表
   */
  function setBackups(list: BackupMeta[]): void {
    backups.value = list;
    writeVersionedJson(STORAGE_KEYS.backups, backups.value);
  }

  /**
   * 更新或添加备份
   */
  function upsertBackup(meta: BackupMeta): void {
    const index = backups.value.findIndex(item => item.fileName === meta.fileName);
    if (index >= 0) {
      backups.value[index] = meta;
    } else {
      backups.value.push(meta);
    }
    writeVersionedJson(STORAGE_KEYS.backups, backups.value);
  }

  /**
   * 清空所有数据
   */
  function clearAllData(): void {
    try {
      clearAllStorage();
      products.value = [];
      records.value = [];
      backups.value = [];
      settings.value = defaultSettings;
    } catch (error) {
      console.error('清空数据失败:', error);
      error.value = '清空数据失败';
    }
  }

  // 初始化设置
  const { data: savedSettings } = readVersionedJson<AppSettings>(
    STORAGE_KEYS.settings,
    defaultSettings
  );
  settings.value = savedSettings;

  // 返回store接口
  return {
    // 状态
    settings: settings,
    products: products,
    records: records,
    backups: backups,
    isLoading: isLoading,
    error: error,

    // 计算属性
    totalQuantity,
    totalAmount,
    todayTotal,

    // 方法
    initProducts,
    initRecords,
    createProduct,
    updateProductBasic,
    updateProductEnabled,
    saveSettings,
    removeProduct,
    createRecord,
    removeRecord,
    exportData,
    importData,
    setBackups,
    upsertBackup,
    clearAllData,
  };
});
