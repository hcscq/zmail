import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface MailboxInfoProps {
  mailbox: Mailbox;
  onDelete: () => void;
  autoRefresh: boolean;
  onToggleAutoRefresh: () => void;
  onConvertToPermanent?: () => void;
}

const MailboxInfo: React.FC<MailboxInfoProps> = ({ 
  mailbox, 
  onDelete,
  autoRefresh,
  onToggleAutoRefresh,
  onConvertToPermanent
}) => {
  const { t } = useTranslation();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };
  
  const calculateTimeLeft = (expiresAt: number) => {
    const now = Math.floor(Date.now() / 1000);
    const timeLeftSeconds = expiresAt - now;
    
    if (timeLeftSeconds <= 0) {
      return t('mailbox.expired');
    }
    
    const hours = Math.floor(timeLeftSeconds / 3600);
    const minutes = Math.floor((timeLeftSeconds % 3600) / 60);
    
    if (hours > 0) {
      return t('mailbox.expiresInTime', { hours, minutes });
    } else {
      return t('mailbox.expiresInMinutes', { minutes });
    }
  };

  const isPermanent = mailbox.isPermanent || false;
  const isEligibleForConversion = !isPermanent && (mailbox.addressType === 'name' || mailbox.addressType === 'custom');
  

  
  return (
    <div className="border rounded-lg p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
        <div className="flex mt-4 md:mt-0 space-x-2">
          <button
            onClick={onToggleAutoRefresh}
            className={`px-3 py-1 rounded-md ${
              autoRefresh 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {autoRefresh ? t('email.autoRefreshOn') : t('email.autoRefreshOff')}
          </button>
          
          {/* Show conversion button for eligible temporary mailboxes */}
          {isEligibleForConversion && onConvertToPermanent && (
            <button
              onClick={onConvertToPermanent}
              className="px-3 py-1 rounded-md bg-blue-600 text-white hover:bg-blue-700"
            >
              {t('permanent.makePermanent')}
            </button>
          )}
          
          {/* Show delete button only for temporary mailboxes */}
          {!isPermanent && (
            <>
              {showDeleteConfirm ? (
                <>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-3 py-1 rounded-md bg-muted"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    onClick={onDelete}
                    className="px-3 py-1 rounded-md bg-destructive text-destructive-foreground"
                  >
                    {t('common.confirm')}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-3 py-1 rounded-md bg-destructive text-destructive-foreground"
                >
                  {t('common.delete')}
                </button>
              )}
            </>
          )}
          
          {/* Show explanatory text for permanent mailboxes */}
          {isPermanent && (
            <span className="px-3 py-1 text-sm text-muted-foreground">
              {t('permanent.cannotDelete')}
            </span>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground">{t('mailbox.created')}</p>
          <p>{formatDate(mailbox.createdAt)}</p>
        </div>
        
        {/* Show permanent badge or expiration info */}
        {isPermanent ? (
          <>
            <div>
              <p className="text-muted-foreground">{t('mailbox.status')}</p>
              <p className="inline-flex items-center px-2 py-1 rounded-md bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 font-medium">
                {t('permanent.permanent')}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">{t('mailbox.expiry')}</p>
              <p>{t('permanent.neverExpires')}</p>
            </div>
          </>
        ) : (
          <>
            <div>
              <p className="text-muted-foreground">{t('mailbox.expiresAt')}</p>
              <p>{formatDate(mailbox.expiresAt)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">{t('mailbox.timeLeft')}</p>
              <p>{calculateTimeLeft(mailbox.expiresAt)}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MailboxInfo; 