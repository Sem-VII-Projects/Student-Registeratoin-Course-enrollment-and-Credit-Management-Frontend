import React from 'react';
import { useTranslation } from 'react-i18next';

const PaymentPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="payment-page">
      <h1>{t('Tuition Payment')}</h1>
      <p>{t('Please complete your tuition payment to finalize your seat.')}</p>
      {/* Payment content will be added here */}
    </div>
  );
};

export default PaymentPage;
