import { API_BASE_URL } from "../config";

// API请求基础URL
const apiUrl = (path: string) => `${API_BASE_URL}${path}`;

// Address type for mailbox creation
export type AddressType = 'name' | 'random' | 'custom';

// 创建邮箱（支持不同地址类型）
export const createMailboxWithType = async (
  addressType: AddressType = 'random',
  customAddress?: string,
  expiresInHours = 24
) => {
  try {
    const requestBody: {
      addressType: AddressType;
      expiresInHours: number;
      address?: string;
    } = {
      addressType,
      expiresInHours,
    };
    
    // 自定义地址类型需要提供 address 参数
    if (addressType === 'custom' && customAddress) {
      requestBody.address = customAddress.trim();
    }
    
    const response = await fetch(apiUrl('/api/mailboxes'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to create mailbox' };
    }
    
    if (data.success) {
      return { success: true, mailbox: data.mailbox };
    } else {
      return { success: false, error: data.error || 'Unknown error' };
    }
  } catch (error) {
    return { success: false, error };
  }
};

// 创建随机邮箱（保持向后兼容）
export const createRandomMailbox = async (expiresInHours = 24) => {
  return createMailboxWithType('random', undefined, expiresInHours);
};

// 生成预览地址（不创建邮箱，仅获取预览）
export const generatePreviewAddress = async (addressType: AddressType): Promise<{
  success: boolean;
  address?: string;
  error?: unknown;
}> => {
  // 对于自定义类型，不需要生成预览
  if (addressType === 'custom') {
    return { success: true, address: '' };
  }
  
  try {
    // 创建一个临时邮箱来获取地址，然后立即删除
    // 注意：这是一个简化实现，实际生产环境可能需要专门的预览API
    // 这里我们在前端模拟生成，避免创建不必要的邮箱
    
    if (addressType === 'name') {
      // 模拟英文名地址生成（与后端逻辑保持一致）
      const address = generateLocalNameAddress();
      return { success: true, address };
    } else {
      // 随机地址生成
      const address = generateLocalRandomAddress();
      return { success: true, address };
    }
  } catch (error) {
    return { success: false, error };
  }
};

// 本地生成英文名地址（用于预览）
function generateLocalNameAddress(): string {
  const firstNames = [
    'james', 'john', 'robert', 'michael', 'william', 'david', 'richard', 'joseph',
    'thomas', 'charles', 'mary', 'patricia', 'jennifer', 'linda', 'elizabeth',
    'emma', 'olivia', 'ava', 'sophia', 'isabella', 'mia', 'charlotte', 'amelia'
  ];
  const lastNames = [
    'smith', 'johnson', 'williams', 'brown', 'jones', 'garcia', 'miller',
    'davis', 'rodriguez', 'martinez', 'wilson', 'anderson', 'thomas', 'taylor'
  ];
  
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  
  const formats = ['dot', 'underscore', 'plain', 'withDigits'];
  const format = formats[Math.floor(Math.random() * formats.length)];
  
  let address: string;
  switch (format) {
    case 'dot':
      address = `${firstName}.${lastName}`;
      break;
    case 'underscore':
      address = `${firstName}_${lastName}`;
      break;
    case 'withDigits': {
      const digits = Math.floor(Math.random() * 900 + 100).toString().slice(0, Math.random() < 0.5 ? 2 : 3);
      address = `${firstName}${lastName}${digits}`;
      break;
    }
    default:
      address = `${firstName}${lastName}`;
  }
  
  // 确保长度在6-20之间
  if (address.length < 6) {
    address = `${firstName}${lastName}${Math.floor(Math.random() * 900 + 100)}`;
  } else if (address.length > 20) {
    address = `${firstName}${lastName}`.slice(0, 20);
  }
  
  return address;
}

// 本地生成随机地址（用于预览）
function generateLocalRandomAddress(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  const length = Math.floor(Math.random() * 5) + 8; // 8-12 characters
  
  // 确保不以数字开头
  let address = letters[Math.floor(Math.random() * letters.length)];
  
  for (let i = 1; i < length; i++) {
    address += chars[Math.floor(Math.random() * chars.length)];
  }
  
  return address;
}

// 创建自定义邮箱
export const createCustomMailbox = async (address: string, expiresInHours = 24) => {
  try {
    if (!address.trim()) {
      return { success: false, error: 'Invalid address' };
    }
    
    const response = await fetch(apiUrl('/api/mailboxes'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        address: address.trim(),
        expiresInHours,
      }),
    });
    
    // 尝试解析响应内容
    const data = await response.json();
    
    if (!response.ok) {
      if (response.status === 400) {
        // 使用后端返回的错误信息
        return { success: false, error: data.error || 'Address already exists' };
      }
      throw new Error(data.error || 'Failed to create mailbox');
    }
    
    if (data.success) {
      return { success: true, mailbox: data.mailbox };
    } else {
      throw new Error(data.error || 'Unknown error');
    }
  } catch (error) {
    console.error('Error creating custom mailbox:', error);
    return { success: false, error };
  }
};

