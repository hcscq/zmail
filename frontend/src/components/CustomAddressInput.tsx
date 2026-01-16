import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

interface CustomAddressInputProps {
  value: string;
  onChange: (value: string) => void;
  onValidationChange?: (isValid: boolean) => void;
  domain: string;
  disabled?: boolean;
}

interface ValidationResult {
  valid: boolean;
  error?: string;
}

const CustomAddressInput: React.FC<CustomAddressInputProps> = ({
  value,
  onChange,
  onValidationChange,
  domain,
  disabled = false,
}) => {
  const { t } = useTranslation();
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isTouched, setIsTouched] = useState(false);

  // Validation function matching backend rules
  const validateAddress = useCallback((address: string): ValidationResult => {
    if (address.length === 0) {
      return { valid: false, error: t('customAddress.required') };
    }
    
    if (address.length < 3) {
      return { valid: false, error: t('customAddress.tooShort') };
    }
    
    if (address.length > 30) {
      return { valid: false, error: t('customAddress.tooLong') };
    }
    
    // Only allow letters, numbers, dots, underscores, and hyphens
    const validCharsRegex = /^[a-zA-Z0-9._-]+$/;
    if (!validCharsRegex.test(address)) {
      return { valid: false, error: t('customAddress.invalidChars') };
    }
    
    return { valid: true };
  }, [t]);

  // Real-time validation
  useEffect(() => {
    if (!isTouched && value.length === 0) {
      setValidationError(null);
      onValidationChange?.(false);
      return;
    }

    const result = validateAddress(value);
    setValidationError(result.valid ? null : result.error || null);
    onValidationChange?.(result.valid);
  }, [value, isTouched, validateAddress, onValidationChange]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.toLowerCase();
    onChange(newValue);
  };

  const handleBlur = () => {
    setIsTouched(true);
  };

  return (
    <div className="flex flex-col space-y-1">
      <div className="flex items-center">
        <input
          type="text"
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          className={`w-40 md:w-48 px-3 py-1.5 text-sm border rounded-l-md focus:outline-none focus:ring-1 ${
            validationError && isTouched
              ? 'border-red-500 focus:ring-red-500'
              : 'border-input focus:ring-primary'
          }`}
          placeholder={t('customAddress.placeholder')}
          disabled={disabled}
          autoComplete="off"
        />
        <span className="px-3 py-1.5 text-sm border-y border-r rounded-r-md bg-muted text-muted-foreground">
          @{domain}
        </span>
      </div>
      {validationError && isTouched && (
        <p className="text-xs text-red-500 px-1">
          {validationError}
        </p>
      )}
      <p className="text-xs text-muted-foreground px-1">
        {t('customAddress.hint')}
      </p>
    </div>
  );
};

export default CustomAddressInput;
