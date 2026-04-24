import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import '../styles/RegistrationStatus.css'; // Reusing some layout styles

const StudentDetails: React.FC<{ user?: any; onLogout?: () => void }> = ({ user, onLogout }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-content">
          <div className="logo-section">
            <div className="logo-circle-small">UIT</div>
            <div>
              <h1>Portal</h1>
              <p>{t('Student Registration Form')}</p>
            </div>
          </div>
          <div className="header-actions">
            <button className="btn-primary" onClick={() => navigate('/registration-details')}>
              {t('Back to Status')}
            </button>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="dashboard-content" style={{ textAlign: 'center', padding: '100px 20px' }}>
          <h2>{t('Registration Form')}</h2>
          <p>{t('The detailed registration form is currently being prepared.')}</p>
          <div style={{ 
            marginTop: '40px', 
            padding: '40px', 
            border: '2px dashed #e2e8f0', 
            borderRadius: '16px',
            color: '#64748b'
          }}>
            {t('Form components will appear here.')}
          </div>
        </div>
      </main>
    </div>
  );
};

export default StudentDetails;