// 获取邮箱信息
export const getMailbox = async (address: string) => {
  try {
    const response = await fetch(apiUrl(`/api/mailboxes/${address}`));
    
    if (!response.ok) {
      if (response.status === 404) {
        return { success: false, error: 'Mailbox not found' };
      }
      throw new Error('Failed to fetch mailbox');
    }
    
    const data = await response.json();
    if (data.success) {
      return { success: true, mailbox: data.mailbox };
    } else {
      throw new Error(data.error || 'Unknown error');
    }
  } catch (error) {
    console.error('Error fetching mailbox:', error);
    return { success: false, error };
  }
};

// 获取邮件列表
export const getEmails = async (address: string) => {
  try {
    // 检查地址是否为空
    if (!address) {
      return { success: false, error: 'Address is empty', emails: [] };
    }
    
    const response = await fetch(apiUrl(`/api/mailboxes/${address}/emails`));
    
    // 直接处理404状态码
    if (response.status === 404) {
      return { success: false, error: 'Mailbox not found', notFound: true };
    }
    
    if (!response.ok) {
      throw new Error(`Failed to fetch emails: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.success) {
      return { success: true, emails: data.emails };
    } else {
      // 检查错误信息是否包含"邮箱不存在"
      if (data.error && (data.error.includes('邮箱不存在') || data.error.includes('Mailbox not found'))) {
        return { success: false, error: data.error, notFound: true };
      }
      throw new Error(data.error || 'Unknown error');
    }
  } catch (error) {
    return { success: false, error, emails: [] };
  }
};

// 删除邮箱
export const deleteMailbox = async (address: string) => {
  try {
    const response = await fetch(apiUrl(`/api/mailboxes/${address}`), {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete mailbox');
    }
    
    const data = await response.json();
    if (data.success) {
      return { success: true };
    } else {
      throw new Error(data.error || 'Unknown error');
    }
  } catch (error) {
    console.error('Error deleting mailbox:', error);
    return { success: false, error };
  }
};

// 保存邮箱信息到本地存储
export const saveMailboxToLocalStorage = (mailbox: Mailbox) => {
  localStorage.setItem('tempMailbox', JSON.stringify({
    ...mailbox,
    savedAt: Date.now() / 1000
  }));
};

// 从本地存储获取邮箱信息
export const getMailboxFromLocalStorage = (): Mailbox | null => {
  const savedMailbox = localStorage.getItem('tempMailbox');
  if (!savedMailbox) return null;
  
  try {
    const mailbox = JSON.parse(savedMailbox) as Mailbox & { savedAt: number };
    const now = Date.now() / 1000;
    
    // 检查邮箱是否过期
    if (mailbox.expiresAt < now) {
      localStorage.removeItem('tempMailbox');
      return null;
    }
    
    return mailbox;
  } catch (error) {
    localStorage.removeItem('tempMailbox');
    return null;
  }
};

// 从本地存储删除邮箱信息
export const removeMailboxFromLocalStorage = () => {
  localStorage.removeItem('tempMailbox');
}; 