import React, { createContext, useState, useEffect, ReactNode, useRef } from 'react';
import {
  createRandomMailbox,
  createMailboxWithType,
  generatePreviewAddress,
  getMailboxFromLocalStorage,
  saveMailboxToLocalStorage,
  removeMailboxFromLocalStorage,
  getEmails,
  deleteMailbox as apiDeleteMailbox,
  convertMailboxToPermanent,
  AddressType
} from '../utils/api';
import { useTranslation } from 'react-i18next';
import { DEFAULT_AUTO_REFRESH, AUTO_REFRESH_INTERVAL } from '../config';

// localStorage key for user preferences
const USER_PREFERENCES_KEY = 'zmail_user_preferences';

// 邮件详情缓存接口
interface EmailCache {
  [emailId: string]: {
    email: Email;
    attachments: Attachment[];
    timestamp: number;
  }
}

// 用户偏好接口
interface UserPreferences {
  lastAddressType: AddressType;
}

interface MailboxContextType {
  mailbox: Mailbox | null;
  setMailbox: (mailbox: Mailbox) => void;
  isLoading: boolean;
  emails: Email[];
  setEmails: (emails: Email[]) => void;
  selectedEmail: string | null;
  setSelectedEmail: (id: string | null) => void;
  isEmailsLoading: boolean;
  setIsEmailsLoading: (loading: boolean) => void;
  autoRefresh: boolean;
  setAutoRefresh: (autoRefresh: boolean) => void;
  createNewMailbox: () => Promise<void>;
  deleteMailbox: () => Promise<void>;
  refreshEmails: (isManual?: boolean) => Promise<void>; // feat: 添加一个参数以区分手动刷新
  emailCache: EmailCache;
  addToEmailCache: (emailId: string, email: Email, attachments: Attachment[]) => void;
  clearEmailCache: () => void;
  handleMailboxNotFound: () => Promise<void>;
  errorMessage: string | null;
  successMessage: string | null;
  // feat: 添加用于显示全局通知的函数
  showSuccessMessage: (message: string) => void;
  showErrorMessage: (message: string) => void;
  // 新增：地址类型相关
  addressType: AddressType;
  setAddressType: (type: AddressType) => void;
  previewAddress: string | null;
  generatePreview: () => Promise<void>;
  createMailboxWithAddressType: (customAddress?: string) => Promise<void>;
  isPreviewLoading: boolean;
  // 新增：永久邮箱相关
  convertToPermanent: () => Promise<void>;
  isPermanentOption: boolean;
  setIsPermanentOption: (value: boolean) => void;
}

export const MailboxContext = createContext<MailboxContextType>({
  mailbox: null,
  setMailbox: () => {},
  isLoading: false,
  emails: [],
  setEmails: () => {},
  selectedEmail: null,
  setSelectedEmail: () => {},
  isEmailsLoading: false,
  setIsEmailsLoading: () => {},
  autoRefresh: DEFAULT_AUTO_REFRESH,
  setAutoRefresh: () => {},
  createNewMailbox: async () => {},
  deleteMailbox: async () => {},
  refreshEmails: async () => {},
  emailCache: {},
  addToEmailCache: () => {},
  clearEmailCache: () => {},
  handleMailboxNotFound: async () => {},
  errorMessage: null,
  successMessage: null,
  // feat: 提供默认空函数
  showSuccessMessage: () => {},
  showErrorMessage: () => {},
  // 新增：地址类型相关默认值
  addressType: 'random',
  setAddressType: () => {},
  previewAddress: null,
  generatePreview: async () => {},
  createMailboxWithAddressType: async () => {},
  isPreviewLoading: false,
  // 新增：永久邮箱相关默认值
  convertToPermanent: async () => {},
  isPermanentOption: false,
  setIsPermanentOption: () => {},
});

interface MailboxProviderProps {
  children: ReactNode;
}

