import React from 'react';
import { useTranslation } from 'react-i18next';

interface AddressPreviewProps {
  address: string;
  domain: string;
  onRegenerate: () => void;
  isLoading?: boolean;
}

const AddressPreview: React.FC<AddressPreviewProps> = ({
  address,
  domain,
  onRegenerate,
  isLoading = false,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center space-x-2">
      <div className="flex items-center bg-muted px-3 py-1.5 rounded-md">
        {isLoading ? (
          <span className="text-sm text-muted-foreground animate-pulse">
            {t('common.loading')}
          </span>
        ) : (
          <code className="text-sm font-medium">
            {address}@{domain}
          </code>
        )}
      </div>
      <button
        type="button"
        onClick={onRegenerate}
        disabled={isLoading}
        className={`w-8 h-8 flex items-center justify-center rounded-md transition-all duration-200 ${
          isLoading
            ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
            : 'bg-muted hover:bg-primary/20 hover:text-primary hover:scale-110'
        }`}
        title={t('addressPreview.regenerate')}
      >
        <i className={`fas fa-sync-alt text-sm ${isLoading ? 'animate-spin' : ''}`}></i>
      </button>
    </div>
  );
};

export default AddressPreview;
