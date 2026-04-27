import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import { getStudentSession, persistStudentSession } from '../src/utils/studentStorage';
import '../styles/Payment.css';

const REGISTRATION_CONFIG_STORAGE_KEY = 'registration_form_data';

function Payment() {
  const { t } = useTranslation();
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
      navigate('/student/dashboard');
      return;
    }

    if (currentStatus === 'PAYMENT_DONE' || currentStatus === 'ENROLLED') {
      alert('Payment is already approved for this account.');
      navigate('/student/dashboard');
      return;
    }

    if (currentStatus !== 'PAYMENT_REQUIRED' && currentStatus !== 'CLASS_SELECTED' && currentStatus !== 'PAYMENT_REJECTED') {
      alert(t('You can submit payment only after admin approves your details.'));
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
persistStudentSession(updatedStudent);

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
    <div className="payment-container min-h-screen bg-slate-50 dark:bg-slate-950 p-6 md:p-10 animate-in fade-in duration-500">
      <header className="payment-header mb-10">
        <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase">{t('Payment')}</h1>
        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-2">{t('Complete your tuition payment to finalize your seat.')}</p>
      </header>

      <div className="payment-content max-w-4xl mx-auto space-y-8">
        <div className="amount-card bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm">
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">{t('Semester Fee')}</h2>
          <div className="amount-display text-4xl font-black text-slate-900 dark:text-white tracking-tighter">{amount.toLocaleString()} <span className="text-xl text-slate-400">MMK</span></div>
        </div>

        <div className="payment-methods bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">{t('1. Select Method')}</h3>
          <div className="method-grid grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.keys(paymentMethods).map((key) => {
              const method = paymentMethods[key];
              return (
                <div
                  key={key}
                  className={`method-card cursor-pointer p-6 rounded-2xl border transition-all duration-300 ${selectedMethod === key ? 'border-teal-600 bg-teal-50 dark:bg-teal-900/20 shadow-md' : 'border-slate-100 dark:border-slate-800 hover:shadow-lg hover:-translate-y-1'}`}
                  onClick={() => {
                    setSelectedMethod(key);
                    setSelectedPaymentType('');
                  }}
                >
                  <div className="method-icon text-3xl mb-3">{method.icon}</div>
                  <div className="method-name text-sm font-black text-slate-900 dark:text-white uppercase">{method.name}</div>
                </div>
              );
            })}
          </div>
        </div>

        {selectedMethod && (
          <div className="payment-details space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">{t('2. Payment Type')}</h3>
              <div className="payment-type-options grid grid-cols-2 gap-6">
                <div 
                  className={`payment-type-card cursor-pointer p-6 rounded-2xl border transition-all ${selectedPaymentType === 'qr' ? 'border-teal-600 bg-teal-50 dark:bg-teal-900/20 shadow-md' : 'border-slate-100 dark:border-slate-800 hover:shadow-lg hover:-translate-y-1'}`}
                  onClick={() => setSelectedPaymentType('qr')}
                >
                  <div className="type-icon text-2xl mb-2">🔳</div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase">{t('QR Scan')}</h4>
                </div>
                <div 
                  className={`payment-type-card cursor-pointer p-6 rounded-2xl border transition-all ${selectedPaymentType === 'phone' ? 'border-teal-600 bg-teal-50 dark:bg-teal-900/20 shadow-md' : 'border-slate-100 dark:border-slate-800 hover:shadow-lg hover:-translate-y-1'}`}
                  onClick={() => setSelectedPaymentType('phone')}
                >
                  <div className="type-icon text-2xl mb-2">📱</div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase">{t('Phone Transfer')}</h4>
                </div>
              </div>

              {selectedPaymentType === 'qr' && (
                <div className="qr-display mt-8 animate-in fade-in">
                  <div className="qr-code-box bg-slate-50 dark:bg-slate-950 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
                    <p className="text-sm font-bold text-slate-500">{t('QR Code for')} {selectedMethod}</p>
                  </div>
                </div>
              )}

              {selectedPaymentType === 'phone' && (
                <div className="phone-display mt-8 animate-in fade-in">
                  <div className="phone-number-box flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <div className="phone-number text-xl font-black text-slate-900 dark:text-white tabular-nums">{paymentMethods[selectedMethod].phone}</div>
                    <button 
                      className={`btn-copy px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all ${copied ? 'bg-emerald-600' : 'bg-slate-900 dark:bg-teal-600'}`}
                      onClick={() => handleCopy(paymentMethods[selectedMethod].phone)}
                    >
                      {copied ? t('Copied!') : t('Copy')}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="receipt-upload bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">{t('3. Upload Screenshot')}</h3>
              <div className="upload-section">
                {receiptPreview ? (
                  <div className="receipt-preview relative group">
                    <img src={receiptPreview} alt="Receipt" className="w-full h-auto rounded-2xl border border-slate-100" />
                    <button className="btn-change absolute bottom-4 right-4 bg-white/80 backdrop-blur-sm px-6 py-3 rounded-2xl text-[10px] font-black uppercase shadow-lg" onClick={() => document.getElementById('receiptInput').click()}>{t('Change')}</button>
                  </div>
                ) : (
                  <label htmlFor="receiptInput" className="upload-label flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-12 cursor-pointer hover:border-teal-500 transition-all">
                    <div className="upload-icon text-4xl mb-4">📤</div>
                    <p className="text-sm font-black text-slate-400 uppercase">{t('Click to upload')}</p>
                  </label>
                )}
                <input type="file" id="receiptInput" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
              </div>
            </div>
          </div>
        )}

        <div className="payment-actions flex items-center justify-between pt-8">
          <button className="btn btn-back px-8 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-black uppercase tracking-widest hover:bg-slate-200" onClick={() => navigate('/student/dashboard')}>{t('Back')}</button>
          <button 
            className="btn btn-submit px-10 py-4 rounded-2xl bg-teal-600 text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-teal-500/20 hover:bg-teal-500 disabled:opacity-50 transition-all"
            onClick={handleSubmit}
            disabled={!selectedMethod || !selectedPaymentType || !receiptFile || loading}
          >
            {loading ? t('Processing...') : t('Confirm Payment')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Payment;
