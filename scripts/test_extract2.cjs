const fs = require('fs');
const path = require('path');

const scriptDir = __dirname;
const baseDir = path.resolve(scriptDir, '..');
const outputDir = path.join(baseDir, 'pages');

const content = `import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import nrcCatalog from '../data/nrc.json';

interface WindowSettings {
  isOpen?: boolean;
  registrationDeadline?: string;
}

export default function NewStudentRegister() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [nrcDisabled, setNrcDisabled] = useState(false);
  const [windowSettings, setWindowSettings] = useState<WindowSettings | null>(null);
  const [windowLoading, setWindowLoading] = useState(true);

  // Form data state EXACTLY matching the friend's project
  const [formData, setFormData] = useState({
    studentName: '',
    fatherName: '',
    motherName: '',
    gender: '',
    dobDay: '',
    dobMonth: '',
    dobYear: '',
    nrcRegion: '',
    nrcTownship: '',
    nrcType: '',
    nrcNumber: '',
    nrcPending: false,
    birthplace: '',
    address: '',
    phone: '',
    email: '',
    entranceRollNo: '',
    matricRollNo: '',
    matricPassYear: '',
    totalMarks: ''
  });

  const nrcTypes = [
    '\\u1014\\u102D\\u102F\\u1004\\u103A',
    '\\u1027\\u100A\\u1037\\u103A',
    '\\u1015\\u103C\\u102F'
  ];

  const toMyanmarDigits = (value: string | number) =>
    String(value).replace(/[0-9]/g, (d) => '\\u1040\\u1041\\u1042\\u1043\\u1044\\u1045\\u1046\\u1047\\u1048\\u1049'[Number(d)]);
    
  const normalizeLocalizedDigits = (value: string | number) =>
    String(value ?? '').replace(/[\\u1040-\\u1049]/g, (digit) => String(digit.charCodeAt(0) - 0x1040));
    
  const parseLocalizedInteger = (value: string | number) => {
    const normalized = normalizeLocalizedDigits(value).trim();
    if (!normalized || !/^-?\\d+$/.test(normalized)) return null;
    const parsed = Number.parseInt(normalized, 10);
    return Number.isNaN(parsed) ? null : parsed;
  };

  const nrcRegions = Array.from(new Set(nrcCatalog.map((row) => String((row as any).state_code).trim())))
    .sort((a, b) => Number(a) - Number(b));

  const nrcTownships = nrcCatalog
    .filter((row) => String((row as any).state_code).trim() === formData.nrcRegion)
    .map((row: any) => ({
      code: String(row.township_code_mm || '').trim(),
      nameMm: String(row.township_mm || '').trim(),
      nameEn: String(row.township_en || '').trim()
    }))
    .filter((row) => row.code)
    .sort((a, b) => a.code.localeCompare(b.code));

  // Months
  const months = [
    'ဇန်နဝါရီ', 'ဖေဖော်ဝါရီ', 'မတ်', 'ဧပြီ', 'မေ', 'ဇွန်',
    'ဇူလိုင်', 'သြဂုတ်', 'စက်တင်ဘာ', 'အောက်တိုဘာ', 'နိုဝင်ဘာ', 'ဒီဇင်ဘာ'
  ];

  useEffect(() => {
    let isMounted = true;
    api.getRegistrationWindowSettings()
      .then((data: any) => {
        if (!isMounted) return;
        setWindowSettings(data || null);
      })
      .catch(() => {
        setWindowSettings(null);
      })
      .finally(() => {
        if (isMounted) {
          setWindowLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const isRegistrationClosed = () => {
    if (!windowSettings) return false;
    const open = windowSettings.isOpen ?? true;
    if (!open) return true;
    if (!windowSettings.registrationDeadline) return false;
    const deadline = new Date(windowSettings.registrationDeadline);
    if (Number.isNaN(deadline.getTime())) return false;
    return Date.now() > deadline.getTime();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const target = e.target as HTMLInputElement;
    const { name, value, type } = target;
    const checked = target.checked;
    
    if (type === 'checkbox' && name === 'nrcPending') {
      setNrcDisabled(checked);
      setFormData({
        ...formData,
        nrcPending: checked,
        nrcRegion: checked ? '' : formData.nrcRegion,
        nrcTownship: checked ? '' : formData.nrcTownship,
        nrcType: checked ? '' : formData.nrcType,
        nrcNumber: checked ? '' : formData.nrcNumber
      });
    } else {
      setFormData({
        ...formData,
        [name]: type === 'checkbox' ? checked : value,
        ...(name === 'nrcRegion' ? { nrcTownship: '' } : {})
      });
    }
  };

  const validateForm = () => {
    const errors: string[] = [];

    if (!formData.studentName.trim()) errors.push('ကျောင်းသားအမည် ဖြည့်ပါ');
    if (!formData.fatherName.trim()) errors.push('အဖအမည် ဖြည့်ပါ');
    if (!formData.motherName.trim()) errors.push('အမေအမည် ဖြည့်ပါ');
    if (!formData.gender) errors.push('လိင် ရွေးချယ်ပါ');
    if (!formData.dobDay || !formData.dobMonth || !formData.dobYear) {
      errors.push('မွေးသက္ကရာဇ် အပြည့်အစုံ ဖြည့်ပါ');
    }
    if (!formData.nrcPending) {
      if (!formData.nrcRegion || !formData.nrcTownship || !formData.nrcType || !formData.nrcNumber) {
        errors.push('မှတ်ပုံတင်အမှတ် အပြည့်အစုံ ဖြည့်ပါ');
      }
      if (formData.nrcRegion && formData.nrcTownship && !nrcTownships.some((t) => t.code === formData.nrcTownship)) {
        errors.push('Selected NRC township is not valid for this region');
      }
      if (formData.nrcNumber && !/^[0-9\\u1040-\\u1049]{6}$/.test(formData.nrcNumber)) {
        errors.push('မှတ်ပုံတင်နံပါတ် ၆ လုံး ဖြည့်ပါ');
      }
    }
    if (!formData.phone.trim()) errors.push('ဖုန်းနံပါတ် ဖြည့်ပါ');
    if (!formData.email.trim()) errors.push('အီးမေးလ် ဖြည့်ပါ');
    if (!formData.birthplace.trim()) errors.push('မွေးဖွားရာဒေသ ဖြည့်ပါ');
    if (!formData.address.trim()) errors.push('နေရပ်လိပ်စာ ဖြည့်ပါ');
    if (!formData.email.includes('@')) errors.push('အီးမေးလ် မှန်ကန်ပါစေ');
    if (!formData.entranceRollNo.trim()) errors.push('ဝင်ခွင့်အမှတ်စဉ် ဖြည့်ပါ');
    if (!formData.matricRollNo.trim()) errors.push('တက္ကသိုလ်ဝင်တန်းခုံအမှတ် ဖြည့်ပါ');
    
    const matricYearValue = parseLocalizedInteger(formData.matricPassYear);
    if (!formData.matricPassYear.trim()) {
      errors.push('အောင်မြင်သည့်နှစ် ဖြည့်ပါ');
    } else if (matricYearValue === null) {
      errors.push('Matriculation pass year must be a number (example: 2024)');
    } else if (matricYearValue < 1900 || matricYearValue > 2100) {
      errors.push('Matriculation pass year is out of range');
    }

    const totalMarksValue = parseLocalizedInteger(formData.totalMarks);
    if (!formData.totalMarks.trim()) {
      errors.push('စုစုပေါင်းရမှတ် ဖြည့်ပါ');
    } else if (totalMarksValue === null) {
      errors.push('Total marks must be a number');
    } else if (totalMarksValue < 0 || totalMarksValue > 600) {
      errors.push('Total marks must be between 0 and 600');
    }

    if (errors.length > 0) {
      alert(errors.join('\\n'));
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!windowLoading && isRegistrationClosed()) {
      alert('🔒 စာရင်းသွင်းခြင်းပိတ်ထားပါသည်။ ကျေးဇူးပြု၍ သတ်မှတ်ထားသောလက်ခံကာလအတွင်းထပ်မံကြိုးစားပါ။');
      return;
    }

    if (!validateForm()) return;

    setLoading(true);

    try {
      const nrcString = formData.nrcPending
        ? '\\u101C\\u103B\\u103E\\u1031\\u102C\\u1000\\u103A\\u1011\\u102C\\u1038\\u1006\\u1032'
        : \`\${toMyanmarDigits(formData.nrcRegion)}/\${formData.nrcTownship}/\${formData.nrcType}/\${formData.nrcNumber}\`;

      const dateOfBirth = \`\${formData.dobYear}-\${formData.dobMonth}-\${formData.dobDay}\`;

      const matricYear = parseLocalizedInteger(formData.matricPassYear);
      const totalMarks = parseLocalizedInteger(formData.totalMarks);
      if (matricYear === null || totalMarks === null) {
        alert('Invalid numeric values for matriculation pass year or total marks.');
        setLoading(false);
        return;
      }
      const currentAcademicYear = new Date().getFullYear().toString();

      const payload = {
        // snake_case
        student_name: formData.studentName,
        father_name: formData.fatherName,
        mother_name: formData.motherName,
        gender: formData.gender,
        nrc_number: nrcString,
        date_of_birth: dateOfBirth,
        birthplace: formData.birthplace,
        exam_roll_no: formData.entranceRollNo,
        matriculation_year: matricYear,
        matriculation_passed_year: matricYear,
        total_marks: totalMarks,
        exam_year: matricYear,
        exam_center: 'UIT',
        division_or_state: formData.nrcRegion || 'Yangon',
        township: formData.nrcTownship || 'Insein',
        address: formData.address,
        phone: formData.phone,
        department_id: '00000000-0000-0000-0000-000000000001',
        semester_id: '00000000-0000-0000-0000-000000000001',
        full_name: formData.studentName,
        name_mm: formData.studentName,
        name_en: '',
        email: formData.email,
        matriculation_roll_no: formData.matricRollNo,
        current_year: 1,
        academic_year_entered: currentAcademicYear,
        university_admission: 'UIT',
        status: 'PENDING',

        // camelCase
        studentName: formData.studentName,
        fullName: formData.studentName,
        fatherName: formData.fatherName,
        motherName: formData.motherName,
        nrcNumber: nrcString,
        dateOfBirth: dateOfBirth,
        divisionOrState: formData.nrcRegion || 'Yangon',
        entranceRollNo: formData.entranceRollNo,
        matriculationYear: matricYear,
        totalMarks: totalMarks,
        examYear: matricYear,
        departmentId: '00000000-0000-0000-0000-000000000001',
        semesterId: '00000000-0000-0000-0000-000000000001',
        nameMm: formData.studentName,
        nameEn: '',
        matriculationRollNo: formData.matricRollNo,
        matriculationPassedYear: matricYear,
        totalMarksObtained: totalMarks,
        currentYear: 1,
        academicYearEntered: currentAcademicYear,
        universityAdmission: 'UIT'
      };

      await api.registerStudent(payload);
      alert('✅ စာရင်းသွင်းခြင်း အောင်မြင်ပါသည်!\\n\\nwait for admin approval and check your email.');
      navigate('/');

    } catch (error: any) {
      console.error('Error:', error);
      if (error?.status === 409 || error?.status === 400) {
        alert(error?.message || 'Registration data is invalid.');
      } else {
        alert('❌ စာရင်းသွင်းခြင်း မအောင်မြင်ပါ။ ထပ်မံကြိုးစားပါ။\\n\\n' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const baseInputClass = "w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all";

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12 flex justify-center items-center">
      <div className="max-w-3xl w-full bg-white p-7 md:p-10 rounded-[32px] border border-slate-100 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1">
        
        <div className="text-center mb-8 pb-6 border-b-2 border-indigo-50">
          <h2 className="text-3xl font-bold text-slate-800 mb-4 flex justify-center gap-2">
            📝 System Registration
          </h2>
          <div className="border-l-4 border-teal-600 bg-teal-50 p-4 rounded-r-xl text-slate-600 text-sm inline-block lg:w-[85%] text-left">
            အောက်ပါအချက်အလက်များကို တက္ကသိုလ်ဝင်တန်းလျှောက်လွှာစာအုပ်(မြန်မာအက္ခရာ font)ဖြင့်သာ ဖြည့်သွင်းပါရန်
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="space-y-2">
            <label className="block font-bold text-slate-800">ကျောင်းသားအမည်: <span className="text-red-500">*</span></label>
            <input type="text" name="studentName" value={formData.studentName} onChange={handleChange} className={baseInputClass} placeholder="ကျောင်းသားအမည် ထည့်ပါ" required />
          </div>

          <div className="space-y-2">
            <label className="block font-bold text-slate-800">အဖအမည်: <span className="text-red-500">*</span></label>
            <input type="text" name="fatherName" value={formData.fatherName} onChange={handleChange} className={baseInputClass} placeholder="အဖအမည် ထည့်ပါ" required />
          </div>

          <div className="space-y-2">
            <label className="block font-bold text-slate-800">အမေအမည်: <span className="text-red-500">*</span></label>
            <input type="text" name="motherName" value={formData.motherName} onChange={handleChange} className={baseInputClass} placeholder="အမေအမည် ထည့်ပါ" required />
          </div>

          <div className="space-y-2">
            <label className="block font-bold text-slate-800">လိင်: <span className="text-red-500">*</span></label>
            <div className="flex gap-4">
              <label className="flex items-center gap-3 bg-slate-50 border border-slate-200 px-5 py-3 rounded-xl cursor-pointer hover:bg-slate-100">
                <input type="radio" name="gender" value="ကျား" checked={formData.gender === 'ကျား'} onChange={handleChange} required className="w-5 h-5 text-indigo-600 border-slate-300" />
                <span className="text-slate-700 font-semibold text-base">ကျား (Male)</span>
              </label>
              <label className="flex items-center gap-3 bg-slate-50 border border-slate-200 px-5 py-3 rounded-xl cursor-pointer hover:bg-slate-100">
                <input type="radio" name="gender" value="မ" checked={formData.gender === 'မ'} onChange={handleChange} required className="w-5 h-5 text-indigo-600 border-slate-300" />
                <span className="text-slate-700 font-semibold text-base">မ (Female)</span>
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block font-bold text-slate-800">မွေးသက္ကရာဇ်: <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-5">
              <select name="dobDay" value={formData.dobDay} onChange={handleChange} required className={baseInputClass}>
                <option value="">ရက်</option>
                {[...Array(31)].map((_, i) => (
                  <option key={i + 1} value={String(i + 1).padStart(2, '0')}>{i + 1}</option>
                ))}
              </select>
              <select name="dobMonth" value={formData.dobMonth} onChange={handleChange} required className={baseInputClass}>
                <option value="">လ</option>
                {months.map((month, index) => (
                  <option key={index} value={String(index + 1).padStart(2, '0')}>{month}</option>
                ))}
              </select>
              <select name="dobYear" value={formData.dobYear} onChange={handleChange} required className={baseInputClass}>
                <option value="">နှစ်</option>
                {[...Array(30)].map((_, i) => {
                  const year = 2010 - i;
                  return <option key={year} value={year}>{year}</option>;
                })}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block font-bold text-slate-800">မှတ်ပုံတင်အမှတ်: <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 md:gap-4">
              <select name="nrcRegion" value={formData.nrcRegion} onChange={handleChange} disabled={nrcDisabled} required={!nrcDisabled} className={baseInputClass}>
                <option value="">ဒေသ</option>
                {nrcRegions.map((region) => (
                  <option key={region} value={region}>{toMyanmarDigits(region)}</option>
                ))}
              </select>
              <select name="nrcTownship" value={formData.nrcTownship} onChange={handleChange} disabled={nrcDisabled} required={!nrcDisabled} className={baseInputClass}>
                <option value="">မြို့နယ်</option>
                {nrcTownships.map((township) => (
                  <option key={township.code} value={township.code}>{township.code} - {township.nameMm || township.nameEn}</option>
                ))}
              </select>
              <select name="nrcType" value={formData.nrcType} onChange={handleChange} disabled={nrcDisabled} required={!nrcDisabled} className={baseInputClass}>
                <option value="">အမျိုးအစား</option>
                {nrcTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              <input type="text" name="nrcNumber" value={formData.nrcNumber} onChange={handleChange} placeholder="၆ လုံး" maxLength={6} disabled={nrcDisabled} required={!nrcDisabled} className={baseInputClass} />
            </div>
            <div className="mt-3 block">
              <label className="inline-flex items-center gap-3 bg-slate-50 border border-slate-200 px-5 py-3 rounded-xl cursor-pointer hover:bg-slate-100">
                <input type="checkbox" name="nrcPending" checked={formData.nrcPending} onChange={handleChange} className="w-5 h-5 text-indigo-600 rounded border-slate-300" />
                <span className="text-slate-700 font-bold">လျှောက်ထားဆဲ</span>
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block font-bold text-slate-800">မွေးဖွားရာဒေသ: <span className="text-red-500">*</span></label>
            <input type="text" name="birthplace" value={formData.birthplace} onChange={handleChange} className={baseInputClass} placeholder="မွေးဖွားရာမြို့/ဒေသ" required />
          </div>

          <div className="space-y-2">
            <label className="block font-bold text-slate-800">နေရပ်လိပ်စာ: <span className="text-red-500">*</span></label>
            <input type="text" name="address" value={formData.address} onChange={handleChange} className={baseInputClass} placeholder="နေရပ်လိပ်စာ" required />
          </div>

          <div className="space-y-2">
            <label className="block font-bold text-slate-800">ဖုန်းနံပါတ်: <span className="text-red-500">*</span></label>
            <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className={baseInputClass} placeholder="09xxxxxxxxx" required />
          </div>

          <div className="space-y-2">
            <label className="block font-bold text-slate-800">အီးမေးလ်: <span className="text-red-500">*</span></label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} className={baseInputClass} placeholder="example@gmail.com" required />
          </div>

          <div className="space-y-2">
            <label className="block font-bold text-slate-800">ဝင်ခွင့်အမှတ်စဉ်: <span className="text-red-500">*</span></label>
            <input type="text" name="entranceRollNo" value={formData.entranceRollNo} onChange={handleChange} className={baseInputClass} placeholder="ဝင်ခွင့်အမှတ်စဉ် ထည့်ပါ" required />
          </div>

          <div className="space-y-2">
            <label className="block font-bold text-slate-800">တက္ကသိုလ်ဝင်တန်းခုံအမှတ်: <span className="text-red-500">*</span></label>
            <input type="text" name="matricRollNo" value={formData.matricRollNo} onChange={handleChange} className={baseInputClass} placeholder="ခုံအမှတ် ထည့်ပါ" required />
          </div>

          <div className="space-y-2">
            <label className="block font-bold text-slate-800">တက္ကသိုလ်ဝင်တန်းအောင်မြင်သည့်နှစ်: <span className="text-red-500">*</span></label>
            <input type="text" name="matricPassYear" value={formData.matricPassYear} onChange={handleChange} className={baseInputClass} placeholder="ဥပမာ - 2024" required />
          </div>

          <div className="space-y-2">
            <label className="block font-bold text-slate-800">တက္ကသိုလ်ဝင်တန်းစုစုပေါင်းရမှတ်: <span className="text-red-500">*</span></label>
            <input type="number" name="totalMarks" value={formData.totalMarks} onChange={handleChange} className={baseInputClass} placeholder="စုစုပေါင်းရမှတ် ထည့်ပါ" min="0" max="600" required />
          </div>

          <div className="pt-6 mt-8 border-t border-slate-100 flex flex-col md:flex-row gap-4 justify-between">
            <button type="button" className="w-full md:w-auto bg-slate-100 hover:bg-slate-200 text-[#234464] font-bold py-4 px-10 rounded-2xl transition-all" onClick={() => navigate('/')}>
              ← နောက်သို့
            </button>
            <button type="submit" disabled={loading} className="w-full md:w-[200px] text-white font-bold py-4 px-6 rounded-2xl transition-all hover:shadow-lg disabled:opacity-70" style={{ background: 'linear-gradient(140deg, #0f7f86, #0b4f9f)' }}>
              {loading ? 'စာရင်းသွင်းနေသည်...' : '✚ Register'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
\`;

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const outputPath = path.join(outputDir, 'NewStudentRegistration.tsx');
try {
  fs.writeFileSync(outputPath, content);
  console.log('Written to', outputPath);
} catch (e) {
  console.error('Error writing file:', e.message);
  process.exit(1);
}
