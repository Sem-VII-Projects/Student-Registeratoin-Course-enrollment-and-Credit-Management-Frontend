import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../api/client';
import { getStudentSession, persistStudentSession } from '../utils/studentStorage';
import '../styles/Payment.css';

const REGISTRATION_CONFIG_STORAGE_KEY = 'registration_form_data';

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

  // Payment methods with QR codes and phone numbers
  const paymentMethods = {
    KBZPay: {
      name: 'KBZPay',
      icon: '💳',
      qrCode: '/kbzpay-qr.jpg', // You'll add your real QR image
      phone: '09123456789'
    },
    AYAPay: {
      name: 'AYA Pay',
      icon: '💰',
      qrCode: '/ayapay-qr.jpg',
      phone: '09987654321'
    },
    WavePay: {
      name: 'Wave Money',
      icon: '📱',
      qrCode: '/wavepay-qr.jpg',
      phone: '09456789123'
    }
  };

  useEffect(() => {
    const parsedStudent = getStudentSession();
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
      navigate('/student-dashboard');
      return;
    }

    if (currentStatus === 'PAYMENT_DONE' || currentStatus === 'ENROLLED') {
      alert('Payment is already approved for this account.');
      navigate('/student-dashboard');
      return;
    }

    if (currentStatus !== 'PAYMENT_REQUIRED' && currentStatus !== 'CLASS_SELECTED') {
      alert('You can submit payment only after admin approves your details.');
      navigate('/student-dashboard');
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
      persistStudentSession(updatedStudent);

      alert(
        '✅ ငွေပေးချေမှု အောင်မြင်ပါသည်!\n\n' +
        'အက်ဒမင်မှ စစ်ဆေးပြီး အတည်ပြုပေးပါမည်။\n' +
        'Dashboard သို့ ပြန်သွားပါ။'
      );

      navigate('/student-dashboard');

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
        <h1>💰 Payment</h1>
        <p>ငွေပေးချေခြင်း</p>
      </header>

      <div className="payment-content">
        
        {/* Amount Display */}
        <div className="amount-card">
          <h2>Amount to Pay</h2>
          <div className="amount-display">
            {amount.toLocaleString()} <span>MMK</span>
          </div>
          <p>စာရင်းကြေး (Semester Fee)</p>
        </div>

        {/* Payment Method Selection */}
        <div className="payment-methods">
          <h3>Select Payment Method</h3>
          <p className="subtitle">ငွေပေးချေမှု နည်းလမ်း ရွေးချယ်ပါ</p>
          
          <div className="method-grid">
            {Object.keys(paymentMethods).map((key) => {
              const method = paymentMethods[key];
              return (
                <div
                  key={key}
                  className={`method-card ${selectedMethod === key ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedMethod(key);
                    setSelectedPaymentType(''); // Reset payment type
                  }}
                >
                  <div className="method-icon">{method.icon}</div>
                  <div className="method-name">{method.name}</div>
                  {selectedMethod === key && <div className="check-mark">✓</div>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Payment Details (show when method selected) */}
        {selectedMethod && (
          <div className="payment-details">
            <h3>Choose Payment Type</h3>
            <p className="subtitle">ငွေပေးချေရန် နည်းလမ်း ရွေးပါ</p>

            <div className="payment-type-options">
              <div 
                className={`payment-type-card ${selectedPaymentType === 'qr' ? 'active' : ''}`}
                onClick={() => setSelectedPaymentType('qr')}
              >
                <div className="type-icon">📱</div>
                <h4>Scan QR Code</h4>
                <p>QR ကုဒ် scan ပြီး ပေးချေပါ</p>
              </div>

              <div 
                className={`payment-type-card ${selectedPaymentType === 'phone' ? 'active' : ''}`}
                onClick={() => setSelectedPaymentType('phone')}
              >
                <div className="type-icon">📞</div>
                <h4>Transfer to Phone</h4>
                <p>ဖုန်းနံပါတ်သို့ လွှဲပါ</p>
              </div>
            </div>

            {/* QR Code Display */}
            {selectedPaymentType === 'qr' && (
              <div className="qr-display">
                <h4>Scan this QR Code</h4>
                <div className="qr-code-box">
                  {/* Placeholder - you'll add real QR image */}
                  <div className="qr-placeholder">
                    <p>📷</p>
                    <p>QR Code</p>
                    <p>{selectedMethod}</p>
                    <small>(Add your real QR image here)</small>
                  </div>
                  {/* When you have real QR:
                  <img src={paymentMethods[selectedMethod].qrCode} alt="QR Code" />
                  */}
                </div>
                <p className="qr-instruction">
                  သင့် {selectedMethod} app ဖွင့်ပြီး QR Code scan ကာ ငွေပေးချေပါ
                </p>
              </div>
            )}

            {/* Phone Number Display */}
            {selectedPaymentType === 'phone' && (
              <div className="phone-display">
                <h4>Transfer to this Number</h4>
                <div className="phone-number-box">
                  <div className="phone-icon">📱</div>
                  <div className="phone-number">{paymentMethods[selectedMethod].phone}</div>
                  <button 
                    className="btn-copy"
                    onClick={() => {
                      navigator.clipboard.writeText(paymentMethods[selectedMethod].phone);
                      alert('Phone number copied!');
                    }}
                  >
                    Copy
                  </button>
                </div>
                <p className="phone-instruction">
                  ဤဖုန်းနံပါတ်သို့ {amount.toLocaleString()} MMK လွှဲပြီး screenshot ရိုက်ပါ
                </p>
              </div>
            )}

            {/* Receipt Upload */}
            {selectedPaymentType && (
              <div className="receipt-upload">
                <h4>Upload Payment Screenshot</h4>
                <p className="subtitle">ငွေပေးချေပြီး screenshot တင်ပါ</p>

                <div className="upload-section">
                  {receiptPreview ? (
                    <div className="receipt-preview">
                      <img src={receiptPreview} alt="Receipt" />
                      <button 
                        className="btn-change"
                        onClick={() => document.getElementById('receiptInput').click()}
                      >
                        Change Image
                      </button>
                    </div>
                  ) : (
                    <label htmlFor="receiptInput" className="upload-label">
                      <div className="upload-icon">📸</div>
                      <p>Click to upload receipt</p>
                      <small>(Max 5MB, JPG/PNG)</small>
                    </label>
                  )}
                  <input
                    type="file"
                    id="receiptInput"
                    accept="image/*"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="payment-actions">
          <button 
            className="btn btn-back"
            onClick={() => navigate('/student-dashboard')}
          >
            ← Back
          </button>
          <button 
            className="btn btn-submit"
            onClick={handleSubmit}
            disabled={!selectedMethod || !selectedPaymentType || !receiptFile || loading}
          >
            {loading ? 'Submitting...' : '✓ Submit Payment'}
          </button>
        </div>

      </div>
    </div>
  );
}

export default Payment;

