/**
 * 获取今天的日期字符串 (YYYY-MM-DD)
 * @returns 今天的日期字符串
 */
export function today(): string {
  const now = new Date();
  return now.toISOString().slice(0, 10);
}

/**
 * 格式化日期显示 - 跨平台兼容版本
 * @param dateStr 日期字符串 (YYYY-MM-DD)
 * @returns 格式化后的日期字符串 (YYYY年MM月DD日)
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  
  // 解析日期字符串
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return dateStr;
  
  const [, year, month, day] = match;
  return `${year}年${month}月${day}日`;
}

/**
 * 格式化时间显示 - 跨平台兼容版本
 * @param timestamp 时间戳
 * @returns 格式化后的时间字符串 (HH:MM)
 */
export function formatTime(timestamp: number): string {
  if (!timestamp) return '';
  
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  
  return `${hours}:${minutes}`;
}

/**
 * 格式化日期时间显示 - 完整的日期时间
 * @param timestamp 时间戳
 * @returns 格式化后的日期时间字符串
 */
export function formatDateTime(timestamp: number): string {
  if (!timestamp) return '';
  
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  
  return `${year}年${month}月${day}日 ${hours}:${minutes}`;
}

/**
 * 验证日期字符串格式
 * @param date 日期字符串
 * @returns 是否为有效的日期格式
 */
export function isValidDateString(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

/**
 * 生成唯一ID
 * @returns 唯一ID字符串
 */
export function createId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * 规范化产品名称
 * @param name 产品名称
 * @returns 规范化后的名称
 */
export function normalizeProductName(name: string): string {
  return name.trim();
}

/**
 * 验证单价是否有效
 * @param unitPrice 单价
 * @returns 是否为有效的单价
 */
export function isValidUnitPrice(unitPrice: number): boolean {
  return Number.isFinite(unitPrice) && unitPrice > 0;
}

/**
 * 格式化金额显示
 * @param amount 金额
 * @returns 格式化后的金额字符串
 */
export function formatCurrency(amount: number): string {
  return `¥${amount.toFixed(2)}`;
}

/**
 * 计算金额
 * @param quantity 数量
 * @param unitPrice 单价
 * @returns 计算出的金额
 */
export function calculateFee(quantity: number, unitPrice: number): number {
  return Number((quantity * unitPrice).toFixed(2));
}