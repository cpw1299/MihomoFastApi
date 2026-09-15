// 存储版本管理
const STORAGE_VERSION = 1;

// 存储键名定义
export const STORAGE_KEYS = {
  settings: 'app:settings',
  products: 'app:products',
  records: 'app:records',
  backups: 'app:backups',
} as const;

// 存储数据接口
interface StorageData<T> {
  data: T;
  version: number;
}

/**
 * 读取版本化的JSON数据
 * @param key 存储键名
 * @param defaultValue 默认值
 * @returns 存储的数据和版本信息
 */
export function readVersionedJson<T>(key: string, defaultValue: T): StorageData<T> {
  try {
    const raw = uni.getStorageSync(key);
    if (!raw) {
      return { data: defaultValue, version: STORAGE_VERSION };
    }

    const parsed = JSON.parse(raw) as StorageData<T>;
    if (!parsed || typeof parsed !== 'object') {
      return { data: defaultValue, version: STORAGE_VERSION };
    }

    return {
      data: parsed.data !== undefined ? parsed.data : defaultValue,
      version: parsed.version || STORAGE_VERSION,
    };
  } catch (error) {
    console.warn(`读取存储数据失败: ${key}`, error);
    return { data: defaultValue, version: STORAGE_VERSION };
  }
}

/**
 * 写入版本化的JSON数据
 * @param key 存储键名
 * @param data 要存储的数据
 * @returns 是否写入成功
 */
export function writeVersionedJson<T>(key: string, data: T): boolean {
  try {
    const payload: StorageData<T> = {
      data,
      version: STORAGE_VERSION,
    };
    uni.setStorageSync(key, JSON.stringify(payload));
    return true;
  } catch (error) {
    console.warn(`写入存储数据失败: ${key}`, error);
    return false;
  }
}

/**
 * 删除存储的数据
 * @param key 存储键名
 * @returns 是否删除成功
 */
export function removeStorageItem(key: string): boolean {
  try {
    uni.removeStorageSync(key);
    return true;
  } catch (error) {
    console.warn(`删除存储数据失败: ${key}`, error);
    return false;
  }
}

/**
 * 清空所有存储数据
 * @returns 是否清空成功
 */
export function clearAllStorage(): boolean {
  try {
    uni.clearStorageSync();
    return true;
  } catch (error) {
    console.warn('清空存储数据失败', error);
    return false;
  }
}

/**
 * 获取存储信息
 * @returns 存储空间信息
 */
export function getStorageInfo(): Promise<UniApp.GetStorageInfoSuccess> {
  return new Promise((resolve, reject) => {
    uni.getStorageInfo({
      success: resolve,
      fail: reject,
    });
  });
}
