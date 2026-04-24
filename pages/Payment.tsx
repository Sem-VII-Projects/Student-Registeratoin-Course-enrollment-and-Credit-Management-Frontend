import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../lib/api';
import '../styles/Payment.css';

const REGISTRATION_CONFIG_STORAGE_KEY = 'registration_form_data';

const getStudentSession = () => {
  const data = sessionStorage.getItem('user');
  return data ? JSON.parse(data) : null;
};

const persistStudentSession = (student) => {
  sessionStorage.setItem('user', JSON.stringify(student));
};

function Payment() {
  const navigate = useNavigate();
  const location = useLocation();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState('');
  const [selectedPaymentType, setSelectedPaymentType] = useState(''); // 'qr' or 'phone'
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState('');
  const [amount, setAmount] = useState(location.state?.amount || 150000); // Default fee
  const [copied, setCopied] = useState(false);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Payment methods with refined icons
  const paymentMethods = {
    KBZPay: {
      name: 'KBZPay',
      icon: '💳',
      qrCode: '/kbzpay-qr.jpg',
      phone: '09123456789'
    },
    AYAPay: {
      name: 'AYA Pay',
      icon: '🏛️',
      qrCode: '/ayapay-qr.jpg',
      phone: '09987654321'
    },
    WavePay: {
      name: 'Wave Money',
      icon: '🌊',
      qrCode: '/wavepay-qr.jpg',
      phone: '09456789123'
    }
  };

  useEffect(() => {
    // Assuming getStudentSession() is imported or available
    const parsedStudent = getStudentSession ? getStudentSession() : JSON.parse(sessionStorage.getItem('user') || 'null');
    if (!parsedStudent) {
      navigate('/login');
      return;
    }

    setStudent(parsedStudent);

    // Derive dynamic fee from latest registration configuration (Configure Registration tab)
    try {
      const raw = localStorage.getItem(REGISTRATION_CONFIG_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const array = Array.isArray(parsed) ? parsed : [parsed];
        if (array.length > 0) {
          const latest = array[array.length - 1];
          const header = latest.header || {};
          const yearlyConfig = latest.yearlyConfig || [];
          const currentYear = Number(parsedStudent.currentyear || 0);
          let feeFromYear = null;
          if (currentYear) {
            const match = yearlyConfig.find(
              (y) => Number(y.yearLevel) === currentYear
            );
            if (match && typeof match.fee === 'number' && match.fee > 0) {
              feeFromYear = match.fee;
            }
          }
          const headerBase = typeof header.baseFee === 'number' ? header.baseFee : null;
          const resolved = feeFromYear || headerBase;
          if (resolved && resolved > 0) {
            setAmount(resolved);
          }
        }
      }
    } catch {
      // ignore config parse errors and keep default amount
    }

    const currentStatus = String(parsedStudent.status || '').toUpperCase();

    if (currentStatus === 'PAYMENT_PENDING') {
      alert('Your payment form is already submitted and waiting for admin approval.');
      navigate('/student/dashboard');
      return;
    }

    if (currentStatus === 'PAYMENT_DONE' || currentStatus === 'ENROLLED') {
      alert('Payment is already approved for this account.');
      navigate('/student/dashboard');
      return;
    }

    if (currentStatus !== 'PAYMENT_REQUIRED' && currentStatus !== 'CLASS_SELECTED') {
      alert('You can submit payment only after admin approves your details.');
      navigate('/student/dashboard');
      return;
    }
  }, [navigate]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('ဖိုင်အရွယ်အစား 5MB ထက်မကျော်ရပါ!');
        return;
      }

      setReceiptFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadReceipt = async () => {
    if (!receiptFile) return null;
    if (receiptPreview) return receiptPreview;

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Failed to read receipt image'));
      reader.readAsDataURL(receiptFile);
    });
  };

  const handleSubmit = async () => {
    if (!selectedMethod) {
      alert('ကျေးဇူးပြု၍ ငွေပေးချေမှု နည်းလမ်း ရွေးချယ်ပါ။');
      return;
    }

    if (!receiptFile) {
      alert('ကျေးဇူးပြု၍ ငွေပေးချေပြီး screenshot တင်ပါ။');
      return;
    }

    const confirm = window.confirm(
      `${selectedMethod} ဖြင့် ${amount.toLocaleString()} MMK ပေးချေမှာ သေချာပါသလား?\n\n` +
      `Screenshot တင်သွင်းမည်လား?`
    );

    if (!confirm) return;

    setLoading(true);

    try {
      // Upload receipt image
      const receiptUrl = await uploadReceipt();

      await api.upsertStudentDocument({
        studentId: student.studentid || student.id,
        docType: 'PAYMENT_RECEIPT',
        fileUrl: receiptUrl,
        paymentMethod: selectedMethod,
        amount
      });

      const studentId = student.studentid || student.id;
      await api.updateStudent(studentId, {
        status: 'PAYMENT_PENDING'
      });

      // Update localStorage
      const updatedStudent = {
        ...student,
        status: 'PAYMENT_PENDING'
      };
      if (persistStudentSession) {
          persistStudentSession(updatedStudent);
      } else {
          sessionStorage.setItem('user', JSON.stringify(updatedStudent));
      }

      alert(
        '✅ ငွေပေးချေမှု အောင်မြင်ပါသည်!\n\n' +
        'အက်ဒမင်မှ စစ်ဆေးပြီး အတည်ပြုပေးပါမည်။\n' +
        'Dashboard သို့ ပြန်သွားပါ။'
      );

      navigate('/student/dashboard');

    } catch (error) {
      console.error('Payment error:', error);
      alert('❌ Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!student) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="payment-container">
      <header className="payment-header">
        <h1>Payment</h1>
        <p>Complete your tuition payment to finalize your seat.</p>
      </header>

      <div className="payment-content">
        <div className="amount-card">
          <h2>Semester Fee</h2>
          <div className="amount-display">{amount.toLocaleString()} <span style={{fontSize: '1rem', color: '#64748b'}}>MMK</span></div>
        </div>

        <div className="payment-methods">
          <h3>1. Select Method</h3>
          <div className="method-grid">
            {Object.keys(paymentMethods).map((key) => {
              const method = paymentMethods[key];
              return (
                <div
                  key={key}
                  className={`method-card ${selectedMethod === key ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedMethod(key);
                    setSelectedPaymentType('');
                  }}
                >
                  <div className="method-icon">{method.icon}</div>
                  <div className="method-name">{method.name}</div>
                </div>
              );
            })}
          </div>
        </div>

        {selectedMethod && (
          <div className="payment-details animate-in fade-in duration-500">
            <h3>2. Payment Type</h3>
            <div className="payment-type-options">
              <div 
                className={`payment-type-card ${selectedPaymentType === 'qr' ? 'active' : ''}`}
                onClick={() => setSelectedPaymentType('qr')}
              >
                <div className="type-icon">🔳</div>
                <h4>QR Scan</h4>
              </div>
              <div 
                className={`payment-type-card ${selectedPaymentType === 'phone' ? 'active' : ''}`}
                onClick={() => setSelectedPaymentType('phone')}
              >
                <div className="type-icon">📱</div>
                <h4>Phone Transfer</h4>
              </div>
            </div>

            {selectedPaymentType === 'qr' && (
              <div className="qr-display animate-in fade-in">
                <div className="qr-code-box">
                  <p>QR Code for {selectedMethod}</p>
                </div>
              </div>
            )}

            {selectedPaymentType === 'phone' && (
              <div className="phone-display animate-in fade-in">
                <div className="phone-number-box">
                  <div className="phone-number">{paymentMethods[selectedMethod].phone}</div>
                  <button 
                    className={`btn-copy ${copied ? 'bg-emerald-600' : 'bg-[#0f172a]'}`}
                    onClick={() => handleCopy(paymentMethods[selectedMethod].phone)}
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            )}

            <div className="receipt-upload">
              <h3>3. Upload Screenshot</h3>
              <div className="upload-section">
                {receiptPreview ? (
                  <div className="receipt-preview">
                    <img src={receiptPreview} alt="Receipt" />
                    <button className="btn-change" onClick={() => document.getElementById('receiptInput').click()}>Change</button>
                  </div>
                ) : (
                  <label htmlFor="receiptInput" className="upload-label">
                    <div className="upload-icon">📤</div>
                    <p>Click to upload</p>
                  </label>
                )}
                <input type="file" id="receiptInput" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
              </div>
            </div>
          </div>
        )}

        <div className="payment-actions">
          <button className="btn btn-back" onClick={() => navigate('/student/dashboard')}>Back</button>
          <button 
            className="btn btn-submit"
            onClick={handleSubmit}
            disabled={!selectedMethod || !selectedPaymentType || !receiptFile || loading}
          >
            {loading ? 'Processing...' : 'Confirm Payment'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Payment;
