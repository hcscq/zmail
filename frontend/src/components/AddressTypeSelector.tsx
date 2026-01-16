import React from 'react';
import { useTranslation } from 'react-i18next';

export type AddressType = 'name' | 'random' | 'custom';

interface AddressTypeSelectorProps {
  selectedType: AddressType;
  onTypeChange: (type: AddressType) => void;
  disabled?: boolean;
}

const AddressTypeSelector: React.FC<AddressTypeSelectorProps> = ({
  selectedType,
  onTypeChange,
  disabled = false,
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

  return (
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
  );
};

export default AddressTypeSelector;