export const MailboxProvider: React.FC<MailboxProviderProps> = ({ children }) => {
  const { t } = useTranslation();
  const [mailbox, setMailbox] = useState<Mailbox | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const [isEmailsLoading, setIsEmailsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(DEFAULT_AUTO_REFRESH);
  const [emailCache, setEmailCache] = useState<EmailCache>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const errorTimeoutRef = useRef<number | null>(null);
  const successTimeoutRef = useRef<number | null>(null);
  
  // 新增：地址类型相关状态
  const [addressType, setAddressTypeState] = useState<AddressType>('random');
  const [previewAddress, setPreviewAddress] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  
  // 新增：永久邮箱选项状态
  const [isPermanentOption, setIsPermanentOption] = useState(false);

  // 从 localStorage 加载用户偏好
  useEffect(() => {
    try {
      const savedPreferences = localStorage.getItem(USER_PREFERENCES_KEY);
      if (savedPreferences) {
        const preferences: UserPreferences = JSON.parse(savedPreferences);
        if (preferences.lastAddressType) {
          setAddressTypeState(preferences.lastAddressType);
        }
      }
    } catch (error) {
      console.error('Error loading user preferences:', error);
    }
  }, []);

  // 设置地址类型并保存到 localStorage
  const setAddressType = (type: AddressType) => {
    setAddressTypeState(type);
    // 保存用户偏好到 localStorage
    try {
      const preferences: UserPreferences = { lastAddressType: type };
      localStorage.setItem(USER_PREFERENCES_KEY, JSON.stringify(preferences));
    } catch (error) {
      console.error('Error saving user preferences:', error);
    }
    // 切换类型时清除预览地址
    setPreviewAddress(null);
    // 切换到 random 时重置永久选项
    if (type === 'random') {
      setIsPermanentOption(false);
    }
  };

  // 生成预览地址
  const generatePreview = async () => {
    if (addressType === 'custom') {
      setPreviewAddress(null);
      return;
    }
    
    setIsPreviewLoading(true);
    try {
      const result = await generatePreviewAddress(addressType);
      if (result.success && result.address) {
        setPreviewAddress(result.address);
      }
    } catch (error) {
      console.error('Error generating preview address:', error);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  // 使用指定地址类型创建邮箱
  const createMailboxWithAddressType = async (customAddress?: string) => {
    try {
      setErrorMessage(null);
      setSuccessMessage(null);
      setIsLoading(true);
      
      // 对于自定义类型，使用用户输入的地址
      // 对于其他类型，使用预览地址或让后端生成
      let result;
      
      // 确定是否应该创建永久邮箱（仅对 name/custom 类型有效）
      const isEligible = addressType === 'name' || addressType === 'custom';
      const isPermanent = isEligible && isPermanentOption;
      
      if (addressType === 'custom') {
        if (!customAddress || !customAddress.trim()) {
          showErrorMessage(t('mailbox.customAddressRequired'));
          setIsLoading(false);
          return;
        }
        result = await createMailboxWithType('custom', customAddress, 24, isPermanent);
      } else {
        // 对于 name 和 random 类型，直接调用后端生成
        result = await createMailboxWithType(addressType, undefined, 24, isPermanent);
      }
      
      if (result.success && result.mailbox) {
        setMailbox(result.mailbox);
        saveMailboxToLocalStorage(result.mailbox);
        setEmails([]);
        setSelectedEmail(null);
        clearEmailCache();
        setPreviewAddress(null);
        showSuccessMessage(t('mailbox.createSuccess'));
      } else {
        const errorMsg = typeof result.error === 'string' ? result.error : t('mailbox.createFailed');
        showErrorMessage(errorMsg);
      }
    } catch (error) {
      console.error('createMailboxWithAddressType: Error:', error);
      showErrorMessage(t('mailbox.createFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  // feat: 创建显示成功消息的函数
  const showSuccessMessage = (message: string) => {
    setSuccessMessage(message);
    if (successTimeoutRef.current) {
      window.clearTimeout(successTimeoutRef.current);
    }
    successTimeoutRef.current = window.setTimeout(() => {
      setSuccessMessage(null);
    }, 3000);
  };

  // feat: 创建显示错误消息的函数
  const showErrorMessage = (message: string) => {
    setErrorMessage(message);
    if (errorTimeoutRef.current) {
      window.clearTimeout(errorTimeoutRef.current);
    }
    errorTimeoutRef.current = window.setTimeout(() => {
      setErrorMessage(null);
    }, 3000);
  };


  // 清除提示的定时器
  useEffect(() => {
    return () => {
      if (errorTimeoutRef.current) {
        window.clearTimeout(errorTimeoutRef.current);
      }
      if (successTimeoutRef.current) {
        window.clearTimeout(successTimeoutRef.current);
      }
    };
  }, []);

  // 初始化：检查本地存储或创建新邮箱
  useEffect(() => {
    const initMailbox = async () => {
      // 检查本地存储中是否有未过期的邮箱
      const savedMailbox = getMailboxFromLocalStorage();

      if (savedMailbox) {
        setMailbox(savedMailbox);
        setIsLoading(false);
      } else {
        // 创建新邮箱
        await createNewMailbox();
      }
    };

    initMailbox();
  }, []);

  // 创建新邮箱
  const createNewMailbox = async () => {
    try {
      // 清除之前的错误和成功信息
      setErrorMessage(null);
      setSuccessMessage(null);
      setIsLoading(true);
      const result = await createRandomMailbox();
      if (result.success && result.mailbox) {
        setMailbox(result.mailbox);
        saveMailboxToLocalStorage(result.mailbox);
        // [fix]: 创建新邮箱后，清空旧的邮件列表和缓存
        setEmails([]);
        setSelectedEmail(null);
        clearEmailCache();
        // feat: 创建新邮箱也给出提示
        showSuccessMessage(t('mailbox.createSuccess'));
      } else {
        // fix: 使用全局通知函数
        showErrorMessage(t('mailbox.createFailed'));
        throw new Error('Failed to create mailbox');
      }
    } catch (error) {
      console.error('createNewMailbox: Error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // 删除邮箱
  const deleteMailbox = async () => {
    if (!mailbox) return;

    try {
      // 清除之前的错误和成功信息
      setErrorMessage(null);
      setSuccessMessage(null);

      // 调用API删除邮箱
      const result = await apiDeleteMailbox(mailbox.address);

      if (result.success) {
        // fix: 使用全局通知函数
        showSuccessMessage(t('mailbox.deleteSuccess'));

        // 清除本地数据
        setMailbox(null);
        setEmails([]);
        setSelectedEmail(null);
        removeMailboxFromLocalStorage();
        clearEmailCache();

        // 创建新邮箱
        await createNewMailbox();
      } else {
        // fix: 使用全局通知函数
        showErrorMessage(t('mailbox.deleteFailed'));
      }
    } catch (error) {
      console.error('Error deleting mailbox:', error);

      // fix: 使用全局通知函数
      showErrorMessage(t('mailbox.deleteFailed'));
    }
  };

  // feat: 增加 isManual 参数，只有手动点击刷新时才显示Toast
  const refreshEmails = async (isManual = false) => {
    if (!mailbox || isEmailsLoading) return;
    setIsEmailsLoading(true);

    try {
      const result = await getEmails(mailbox.address);

      if (result.success) {
        setEmails(result.emails);
        // feat: 手动刷新成功时显示Toast
        if (isManual) {
          showSuccessMessage(t('email.refreshSuccess'));
        }
      } else if (result.notFound) {
        // [fix]: 如果邮箱不存在，调用 handleMailboxNotFound 进行平滑处理，而不是强制刷新页面
        await handleMailboxNotFound();
      } else {
        // feat: 刷新失败时也显示Toast
        if (isManual) {
          showErrorMessage(t('email.fetchFailed'));
        }
      }
    } catch (error) {
      // 错误处理
      console.error('Error refreshing emails:', error);
      if (isManual) {
        showErrorMessage(t('email.fetchFailed'));
      }
    } finally {
      setIsEmailsLoading(false);
    }
  };

  // 自动刷新邮件
  useEffect(() => {
    if (!mailbox || isLoading) return;
    refreshEmails(); // 初始加载不显示 a Toast
    let intervalId: number | undefined;
    if (autoRefresh) {
      intervalId = window.setInterval(() => refreshEmails(), AUTO_REFRESH_INTERVAL); // 自动刷新不显示 a Toast
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [mailbox, autoRefresh, isLoading]);

  // [fix]: 重构处理邮箱不存在的逻辑，避免页面刷新
  const handleMailboxNotFound = async () => {
    // fix: 使用全局通知函数
    showSuccessMessage(t('mailbox.creatingNew'));
    
    // 清除当前无效的邮箱信息
    removeMailboxFromLocalStorage();
    clearEmailCache();
    
    // 异步创建新邮箱，并更新应用状态
    await createNewMailbox();
  };

  // 添加邮件到缓存
  const addToEmailCache = (emailId: string, email: Email, attachments: Attachment[]) => {
    setEmailCache(prev => ({
      ...prev,
      [emailId]: {
        email,
        attachments,
        timestamp: Date.now()
      }
    }));

    // 保存到localStorage
    try {
      const mailboxAddress = mailbox?.address;
      if (mailboxAddress) {
        const cacheKey = `emailCache_${mailboxAddress}`;
        const updatedCache = {
          ...emailCache,
          [emailId]: {
            email,
            attachments,
            timestamp: Date.now()
          }
        };
        localStorage.setItem(cacheKey, JSON.stringify(updatedCache));
      }
    } catch (error) {
      console.error('Error saving email cache to localStorage:', error);
    }
  };

  // 清除邮件缓存
  const clearEmailCache = () => {
    setEmailCache({});

    // 清除localStorage中的缓存
    try {
      const mailboxAddress = mailbox?.address;
      if (mailboxAddress) {
        const cacheKey = `emailCache_${mailboxAddress}`;
        localStorage.removeItem(cacheKey);
      }
    } catch (error) {
      console.error('Error clearing email cache from localStorage:', error);
    }
  };

  // 从localStorage加载邮件缓存
  useEffect(() => {
    if (!mailbox) return;

    try {
      const cacheKey = `emailCache_${mailbox.address}`;
      const cachedData = localStorage.getItem(cacheKey);

      if (cachedData) {
        const parsedCache = JSON.parse(cachedData);
        setEmailCache(parsedCache);
      }
    } catch (error) {
      console.error('Error loading email cache from localStorage:', error);
    }
  }, [mailbox]);

  // 设置邮箱并保存到localStorage
  const handleSetMailbox = (newMailbox: Mailbox) => {
    setMailbox(newMailbox);
    saveMailboxToLocalStorage(newMailbox);
  };

  // 新增：将当前邮箱转换为永久邮箱
  const convertToPermanent = async () => {
    if (!mailbox) return;
    
    try {
      setErrorMessage(null);
      setSuccessMessage(null);
      
      const result = await convertMailboxToPermanent(mailbox.address);
      
      if (result.success && result.mailbox) {
        setMailbox(result.mailbox);
        saveMailboxToLocalStorage(result.mailbox);
        showSuccessMessage(t('mailbox.convertSuccess'));
      } else {
        const errorMsg = typeof result.error === 'string' ? result.error : t('mailbox.convertFailed');
        showErrorMessage(errorMsg);
      }
    } catch (error) {
      console.error('Error converting mailbox:', error);
      showErrorMessage(t('mailbox.convertFailed'));
    }
  };

  return (
    <MailboxContext.Provider
      value={{
        mailbox,
        setMailbox: handleSetMailbox,
        isLoading,
        emails,
        setEmails,
        selectedEmail,
        setSelectedEmail,
        isEmailsLoading,
        setIsEmailsLoading,
        autoRefresh,
        setAutoRefresh,
        createNewMailbox,
        deleteMailbox,
        refreshEmails,
        emailCache,
        addToEmailCache,
        clearEmailCache,
        handleMailboxNotFound,
        errorMessage,
        successMessage,
        // feat: 将函数添加到 context value 中
        showSuccessMessage,
        showErrorMessage,
        // 新增：地址类型相关
        addressType,
        setAddressType,
        previewAddress,
        generatePreview,
        createMailboxWithAddressType,
        isPreviewLoading,
        // 新增：永久邮箱相关
        convertToPermanent,
        isPermanentOption,
        setIsPermanentOption,
      }}
    >
      {/* [feat] 全局通知组件 */}
      {(errorMessage || successMessage) && (
        <div
          className={`fixed bottom-4 right-4 z-50 p-3 rounded-md shadow-lg max-w-md ${
            errorMessage
              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
              : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
          }`}
        >
          {errorMessage || successMessage}
        </div>
      )}
      {children}
    </MailboxContext.Provider>
  );
}; 