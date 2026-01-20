import React, { useState, useEffect, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import MailboxSwitcher from './MailboxSwitcher';
import { MailboxContext } from '../contexts/MailboxContext';
import AddressTypeSelector, { AddressType } from './AddressTypeSelector';
import AddressPreview from './AddressPreview';
import CustomAddressInput from './CustomAddressInput';

interface HeaderMailboxProps {
  mailbox: Mailbox | null;
  onMailboxChange: (mailbox: Mailbox) => void;
  domain: string;
  domains: string[];
  isLoading: boolean;
}

const HeaderMailbox: React.FC<HeaderMailboxProps> = ({ 
  mailbox, 
  onMailboxChange,
  domain,
  domains,
  isLoading
}) => {
  const { t } = useTranslation();
  // feat: 统一使用全局通知和地址类型管理
  const { 
    showSuccessMessage, 
    showErrorMessage,
    addressType,
    setAddressType,
    previewAddress,
    generatePreview,
    createMailboxWithAddressType,
    isPreviewLoading,
    isPermanentOption,
    setIsPermanentOption
  } = useContext(MailboxContext);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [customAddress, setCustomAddress] = useState('');
  const [selectedDomain, setSelectedDomain] = useState(domain);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [customAddressError, setCustomAddressError] = useState<string | null>(null);
  const [isCustomAddressValid, setIsCustomAddressValid] = useState(false);

  useEffect(() => {
    setSelectedDomain(domain);
  }, [domain]);

  // 当进入创建模式且不是自定义类型时，生成预览地址
  useEffect(() => {
    if (isCreateMode && addressType !== 'custom' && !previewAddress) {
      generatePreview();
    }
  }, [isCreateMode, addressType, previewAddress, generatePreview]);

  // 当地址类型改变时，如果在创建模式下，生成新的预览地址
  const handleAddressTypeChange = (type: AddressType) => {
    setAddressType(type);
    setCustomAddress('');
    setCustomAddressError(null);
    // Reset permanent option when switching to random
    if (type === 'random') {
      setIsPermanentOption(false);
    }
    if (type !== 'custom') {
      generatePreview();
    }
  };
  
  if (!mailbox || isLoading) return null;
  
  // 复制邮箱地址到剪贴板
  const copyToClipboard = () => {
    const fullAddress = mailbox.address.includes('@') ? mailbox.address : `${mailbox.address}@${selectedDomain}`;
    navigator.clipboard.writeText(fullAddress)
      .then(() => {
        // feat: 使用全局通知替换 Tooltip
        showSuccessMessage(t('mailbox.copySuccess'));
      })
      .catch(() => {
        // fix: 使用全局通知函数显示复制失败
        showErrorMessage(t('mailbox.copyFailed'));
      });
  };
  
  // 重新生成预览地址
  const handleRegenerate = () => {
    generatePreview();
  };
  
  // 创建新邮箱（使用选择的地址类型）
  const handleCreateMailbox = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    // 清除之前的错误信息
    setCustomAddressError(null);
    
    // 自定义类型需要验证地址
    if (addressType === 'custom') {
      if (!customAddress.trim()) {
        setCustomAddressError(t('mailbox.invalidAddress'));
        return;
      }
      if (!isCustomAddressValid) {
        return;
      }
    }
    
    setIsActionLoading(true);
    
    try {
      await createMailboxWithAddressType(addressType === 'custom' ? customAddress : undefined);
      
      // 成功后关闭创建模式
      setTimeout(() => {
        setIsCreateMode(false);
        setCustomAddress('');
      }, 500);
    } catch (error) {
      console.error('Error creating mailbox:', error);
    } finally {
      setIsActionLoading(false);
    }
  };
  
  // 取消创建模式
  const handleCancelCreate = () => {
    setIsCreateMode(false);
    setCustomAddress('');
    setCustomAddressError(null);
  };
  
  // 进入创建模式
  const handleEnterCreateMode = () => {
    setIsCreateMode(true);
    if (addressType !== 'custom') {
      generatePreview();
    }
  };
  
  // 移动设备上的邮箱地址显示
  const renderMobileAddress = () => {
    const fullAddress = mailbox.address.includes('@') ? mailbox.address : `${mailbox.address}@${selectedDomain}`;
    const [username, domainPart] = fullAddress.split('@');
    
    // 如果用户名太长，截断显示
    const displayUsername = username.length > 10 ? `${username.substring(0, 8)}...` : username;
    
    return (
      <code className="bg-muted px-2 py-1 rounded text-xs font-medium truncate max-w-[120px]">
        {displayUsername}@{domainPart}
      </code>
    );
  };
  
  // 按钮基础样式
  const buttonBaseClass = "flex items-center justify-center rounded-md transition-all duration-200";
  const copyButtonClass = `${buttonBaseClass} hover:bg-primary/20 hover:text-primary hover:scale-110 mx-1`;
  const createButtonClass = `${buttonBaseClass} bg-primary text-primary-foreground hover:bg-primary/80 hover:scale-110`;
  
  // 渲染创建模式的内容
  const renderCreateMode = () => (
    <div className="flex flex-col space-y-3">
      {/* 地址类型选择器 */}
      <AddressTypeSelector
        selectedType={addressType}
        onTypeChange={handleAddressTypeChange}
        disabled={isActionLoading}
        isPermanent={isPermanentOption}
        onPermanentChange={setIsPermanentOption}
      />
      
      {/* 地址预览或自定义输入 */}
      <div className="flex items-center space-x-2">
        {addressType === 'custom' ? (
          <CustomAddressInput
            value={customAddress}
            onChange={setCustomAddress}
            onValidationChange={setIsCustomAddressValid}
            domain={selectedDomain}
            disabled={isActionLoading}
          />
        ) : (
          <AddressPreview
            address={previewAddress || ''}
            domain={selectedDomain}
            onRegenerate={handleRegenerate}
            isLoading={isPreviewLoading}
          />
        )}
      </div>
      
      {/* 操作按钮 */}
      <div className="flex items-center space-x-2">
        <button
          type="button"
          onClick={handleCancelCreate}
          className="px-3 py-1.5 text-sm rounded-md bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
          disabled={isActionLoading}
        >
          {t('common.cancel')}
        </button>
        <button
          type="button"
          onClick={handleCreateMailbox}
          className="px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/80 transition-colors"
          disabled={isActionLoading || (addressType === 'custom' && !isCustomAddressValid)}
        >
          {isActionLoading ? t('common.loading') : t('common.create')}
        </button>
      </div>
      
      {/* 错误信息显示 */}
      {customAddressError && (
        <div className="text-red-500 text-xs px-1">
          {customAddressError}
        </div>
      )}
    </div>
  );
  
  return (
    <div className="flex items-center">
      {isCreateMode ? (
        renderCreateMode()
      ) : (
        <>
          <div className="flex items-center">
            {/* 电脑端邮箱地址显示 */}
            <div className="hidden sm:flex items-center">
              <code className="bg-muted px-2 py-1 rounded text-sm font-medium flex items-center">
                {mailbox.address}@
                {/* [fix]: 为select包裹一个relative容器，用于绝对定位自定义箭头 */}
                <div className="relative">
                  <select 
                    value={selectedDomain}
                    onChange={(e) => setSelectedDomain(e.target.value)}
                    // [fix]: 添加 appearance-none 移除原生样式，并增加padding-right为箭头留出空间
                    className="appearance-none bg-transparent border-none focus:outline-none pl-1 pr-4 font-medium"
                  >
                    {domains.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                  {/* [fix]: 添加自定义的下拉箭头图标 */}
                  <i className="fas fa-chevron-down absolute right-0 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none"></i>
                </div>
              </code>
              
              {/* 添加邮箱切换组件 */}
              <MailboxSwitcher 
                currentMailbox={mailbox}
                onSwitchMailbox={onMailboxChange}
                domain={selectedDomain}
              />
              
              <div className="relative">
                <button 
                  onClick={copyToClipboard}
                  className={`w-8 h-8 ${copyButtonClass}`}
                  aria-label={t('common.copy')}
                  title={t('common.copy')}
                >
                  <i className="fas fa-copy text-sm"></i>
                </button>
              </div>
              
              <button
                onClick={handleEnterCreateMode}
                className={`w-8 h-8 ${createButtonClass}`}
                disabled={isActionLoading}
                title={t('mailbox.createNew')}
              >
                <i className="fas fa-plus text-sm"></i>
              </button>
            </div>
            
          </div>
          
          {/* 移动版显示 */}
          <div className="flex sm:hidden items-center flex-col">
            {/* 邮箱地址和操作按钮 */}
            <div className="flex items-center">
              {renderMobileAddress()}
              
              {/* 添加移动版邮箱切换组件 */}
              <div className="transform scale-75 origin-right -mr-1">
                <MailboxSwitcher 
                  currentMailbox={mailbox}
                  onSwitchMailbox={onMailboxChange}
                  domain={selectedDomain}
                />
              </div>
              
              <div className="relative">
                <button 
                  onClick={copyToClipboard}
                  className={`w-6 h-6 ${copyButtonClass}`}
                  aria-label={t('common.copy')}
                  title={t('common.copy')}
                >
                  <i className="fas fa-copy text-xs"></i>
                </button>
              </div>
            </div>
            
            <div className="flex items-center">
              <button
                onClick={handleEnterCreateMode}
                className={`w-6 h-6 ${createButtonClass}`}
                disabled={isActionLoading}
                title={t('mailbox.createNew')}
              >
                <i className="fas fa-plus text-xs"></i>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default HeaderMailbox; 