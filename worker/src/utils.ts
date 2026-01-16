/**
 * 生成随机字符串
 * @param length 字符串长度
 * @returns 随机字符串
 */
export function generateRandomString(length: number): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
  
  /**
   * 生成随机邮箱地址
   * 生成8-12位随机字符，仅包含小写字母和数字，且不以数字开头
   * @returns 随机邮箱地址
   */
  export function generateRandomAddress(): string {
    const letters = 'abcdefghijklmnopqrstuvwxyz';
    const alphanumeric = 'abcdefghijklmnopqrstuvwxyz0123456789';
    
    // 生成8-12位随机字符
    const length = Math.floor(Math.random() * 5) + 8;
    
    // 第一个字符必须是字母（不能以数字开头）
    let result = letters.charAt(Math.floor(Math.random() * letters.length));
    
    // 剩余字符可以是字母或数字
    for (let i = 1; i < length; i++) {
      result += alphanumeric.charAt(Math.floor(Math.random() * alphanumeric.length));
    }
    
    return result;
  }
  
  /**
   * 生成唯一ID
   * @returns 唯一ID
   */
  export function generateId(): string {
    return crypto.randomUUID();
  }
  
  /**
   * 获取当前时间戳（秒）
   * @returns 当前时间戳
   */
  export function getCurrentTimestamp(): number {
    return Math.floor(Date.now() / 1000);
  }
  
  /**
   * 计算过期时间戳
   * @param hours 小时数
   * @returns 过期时间戳
   */
  export function calculateExpiryTimestamp(hours: number): number {
    return getCurrentTimestamp() + (hours * 60 * 60);
  }
  
  /**
   * 检查字符串是否为有效的邮箱地址格式
   * @param address 邮箱地址
   * @returns 是否有效
   */
  export function isValidEmailAddress(address: string): boolean {
    // 简单的邮箱格式验证
    const regex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return regex.test(address);
  }
  
  /**
   * 提取邮箱地址的用户名部分
   * @param address 完整邮箱地址
   * @returns 用户名部分
   */
  export function extractMailboxName(address: string): string {
    return address.split('@')[0];
  }
  
  /**
   * 格式化日期时间
   * @param timestamp 时间戳（秒）
   * @returns 格式化的日期时间字符串
   */
  export function formatDateTime(timestamp: number): string {
    const date = new Date(timestamp * 1000);
    return date.toISOString();
  }

/**
 * 自定义地址验证结果
 */
export interface AddressValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * 验证自定义邮箱地址
 * 规则：
 * - 只允许字母、数字、点、下划线、连字符
 * - 长度必须在3-30字符之间
 * @param address 自定义地址
 * @returns 验证结果
 */
export function validateCustomAddress(address: string): AddressValidationResult {
  // 检查长度
  if (address.length < 3) {
    return { valid: false, error: '地址长度不能少于3个字符' };
  }
  
  if (address.length > 30) {
    return { valid: false, error: '地址长度不能超过30个字符' };
  }
  
  // 检查字符集：只允许字母、数字、点、下划线、连字符
  const validCharsRegex = /^[a-zA-Z0-9._-]+$/;
  if (!validCharsRegex.test(address)) {
    return { valid: false, error: '地址只能包含字母、数字、点、下划线和连字符' };
  }
  
  return { valid: true };
}
