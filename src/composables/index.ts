import { ref, computed, onUnmounted, readonly } from 'vue';
import type { Product, WorkRecord } from '@/types';
import { useAppStore } from '@/stores/app';

/**
 * 使用产品管理的组合式函数
 */
export function useProducts() {
  const store = useAppStore();
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // 产品名称列表（用于选择器）
  const productNames = computed(() => store.products.map(p => p.name));

  // 获取产品选择索引
  function getProductIndex(productId: string): number {
    return store.products.findIndex(p => p.id === productId);
  }

  // 根据ID获取产品
  function getProductById(productId: string): Product | undefined {
    return store.products.find(p => p.id === productId);
  }

  // 安全创建产品
  async function createProductSafely(input: { name: string; unitPrice: number }) {
    isLoading.value = true;
    error.value = null;

    try {
      const result = store.createProduct(input);
      if (!result.ok) {
        error.value = result.message;
        return null;
      }
      return result.product;
    } catch (err) {
      error.value = '创建产品失败';
      console.error('创建产品失败:', err);
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  return {
    products: computed(() => store.products),
    productNames,
    isLoading,
    error,
    getProductIndex,
    getProductById,
    createProductSafely,
  };
}

/**
 * 使用记录管理的组合式函数
 */
export function useRecords() {
  const store = useAppStore();
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // 今日记录
  const todayRecords = computed(() => {
    const today = new Date().toISOString().slice(0, 10);
    return store.records.filter(record => record.date === today);
  });

  // 今日总收入
  const todayTotal = computed(() =>
    todayRecords.value.reduce((sum, record) => sum + record.fee, 0)
  );

  // 获取指定日期的记录
  function getRecordsByDate(date: string): WorkRecord[] {
    return store.records.filter(record => record.date === date);
  }

  // 安全删除记录
  async function removeRecordSafely(id: string) {
    isLoading.value = true;
    error.value = null;

    try {
      store.removeRecord(id);
      return true;
    } catch (err) {
      error.value = '删除记录失败';
      console.error('删除记录失败:', err);
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  return {
    records: computed(() => store.records),
    todayRecords,
    todayTotal,
    isLoading,
    error,
    getRecordsByDate,
    removeRecordSafely,
  };
}

/**
 * 使用日期管理的组合式函数
 */
export function useDate() {
  const currentDate = ref(new Date().toISOString().slice(0, 10));
  const selectedDate = ref(currentDate.value);

  // 日期格式化 - 跨平台兼容版本
  const formattedDate = computed(() => {
    if (!selectedDate.value) return '';
    
    // 解析日期字符串
    const match = selectedDate.value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return selectedDate.value;
    
    const [, year, month, day] = match;
    return `${year}年${month}月${day}日`;
  });

  // 日期选择处理
  function onDateChange(event: { detail: { value: string } }): void {
    selectedDate.value = event.detail.value;
  }

  // 清除日期选择
  function clearDateSelection(): void {
    selectedDate.value = '';
  }

  return {
    currentDate,
    selectedDate,
    formattedDate,
    onDateChange,
    clearDateSelection,
  };
}

/**
 * 使用加载状态的组合式函数
 */
export function useLoading() {
  const isLoading = ref(false);
  const loadingText = ref('加载中...');

  function startLoading(text = '加载中...') {
    isLoading.value = true;
    loadingText.value = text;
    uni.showLoading({ title: text });
  }

  function stopLoading() {
    isLoading.value = false;
    uni.hideLoading();
  }

  onUnmounted(() => {
    if (isLoading.value) {
      stopLoading();
    }
  });

  return {
    isLoading,
    loadingText,
    startLoading,
    stopLoading,
  };
}

/**
 * 使用错误处理的组合式函数
 */
export function useError() {
  const error = ref<string | null>(null);
  const errorCount = ref(0);

  function setError(message: string): void {
    error.value = message;
    errorCount.value++;
    console.error('Error:', message);
    uni.showToast({
      title: message,
      icon: 'none',
      duration: 3000,
    });
  }

  function clearError(): void {
    error.value = null;
  }

  function handleError(err: unknown, customMessage?: string): void {
    const message = customMessage || '操作失败，请重试';
    setError(message);
    console.error('Handled error:', err);
  }

  return {
    error: readonly(error),
    errorCount: readonly(errorCount),
    setError,
    clearError,
    handleError,
  };
}

/**
 * 使用表单验证的组合式函数
 */
export function useFormValidation() {
  const errors = ref<Record<string, string>>({});

  function validateRequired(value: string, fieldName: string): boolean {
    if (!value || value.trim() === '') {
      errors.value[fieldName] = `${fieldName}不能为空`;
      return false;
    }
    delete errors.value[fieldName];
    return true;
  }

  function validateNumber(value: number, fieldName: string, min = 0): boolean {
    if (!Number.isFinite(value) || value <= min) {
      errors.value[fieldName] = `${fieldName}必须大于${min}`;
      return false;
    }
    delete errors.value[fieldName];
    return true;
  }

  function validateInteger(value: number, fieldName: string, min = 1): boolean {
    if (!Number.isInteger(value) || value < min) {
      errors.value[fieldName] = `${fieldName}必须是大于等于${min}的整数`;
      return false;
    }
    delete errors.value[fieldName];
    return true;
  }

  function clearErrors(): void {
    errors.value = {};
  }

  const hasErrors = computed(() => Object.keys(errors.value).length > 0);

  return {
    errors: readonly(errors),
    hasErrors,
    validateRequired,
    validateNumber,
    validateInteger,
    clearErrors,
  };
}

/**
 * 防抖函数
 * @param func 要执行的函数
 * @param wait 等待时间（毫秒）
 * @returns 防抖后的函数
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

/**
 * 节流函数
 * @param func 要执行的函数
 * @param limit 时间限制（毫秒）
 * @returns 节流后的函数
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}
