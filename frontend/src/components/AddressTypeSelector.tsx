import React from 'react';
import { useTranslation } from 'react-i18next';

export type AddressType = 'name' | 'random' | 'custom';

interface AddressTypeSelectorProps {
  selectedType: AddressType;
  onTypeChange: (type: AddressType) => void;
  disabled?: boolean;
  isPermanent?: boolean;
  onPermanentChange?: (value: boolean) => void;
}

const AddressTypeSelector: React.FC<AddressTypeSelectorProps> = ({
  selectedType,
  onTypeChange,
  disabled = false,
  isPermanent = false,
  onPermanentChange,
}) => {
  const { t } = useTranslation();

  const options: { type: AddressType; label: string; icon: string }[] = [
    { type: 'name', label: t('addressType.name'), icon: 'fa-user' },
    { type: 'random', label: t('addressType.random'), icon: 'fa-random' },
    { type: 'custom', label: t('addressType.custom'), icon: 'fa-edit' },
  ];

  const baseButtonClass = 
    'flex items-center justify-center px-3 py-1.5 text-sm rounded-md transition-all duration-200';
  
  const getButtonClass = (type: AddressType) => {
    const isSelected = selectedType === type;
    if (disabled) {
      return `${baseButtonClass} bg-muted text-muted-foreground cursor-not-allowed opacity-50`;
    }
    if (isSelected) {
      return `${baseButtonClass} bg-primary text-primary-foreground`;
    }
    return `${baseButtonClass} bg-muted hover:bg-primary/20 hover:text-primary`;
  };

  // Check if permanent option is eligible for current address type
  const isPermanentEligible = selectedType === 'name' || selectedType === 'custom';

  return (
    <div className="flex flex-col space-y-2">
      <div className="flex items-center space-x-2">
        <span className="text-sm text-muted-foreground mr-1">
          {t('addressType.label')}:
        </span>
        <div className="flex items-center space-x-1">
          {options.map(({ type, label, icon }) => (
            <button
              key={type}
              type="button"
              onClick={() => !disabled && onTypeChange(type)}
              className={getButtonClass(type)}
              disabled={disabled}
              title={label}
            >
              <i className={`fas ${icon} text-xs mr-1.5`}></i>
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Permanent toggle - only shown for name/custom types */}
      {isPermanentEligible && onPermanentChange && (
        <div className="flex flex-col space-y-1 pl-1">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isPermanent}
              onChange={(e) => onPermanentChange(e.target.checked)}
              disabled={disabled}
              className="w-4 h-4 text-primary bg-muted border-muted-foreground rounded focus:ring-primary focus:ring-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <span className="text-sm font-medium">
              {t('permanent.option')}
            </span>
          </label>
          <p className="text-xs text-muted-foreground pl-6">
            {t('permanent.description')}
          </p>
        </div>
      )}

      {/* Explanation for random type ineligibility */}
      {selectedType === 'random' && (
        <div className="flex items-start space-x-2 pl-1">
          <i className="fas fa-info-circle text-muted-foreground text-xs mt-0.5"></i>
          <p className="text-xs text-muted-foreground">
            {t('permanent.randomIneligible')}
          </p>
        </div>
      )}
    </div>
  );
};

export default AddressTypeSelector;
