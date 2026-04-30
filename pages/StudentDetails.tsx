import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import nrcCatalog from '../data/nrc.json';
import { getStudentSession, persistStudentSession } from '../src/utils/studentStorage';
import '../styles/StudentDetailsForm.css';

const REGISTRATION_CONFIG_STORAGE_KEY = 'registration_form_data';

const SEMESTER_OPTIONS_BY_YEAR: Record<string, string[]> = {
  '1': ['Sem I', 'Sem II'],
  '2': ['Sem III', 'Sem IV'],
  '3': ['Sem V', 'Sem VI'],
  '4': ['Sem VII', 'Sem VIII'],
  '5': ['Sem IX', 'Sem X']
};
const DEFAULT_YEAR_OPTIONS = [
  { value: '1', label: 'Year 1' },
  { value: '2', label: 'Year 2' },
  { value: '3', label: 'Year 3' },
  { value: '4', label: 'Year 4' },
  { value: '5', label: 'Year 5' }
];

const getSemestersForYear = (yearValue: string | number) => SEMESTER_OPTIONS_BY_YEAR[String(yearValue || '').trim()] || [];
const STEP_TO_SECTION: Record<string, number> = {
  start: 1,
  personal: 1,
  contact: 2,
  academic: 3,
  guardian: 4,
  documents: 5,
  declaration: 6
};

const resolveSectionFromStep = (stepParam: string | undefined) => {
  const key = String(stepParam || '').trim().toLowerCase();
  return STEP_TO_SECTION[key] || 1;
};

const asObject = (value: any) => (value && typeof value === 'object' && !Array.isArray(value) ? value : {});

const hasMeaningfulValue = (value: any) => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim() !== '';
  return true;
};

const hasValues = (record: any): boolean => {
  const target = asObject(record);
  return Object.values(target).some((value) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return hasValues(value);
    }
    return hasMeaningfulValue(value);
  });
};

const hasSectionContent = (sections: any) => {
  const target = asObject(sections);
  if (Object.keys(target).length === 0) return false;
  return Object.values(target).some((value) => hasValues(value));
};

const pickFirstValue = (...values: any[]) =>
  values.find((value) => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim() !== '';
    return true;
  });

const toBoolean = (value: any) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.trim().toLowerCase() === 'true';
  return !!value;
};

const registrationIdOf = (record: any) =>
  record?.registrationId ||
  record?.registrationid ||
  record?.registration_id ||
  record?.id ||
  null;

const sortRegistrationsByRecent = (items: any[]) => [...items].sort((a, b) => {
  const aTime = new Date(a?.submittedAt || a?.submitted_at || a?.createdAt || a?.created_at || 0).getTime() || 0;
  const bTime = new Date(b?.submittedAt || b?.submitted_at || b?.createdAt || b?.created_at || 0).getTime() || 0;
  return bTime - aTime;
});

const normalizeRelation = (value: any) => String(value || '').trim().toLowerCase();

const toEnglishDigits = (value: any) =>
  String(value || '')
    .replace(/\u1040/g, '0')
    .replace(/\u1041/g, '1')
    .replace(/\u1042/g, '2')
    .replace(/\u1043/g, '3')
    .replace(/\u1044/g, '4')
    .replace(/\u1045/g, '5')
    .replace(/\u1046/g, '6')
    .replace(/\u1047/g, '7')
    .replace(/\u1048/g, '8')
    .replace(/\u1049/g, '9');

const parseNrcParts = (rawValue: any) => {
  const raw = String(rawValue || '').trim();
  if (!raw) {
    return { region: '', township: '', type: '', number: '' };
  }

  const parts = raw
    .replace(/\s+/g, '')
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 4) {
    return {
      region: toEnglishDigits(parts[0]).replace(/[^0-9]/g, ''),
      township: parts[1] || '',
      type: parts[2] || '',
      number: toEnglishDigits(parts[3]).replace(/[^0-9]/g, '')
    };
  }

  const normalized = raw.replace(/\s+/g, '');
  const fallback = normalized.match(/^([0-9\u1040-\u1049]+)([^()/]+)\(([^()/]+)\)([0-9\u1040-\u1049]{6})$/u);
  if (fallback) {
    return {
      region: toEnglishDigits(fallback[1]).replace(/[^0-9]/g, ''),
      township: fallback[2] || '',
      type: fallback[3] || '',
      number: toEnglishDigits(fallback[4]).replace(/[^0-9]/g, '')
    };
  }

  return { region: '', township: '', type: '', number: '' };
};

const parseDateParts = (rawDate: any) => {
  const raw = String(rawDate || '').trim();
  if (!raw) {
    return { dobDay: '', dobMonth: '', dobYear: '' };
  }
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    return {
      dobYear: iso[1],
      dobMonth: String(Number(iso[2])),
      dobDay: String(Number(iso[3]))
    };
  }
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return { dobDay: '', dobMonth: '', dobYear: '' };
  }
  return {
    dobDay: String(date.getDate()),
    dobMonth: String(date.getMonth() + 1),
    dobYear: String(date.getFullYear())
  };
};


};

const DataField: React.FC<{ label: string; value: string | number; placeholder?: string }> = ({ label, value, placeholder = 'N/A' }) => (
  <div className="space-y-1.5">
    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">{label}</p>
    <p className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">{value || placeholder}</p>
  </div>
);

const StudentDetails: React.FC<{ user?: any; onLogout?: () => void }> = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { step } = useParams<{ step?: string }>();
  const [student, setStudent] = useState<any>(null);
  const [registrationConfig, setRegistrationConfig] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [currentSection, setCurrentSection] = useState(() => resolveSectionFromStep(step));

  useEffect(() => {
    setCurrentSection(resolveSectionFromStep(step));
  }, [step]);

  // Form data for all sections
  const [formData, setFormData] = useState<any>({
    // Section 1: Student Info
    passportPhoto: null,
    passportPhotoPreview: '',
    studentNameMM: '',
    studentNameEN: '',
    nrcNumber: '',
    nrcFrontImage: null,
    nrcFrontPreview: '',
    nrcBackImage: null,
    nrcBackPreview: '',
    religion: '',
    ethnic: '',
    birthplace: '',
    bloodType: '',
    currentYear: '',
    academicSemester: '',
    major: '',
    dobDay: '',
    dobMonth: '',
    dobYear: '',
    phone: '',
    email: '',
    address: '',

    // Section 2: Father Info
    fatherNameMM: '',
    fatherNameEN: '',
    fatherOccupation: '',
    fatherNrcRegion: '',
    fatherNrcTownship: '',
    fatherNrcType: '',
    fatherNrcNumber: '',
    fatherNrcFront: null,
    fatherNrcFrontPreview: '',
    fatherNrcBack: null,
    fatherNrcBackPreview: '',
    fatherReligion: '',
    fatherEthnic: '',
    fatherBirthplace: '',
    fatherAddress: '',
    fatherPhone: '',

    // Section 3: Mother Info
    motherNameMM: '',
    motherNameEN: '',
    motherOccupation: '',
    motherNrcRegion: '',
    motherNrcTownship: '',
    motherNrcType: '',
    motherNrcNumber: '',
    motherNrcFront: null,
    motherNrcFrontPreview: '',
    motherNrcBack: null,
    motherNrcBackPreview: '',
    motherReligion: '',
    motherEthnic: '',
    motherBirthplace: '',
    motherAddress: '',
    motherPhone: '',

    // Section 4: Parent Agreement
    financialSupporter: '', // 'father', 'mother', 'other'
    needsFinancialAid: false,
    needsHostel: false,
    familyRegistrationPhoto: null,
    familyRegistrationPreview: '',

    // Section 5: School Terms
    schoolTermsAccepted: false,

    // Section 6: Student Confession
    confessionAccepted: false
  });

  const nrcTypes = [
    '\u1014\u102D\u102F\u1004\u103A',
    '\u1027\u100A\u1037\u103A',
    '\u1015\u103C\u102F'
  ];
  const toMyanmarDigits = (value: any) =>
    String(value).replace(/[0-9]/g, (d) => '\u1040\u1041\u1042\u1043\u1044\u1045\u1046\u1047\u1048\u1049'[Number(d)]);
  const nrcRegions = Array.from(new Set(nrcCatalog.map((row: any) => String(row.state_code).trim())))
    .sort((a, b) => Number(a) - Number(b));
  const getTownshipsByRegion = (region: string) => nrcCatalog
    .filter((row: any) => String(row.state_code).trim() === region)
    .map((row: any) => ({
      code: String(row.township_code_mm || '').trim(),
      nameMm: String(row.township_mm || '').trim(),
      nameEn: String(row.township_en || '').trim()
    }))
    .filter((row: any) => row.code)
    .sort((a: any, b: any) => a.code.localeCompare(b.code));
  const fatherTownships = getTownshipsByRegion(formData.fatherNrcRegion);
  const motherTownships = getTownshipsByRegion(formData.motherNrcRegion);
  const [yearOptions, setYearOptions] = useState(DEFAULT_YEAR_OPTIONS);
  const semesterOptions = getSemestersForYear(formData.currentYear);
  useEffect(() => {
    let cancelled = false;

    // Load latest registration configuration (years/majors) from Configure Registration tab
    try {
      const raw = localStorage.getItem(REGISTRATION_CONFIG_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const array = Array.isArray(parsed) ? parsed : [parsed];
        if (array.length > 0) {
          const latest = array[array.length - 1];
          if (latest && latest.header && latest.yearlyConfig) {
            setRegistrationConfig(latest);
            const totalYears = Number(latest.header.totalYears || 0);
            if (totalYears > 0) {
              const limitedDefaults = DEFAULT_YEAR_OPTIONS.slice(0, totalYears);
              setYearOptions(
                limitedDefaults.length ? limitedDefaults : DEFAULT_YEAR_OPTIONS.slice(0, totalYears)
              );
            }
          }
        }
      }
    } catch {
      // Ignore config parse errors and fall back to defaults
    }

    const hydrateStudent = async () => {
      const parsedStudent = getStudentSession();
      if (!parsedStudent) {
        alert('Please login first.');
        navigate('/login');
        return;
      }

      let resolvedStudent = parsedStudent;

// Refresh student from backend to avoid stale local IDs causing 404 on submit.
       if (parsedStudent?.email) {
         try {
           const candidates = await api.getStudents(parsedStudent.email, { backend: 'spring' });
          if (Array.isArray(candidates) && candidates.length > 0) {
            const sameId = candidates.find((candidate) => (candidate.studentid || candidate.id) === (parsedStudent.studentid || parsedStudent.id));
            const latest = [...candidates].sort((a, b) => {
              const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
              const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
              return bDate - aDate;
            })[0];
            resolvedStudent = sameId || latest || parsedStudent;
          }
        } catch (error) {
          resolvedStudent = parsedStudent;
        }
      }

      const studentId = resolvedStudent?.studentid || resolvedStudent?.id;
      let parents: any[] = [];
      let registrationSections: any = {};

      if (studentId) {
        const [parentsResult, registrationsResult] = await Promise.allSettled([
          api.listParents(studentId),
          api.listRegistrations(studentId)
        ]);

        if (parentsResult.status === 'fulfilled' && Array.isArray(parentsResult.value)) {
          parents = parentsResult.value;
        }

        const seenRegistrationIds = new Set();
        const candidateRegistrationIds: any[] = [];
        const addRegistrationCandidate = (registrationId: any) => {
          if (!registrationId) return;
          const normalized = String(registrationId);
          if (seenRegistrationIds.has(normalized)) return;
          seenRegistrationIds.add(normalized);
          candidateRegistrationIds.push(registrationId);
        };

        addRegistrationCandidate(registrationIdOf(resolvedStudent));

        if (registrationsResult.status === 'fulfilled' && Array.isArray(registrationsResult.value)) {
          const sortedRegistrations = sortRegistrationsByRecent(registrationsResult.value);
          sortedRegistrations.forEach((item) => addRegistrationCandidate(registrationIdOf(item)));
        }

        for (const registrationId of candidateRegistrationIds) {
          try {
            const payload = asObject(await api.getRegistrationSections(registrationId));
            if (hasSectionContent(payload)) {
              registrationSections = payload;
              break;
            }
            if (Object.keys(registrationSections).length === 0 && Object.keys(payload).length > 0) {
              registrationSections = payload;
            }
          } catch (sectionError: any) {
            if (sectionError?.status !== 404) {
              console.warn('Failed to hydrate registration sections:', sectionError);
            }
          }
        }
      }

      if (cancelled) return;

      setStudent(resolvedStudent);
      persistStudentSession(resolvedStudent);

      const personal = asObject(registrationSections.personal);
      const contact = asObject(registrationSections.contact);
      const academic = asObject(registrationSections.academic);
      const guardian = asObject(registrationSections.guardian);
      const documents = asObject(registrationSections.documents);
      const declaration = asObject(registrationSections.declaration);

      const fatherDraft = asObject(guardian.father);
      const motherDraft = asObject(guardian.mother);
      const fatherById = parents.find((parent) => String(parent?.id || parent?.parentid || '') === String(resolvedStudent?.father_id || resolvedStudent?.fatherId || ''));
      const motherById = parents.find((parent) => String(parent?.id || parent?.parentid || '') === String(resolvedStudent?.mother_id || resolvedStudent?.motherId || ''));
      const fatherByRelation = parents.find((parent) => normalizeRelation(parent?.relation) === 'father');
      const motherByRelation = parents.find((parent) => normalizeRelation(parent?.relation) === 'mother');
      const father = hasValues(fatherDraft) ? fatherDraft : (fatherById || fatherByRelation || {});
      const mother = hasValues(motherDraft) ? motherDraft : (motherById || motherByRelation || {});

      const fatherNrcParts = parseNrcParts(pickFirstValue(father?.nrcNumber, father?.nrc_number));
      const motherNrcParts = parseNrcParts(pickFirstValue(mother?.nrcNumber, mother?.nrc_number));
      const dateParts = parseDateParts(
        pickFirstValue(personal?.dateOfBirth, personal?.date_of_birth, resolvedStudent?.date_of_birth, resolvedStudent?.dateOfBirth)
      );

      const passportPhotoUrl = pickFirstValue(
        documents?.passportPhoto,
        documents?.passportPhotoUrl,
        documents?.passport_photo,
        resolvedStudent?.passportphoto,
        resolvedStudent?.passportPhoto,
        resolvedStudent?.passport_photo
      );
      const nrcFrontUrl = pickFirstValue(
        documents?.studentNrcFront,
        documents?.nrcFrontImage,
        documents?.nrc_front_image,
        resolvedStudent?.nrcfrontimage,
        resolvedStudent?.nrcFrontImage,
        resolvedStudent?.nrc_front_image
      );
      const nrcBackUrl = pickFirstValue(
        documents?.studentNrcBack,
        documents?.nrcBackImage,
        documents?.nrc_back_image,
        resolvedStudent?.nrcbackimage,
        resolvedStudent?.nrcBackImage,
        resolvedStudent?.nrc_back_image
      );
      const fatherNrcFrontUrl = pickFirstValue(
        documents?.fatherNrcFront,
        documents?.father_nrc_front,
        father?.nrcFrontImage,
        father?.nrc_front_image
      );
      const fatherNrcBackUrl = pickFirstValue(
        documents?.fatherNrcBack,
        documents?.father_nrc_back,
        father?.nrcBackImage,
        father?.nrc_back_image
      );
      const motherNrcFrontUrl = pickFirstValue(
        documents?.motherNrcFront,
        documents?.mother_nrc_front,
        mother?.nrcFrontImage,
        mother?.nrc_front_image
      );
      const motherNrcBackUrl = pickFirstValue(
        documents?.motherNrcBack,
        documents?.mother_nrc_back,
        mother?.nrcBackImage,
        mother?.nrc_back_image
      );
      const familyRegistrationUrl = pickFirstValue(
        documents?.familyRegistration,
        documents?.family_registration
      );

      const studentYear = pickFirstValue(resolvedStudent?.currentyear, resolvedStudent?.currentYear);
      const sectionYear = pickFirstValue(academic?.currentYear, academic?.current_year);
      const resolvedYear = hasMeaningfulValue(studentYear)
        ? String(studentYear)
        : (hasMeaningfulValue(sectionYear) ? String(sectionYear) : '');
      const allowedSemesters = getSemestersForYear(resolvedYear);
      const studentSemester = pickFirstValue(resolvedStudent?.academic_semester, resolvedStudent?.academicSemester);
      const sectionSemester = pickFirstValue(academic?.academicSemester, academic?.academic_semester);
      const semesterCandidate = String(pickFirstValue(studentSemester, sectionSemester) || '');
      const normalizedSemester = allowedSemesters.includes(semesterCandidate) ? semesterCandidate : '';

      const financialSupporterCandidate = String(
        pickFirstValue(guardian?.financialSupporter, guardian?.financial_supporter) || ''
      ).trim().toLowerCase();
      const financialSupporter = ['father', 'mother', 'other'].includes(financialSupporterCandidate)
        ? financialSupporterCandidate
        : '';

      setFormData((prev: any) => ({
        ...prev,
        passportPhoto: passportPhotoUrl || null,
        passportPhotoPreview: passportPhotoUrl || '',
        studentNameMM: pickFirstValue(
          personal?.nameMm,
          personal?.nameMM,
          personal?.studentNameMM,
          personal?.name_mm,
          resolvedStudent?.namemm,
          resolvedStudent?.name_mm
        ) || '',
        studentNameEN: pickFirstValue(
          personal?.nameEn,
          personal?.nameEN,
          personal?.studentNameEN,
          personal?.name_en,
          resolvedStudent?.nameen,
          resolvedStudent?.name_en
        ) || '',
        nrcNumber: pickFirstValue(personal?.nrcNumber, personal?.nrc_number, resolvedStudent?.nrc_number, resolvedStudent?.nrcNumber) || '',
        nrcFrontImage: nrcFrontUrl || null,
        nrcFrontPreview: nrcFrontUrl || '',
        nrcBackImage: nrcBackUrl || null,
        nrcBackPreview: nrcBackUrl || '',
        religion: pickFirstValue(personal?.religion, resolvedStudent?.religion) || '',
        ethnic: pickFirstValue(personal?.ethnic, resolvedStudent?.ethnic) || '',
        birthplace: pickFirstValue(personal?.birthplace, resolvedStudent?.birthplace) || '',
        bloodType: pickFirstValue(personal?.bloodType, personal?.blood_type, resolvedStudent?.bloodType, resolvedStudent?.blood_type) || '',
        currentYear: resolvedYear,
        academicSemester: normalizedSemester,
        major: pickFirstValue(academic?.major, academic?.major_code, resolvedStudent?.major) || '',
        dobDay: dateParts.dobDay,
        dobMonth: dateParts.dobMonth,
        dobYear: dateParts.dobYear,
        phone: pickFirstValue(contact?.phone, resolvedStudent?.phone) || '',
        email: pickFirstValue(contact?.email, resolvedStudent?.email) || '',
        address: pickFirstValue(contact?.address, resolvedStudent?.address) || '',
        fatherNameMM: pickFirstValue(father?.nameMm, father?.nameMM, father?.name_mm, father?.full_name) || '',
        fatherNameEN: pickFirstValue(father?.nameEn, father?.nameEN, father?.full_name, father?.nameMm, father?.nameMM) || '',
        fatherOccupation: pickFirstValue(father?.occupation, father?.job_position) || '',
        fatherNrcRegion: fatherNrcParts.region || '',
        fatherNrcTownship: fatherNrcParts.township || '',
        fatherNrcType: fatherNrcParts.type || '',
        fatherNrcNumber: fatherNrcParts.number || '',
        fatherNrcFront: fatherNrcFrontUrl || null,
        fatherNrcFrontPreview: fatherNrcFrontUrl || '',
        fatherNrcBack: fatherNrcBackUrl || null,
        fatherNrcBackPreview: fatherNrcBackUrl || '',
        fatherReligion: pickFirstValue(father?.religion) || '',
        fatherEthnic: pickFirstValue(father?.ethnic) || '',
        fatherBirthplace: pickFirstValue(father?.birthplace) || '',
        fatherAddress: pickFirstValue(father?.address) || '',
        fatherPhone: pickFirstValue(father?.phone, father?.phone_number) || '',
        motherNameMM: pickFirstValue(mother?.nameMm, mother?.nameMM, mother?.name_mm, mother?.full_name) || '',
        motherNameEN: pickFirstValue(mother?.nameEn, mother?.nameEN, mother?.full_name, mother?.nameMm, mother?.nameMM) || '',
        motherOccupation: pickFirstValue(mother?.occupation, mother?.job_position) || '',
        motherNrcRegion: motherNrcParts.region || '',
        motherNrcTownship: motherNrcParts.township || '',
        motherNrcType: motherNrcParts.type || '',
        motherNrcNumber: motherNrcParts.number || '',
        motherNrcFront: motherNrcFrontUrl || null,
        motherNrcFrontPreview: motherNrcFrontUrl || '',
        motherNrcBack: motherNrcBackUrl || null,
        motherNrcBackPreview: motherNrcBackUrl || '',
        motherReligion: pickFirstValue(mother?.religion) || '',
        motherEthnic: pickFirstValue(mother?.ethnic) || '',
        motherBirthplace: pickFirstValue(mother?.birthplace) || '',
        motherAddress: pickFirstValue(mother?.address) || '',
        motherPhone: pickFirstValue(mother?.phone, mother?.phone_number) || '',
        financialSupporter,
        needsFinancialAid: toBoolean(
          pickFirstValue(guardian?.needsFinancialAid, guardian?.needs_financial_aid, resolvedStudent?.is_benefit_student, resolvedStudent?.isBenefitStudent)
        ),
        needsHostel: toBoolean(
          pickFirstValue(guardian?.needsHostel, guardian?.needs_hostel, resolvedStudent?.is_hostel_student, resolvedStudent?.isHostelStudent)
        ),
        familyRegistrationPhoto: familyRegistrationUrl || null,
        familyRegistrationPreview: familyRegistrationUrl || '',
        schoolTermsAccepted: toBoolean(pickFirstValue(declaration?.schoolTermsAccepted, declaration?.school_terms_accepted)),
        confessionAccepted: toBoolean(pickFirstValue(declaration?.confessionAccepted, declaration?.confession_accepted))
      }));
    };

    hydrateStudent();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const getMajorsForYear = (yearValue: string | number) => {
    if (!registrationConfig || !registrationConfig.yearlyConfig) {
      // Fallback majors if admin has not configured any
      return ['KE', 'SE', 'HPC', 'Csec', 'BIS', 'ES', 'CN'];
    }
    const yearNum = Number(String(yearValue || '').trim() || 0);
    if (!yearNum) return [];
    const match = registrationConfig.yearlyConfig.find(
      (y: any) => Number(y.yearLevel) === yearNum
    );
    if (!match || !Array.isArray(match.majors)) {
      return [];
    }
    return match.majors;
  };

  const majorsForSelectedYear = getMajorsForYear(formData.currentYear);

  // Handle text input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    const nextValue = type === 'checkbox' ? checked : value;
    const allowedSemestersForSelectedYear = name === 'currentYear'
      ? getSemestersForYear(nextValue)
      : getSemestersForYear(formData.currentYear);
    setFormData({
      ...formData,
      [name]: nextValue,
      ...(name === 'fatherNrcRegion' ? { fatherNrcTownship: '' } : {}),
      ...(name === 'motherNrcRegion' ? { motherNrcTownship: '' } : {}),
      ...(name === 'currentYear' ? { major: '' } : {}),
      ...(name === 'currentYear' && !allowedSemestersForSelectedYear.includes(formData.academicSemester)
        ? { academicSemester: '' }
        : {})
    });
  };

  // Handle file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fieldName: string, previewName: string) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        alert('ဖိုင်အရွယ်အစား 2MB ထက်မကျော်ရပါ!');
        return;
      }

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({
          ...formData,
          [fieldName]: file,
          [previewName]: reader.result
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const fileToDataUrl = (file: File) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });

  const resolveDocumentUrl = (result: any, fallbackUrl: string) =>
    result?.fileUrl ||
    result?.url ||
    result?.publicUrl ||
    result?.path ||
    result?.data?.fileUrl ||
    fallbackUrl;

  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const upsertSectionWithRetry = async (registrationId: string | number, section: string, payload: any, maxAttempts = 2) => {
    let lastError = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        return await api.upsertSection(registrationId, section, payload);
      } catch (error: any) {
        lastError = error;
        const isRetryableServerError = typeof error?.status === 'number' && error.status >= 500;
        if (!isRetryableServerError || attempt >= maxAttempts) {
          break;
        }
        await delay(400 * attempt);
      }
    }
    throw lastError;
  };

  // Upload file through backend document API (persisted by backend/Supabase integration)
  const uploadImage = async (file: any, docType: string, studentId: string | number) => {
    if (!file) return null;
    if (typeof file === 'string') return file;
    if (typeof Blob !== 'undefined' && !(file instanceof Blob)) {
      return null;
    }

    const dataUrl = await fileToDataUrl(file);
    const savedDoc = await api.upsertStudentDocument({
      studentId,
      docType,
      fileName: file.name,
      mimeType: file.type,
      fileSize: file.size,
      fileUrl: dataUrl
    });
    return resolveDocumentUrl(savedDoc, dataUrl as string);
  };

  const getRegistrationId = (registration: any) =>
    registration?.id ||
    registration?.registrationId ||
    registration?.registration_id ||
    null;

  const resolveRegistrationId = async (studentRecord: any, studentId: string | number) => {
    const direct = studentRecord?.registrationId || studentRecord?.registrationid || studentRecord?.registration_id;
    if (direct) {
      try {
        await api.getRegistrationSections(direct);
        return direct;
      } catch (error: any) {
        if (error?.status !== 404) {
          throw error;
        }
      }
    }

    let registrations: any[] = [];
    try {
      registrations = await api.listRegistrations(studentId);
    } catch (error) {
      registrations = [];
    }

    if (Array.isArray(registrations) && registrations.length > 0) {
      const sorted = sortRegistrationsByRecent(registrations);
      const preferred = sorted.find((item) => String(item?.status || '').toUpperCase() !== 'REJECTED') || sorted[0];
      const existingId = getRegistrationId(preferred);
      if (existingId) {
        return existingId;
      }
    }

    const createdRegistration = await api.createRegistration({
      studentId,
      student_user_id: studentRecord?.userid || studentRecord?.userId || studentId,
      semester_id: studentRecord?.semesterid || studentRecord?.semesterId || null,
      status: 'PENDING'
    });
    const createdId = getRegistrationId(createdRegistration);
    if (!createdId) {
      throw new Error('Registration creation succeeded but ID was not returned.');
    }
    return createdId;
  };

  // Validate current section
  const validateSection = (section: number) => {
    switch (section) {
      case 1:
        if (!formData.passportPhoto) {
          alert('ကျေးဇူးပြု၍ ပတ်စ်ပို့ဓာတ်ပုံ တင်ပါ');
          return false;
        }
        if (!formData.studentNameMM || !formData.studentNameEN) {
          alert('ကျေးဇူးပြု၍ အမည် အပြည့်အစုံဖြည့်ပါ');
          return false;
        }
        if (!formData.nrcFrontImage || !formData.nrcBackImage) {
          alert('ကျေးဇူးပြု၍ မှတ်ပုံတင် ဓာတ်ပုံ (ရှေ့/နောက်) တင်ပါ');
          return false;
        }
        if (!formData.currentYear || !formData.academicSemester) {
          alert('Please select year and semester.');
          return false;
        }
        {
          const allowedSemesters = getSemestersForYear(formData.currentYear);
          if (!allowedSemesters.includes(formData.academicSemester)) {
            alert(`Selected semester is invalid for Year ${formData.currentYear}. Please choose: ${allowedSemesters.join(' or ')}.`);
            return false;
          }
        }
        if (majorsForSelectedYear.length > 0 && !formData.major) {
          alert('Please select a major.');
          return false;
        }
        break;
      case 2:
        if (!formData.fatherNameMM || !formData.fatherNameEN) {
          alert('ကျေးဇူးပြု၍ အဖအမည် အပြည့်အစုံဖြည့်ပါ');
          return false;
        }
        if (!formData.fatherNrcRegion || !formData.fatherNrcTownship || !formData.fatherNrcType || !formData.fatherNrcNumber) {
          alert('Please complete father NRC fields.');
          return false;
        }
        if (!fatherTownships.some((t: any) => t.code === formData.fatherNrcTownship)) {
          alert('Father NRC township is invalid for the selected region.');
          return false;
        }
        if (!/^[0-9\u1040-\u1049]{6}$/.test(formData.fatherNrcNumber)) {
          alert('Father NRC number must be 6 digits.');
          return false;
        }
        if (!formData.fatherNrcFront || !formData.fatherNrcBack) {
          alert('ကျေးဇူးပြု၍ အဖ၏မှတ်ပုံတင် ဓာတ်ပုံ တင်ပါ');
          return false;
        }
        break;
      case 3:
        if (!formData.motherNameMM || !formData.motherNameEN) {
          alert('ကျေးဇူးပြု၍ အမေအမည် အပြည့်အစုံဖြည့်ပါ');
          return false;
        }
        if (!formData.motherNrcRegion || !formData.motherNrcTownship || !formData.motherNrcType || !formData.motherNrcNumber) {
          alert('Please complete mother NRC fields.');
          return false;
        }
        if (!motherTownships.some((t: any) => t.code === formData.motherNrcTownship)) {
          alert('Mother NRC township is invalid for the selected region.');
          return false;
        }
        if (!/^[0-9\u1040-\u1049]{6}$/.test(formData.motherNrcNumber)) {
          alert('Mother NRC number must be 6 digits.');
          return false;
        }
        if (!formData.motherNrcFront || !formData.motherNrcBack) {
          alert('ကျေးဇူးပြု၍ အမေ၏မှတ်ပုံတင် ဓာတ်ပုံ တင်ပါ');
          return false;
        }
        break;
      case 4:
        if (!formData.financialSupporter) {
          alert('ကျေးဇူးပြု၍ ငွေကြေးထောက်ပံ့သူ ရွေးချယ်ပါ');
          return false;
        }
        if (formData.needsHostel && !formData.familyRegistrationPhoto) {
          alert('Please upload family registration photo when hostel is required.');
          return false;
        }
        break;
      case 5:
        if (!formData.schoolTermsAccepted) {
          alert('ကျေးဇူးပြု၍ ကျောင်းစည်းကမ်းများကို သဘောတူပါ');
          return false;
        }
        break;
      case 6:
        if (!formData.confessionAccepted) {
          alert('ကျေးဇူးပြု၍ ကတိသစ္စာ သဘောတူပါ');
          return false;
        }
        break;
      default:
        return true;
    }
    return true;
  };

  // Next section
  const handleNext = () => {
    if (validateSection(currentSection)) {
      setCurrentSection(currentSection + 1);
      window.scrollTo(0, 0);
    }
  };

  // Previous section
  const handlePrevious = () => {
    setCurrentSection(currentSection - 1);
    window.scrollTo(0, 0);
  };

// Submit entire form
const handleSubmit = async () => {
  // Validate all sections before submitting
  for (let section = 1; section <= 6; section++) {
    if (!validateSection(section)) {
      // Focus on the first invalid section (optional enhancement)
      setCurrentSection(section);
      return;
    }
  }

  const confirm = window.confirm('သင့်အချက်အလက်များ အပြည့်အစုံ ဖြည့်သွင်းပြီးပြီးပါပြီလား?\n\nတင်သွင်းမည်လား?');
  if (!confirm) return;

  setLoading(true);

    try {
      const studentId = student.studentid || student.id;
      if (!studentId) {
        throw new Error('Student ID not found. Please log in again.');
      }
      const registrationId = await resolveRegistrationId(student, studentId);
      if (!registrationId) {
        throw new Error('Registration record not found. Please contact admin.');
      }

      console.log('Starting upload process...');

      // Upload all images
      const passportPhotoUrl = await uploadImage(formData.passportPhoto, 'PASSPORT_PHOTO', studentId);
      const nrcFrontUrl = await uploadImage(formData.nrcFrontImage, 'NRC_FRONT', studentId);
      const nrcBackUrl = await uploadImage(formData.nrcBackImage, 'NRC_BACK', studentId);
      const fatherNrcFrontUrl = await uploadImage(formData.fatherNrcFront, 'FATHER_NRC_FRONT', studentId);
      const fatherNrcBackUrl = await uploadImage(formData.fatherNrcBack, 'FATHER_NRC_BACK', studentId);
      const motherNrcFrontUrl = await uploadImage(formData.motherNrcFront, 'MOTHER_NRC_FRONT', studentId);
      const motherNrcBackUrl = await uploadImage(formData.motherNrcBack, 'MOTHER_NRC_BACK', studentId);
      const familyRegUrl = formData.needsHostel
        ? await uploadImage(formData.familyRegistrationPhoto, 'FAMILY_REGISTRATION', studentId)
        : null;
      const fatherNrcString = `${toMyanmarDigits(formData.fatherNrcRegion)}/${formData.fatherNrcTownship}/${formData.fatherNrcType}/${formData.fatherNrcNumber}`;
      const motherNrcString = `${toMyanmarDigits(formData.motherNrcRegion)}/${formData.motherNrcTownship}/${formData.motherNrcType}/${formData.motherNrcNumber}`;

      console.log('Images uploaded successfully!');

      const dateOfBirth =
        formData.dobYear && formData.dobMonth && formData.dobDay
          ? `${String(formData.dobYear).padStart(4, '0')}-${String(formData.dobMonth).padStart(2, '0')}-${String(formData.dobDay).padStart(2, '0')}`
          : null;

      const personalPayload = {
        nameMm: formData.studentNameMM,
        nameEn: formData.studentNameEN,
        nrcNumber: formData.nrcNumber,
        religion: formData.religion,
        ethnic: formData.ethnic,
        birthplace: formData.birthplace,
        bloodType: formData.bloodType,
        dateOfBirth: dateOfBirth || ''
      };

      const contactPayload = {
        phone: formData.phone,
        email: formData.email,
        address: formData.address
      };

      const academicPayload = {
        currentYear: formData.currentYear ? Number(formData.currentYear) : null,
        academicSemester: formData.academicSemester || '',
        major: majorsForSelectedYear.length > 0 ? formData.major : ''
      };

      const guardianPayload = {
        father: {
          nameMm: formData.fatherNameMM,
          nameEn: formData.fatherNameEN,
          occupation: formData.fatherOccupation,
          nrcNumber: fatherNrcString,
          religion: formData.fatherReligion,
          ethnic: formData.fatherEthnic,
          birthplace: formData.fatherBirthplace,
          address: formData.fatherAddress,
          phone: formData.fatherPhone
        },
        mother: {
          nameMm: formData.motherNameMM,
          nameEn: formData.motherNameEN,
          occupation: formData.motherOccupation,
          nrcNumber: motherNrcString,
          religion: formData.motherReligion,
          ethnic: formData.motherEthnic,
          birthplace: formData.motherBirthplace,
          address: formData.motherAddress,
          phone: formData.motherPhone
        },
        financialSupporter: formData.financialSupporter || '',
        needsFinancialAid: !!formData.needsFinancialAid,
        needsHostel: !!formData.needsHostel
      };

      const documentsPayload = {
        passportPhoto: passportPhotoUrl || '',
        studentNrcFront: nrcFrontUrl || '',
        studentNrcBack: nrcBackUrl || '',
        fatherNrcFront: fatherNrcFrontUrl || '',
        fatherNrcBack: fatherNrcBackUrl || '',
        motherNrcFront: motherNrcFrontUrl || '',
        motherNrcBack: motherNrcBackUrl || '',
        familyRegistration: familyRegUrl || ''
      };

      const declarationPayload = {
        schoolTermsAccepted: !!formData.schoolTermsAccepted,
        confessionAccepted: !!formData.confessionAccepted,
        submittedAt: new Date().toISOString()
      };

      const sectionsToSave = [
        ['personal', personalPayload],
        ['contact', contactPayload],
        ['academic', academicPayload],
        ['guardian', guardianPayload],
        ['documents', documentsPayload],
        ['declaration', declarationPayload]
      ];
      for (const [sectionName, payload] of sectionsToSave) {
        await upsertSectionWithRetry(registrationId, sectionName, payload, 2);
      }
      console.log('Form sections data inserted');

      const updatedStudentFromApi = await api.updateStudent(studentId, {
        status: 'DETAILS_SUBMITTED',
        nameMm: formData.studentNameMM || student.namemm || '',
        nameEn: formData.studentNameEN || student.nameen || '',
        nrcNumber: formData.nrcNumber || student.nrc_number || '',
        dateOfBirth: dateOfBirth || student.date_of_birth || null,
        religion: formData.religion || '',
        ethnic: formData.ethnic || '',
        birthplace: formData.birthplace || student.birthplace || '',
        bloodType: formData.bloodType || '',
        phone: formData.phone || '',
        email: formData.email || student.email || '',
        address: formData.address || '',
        currentYear: formData.currentYear
          ? Number(formData.currentYear)
          : (student.currentyear ?? student.currentYear ?? null),
        academicSemester: formData.academicSemester || student.academic_semester || '',
        major: majorsForSelectedYear.length > 0
          ? (formData.major || '')
          : (student.major || ''),
        fatherName: formData.fatherNameMM || formData.fatherNameEN || student.father_name || '',
        motherName: formData.motherNameMM || formData.motherNameEN || student.mother_name || '',
        isBenefitStudent: !!formData.needsFinancialAid,
        isHostelStudent: !!formData.needsHostel,
        passportPhoto: passportPhotoUrl || student.passportphoto || '',
        nrcFrontImage: nrcFrontUrl || student.nrcfrontimage || '',
        nrcBackImage: nrcBackUrl || student.nrcbackimage || '',
        divisionOrState: student.division_or_state || student.divisionOrState || '',
        township: student.township || ''
      });
      console.log('Student status updated');

      alert('✅ အချက်အလက်များ အောင်မြင်စွာ တင်သွင်းပြီးပါပြီ!\n\nအက်ဒမင်မှ စစ်ဆေးပြီး အတည်ပြုပေးပါမည်။');

      // Update localStorage
      const updatedStudent = {
        ...student,
        ...(updatedStudentFromApi || {}),
        registrationId,
        status: 'DETAILS_SUBMITTED'
      };
      setStudent(updatedStudent);
      persistStudentSession(updatedStudent);

      // Navigate back to dashboard
      navigate('/student/dashboard');

    } catch (error: any) {
      console.error('Submit error:', error);
      const endpoint = error?.path ? `\nEndpoint: ${error.method || 'GET'} ${error.path}` : '';
      alert('Submit failed.\n\n' + error.message + endpoint);
    } finally {
      setLoading(false);
    }
  };

  if (!student) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-teal-600 rounded-full animate-spin" />
          <p className="text-slate-500 font-black uppercase tracking-widest text-[10px] animate-pulse">{t('Loading...')}</p>
        </div>
      </div>
    );
  }

  const sections = [
    { id: 1, label: t('Section 1: Student Information'), icon: 'person' },
    { id: 2, label: t('Section 2: Father\'s Information'), icon: 'hail' },
    { id: 3, label: t('Section 3: Mother\'s Information'), icon: 'woman' },
    { id: 4, label: t('Section 4: Parent Agreement Form'), icon: 'handshake' },
    { id: 5, label: t('Section 5: School Terms and Conditions'), icon: 'gavel' },
    { id: 6, label: t('Section 6: Student Confession'), icon: 'verified_user' },
  ];

  const currentSectionData = sections.find(s => s.id === currentSection);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans selection:bg-teal-600 selection:text-white pb-20">
      {/* BACKGROUND ACCENTS */}
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-teal-500/[0.03] dark:bg-teal-500/[0.02] rounded-full blur-[100px] pointer-events-none translate-x-1/2 -translate-y-1/2" />
      <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-indigo-500/[0.03] dark:bg-indigo-500/[0.02] rounded-full blur-[100px] pointer-events-none -translate-x-1/2 translate-y-1/2" />

      {/* HEADER */}
      <header className="h-24 flex items-center justify-between px-10 border-b border-slate-200/60 dark:border-slate-800/60 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg">
            <span className="material-icons-round text-white">school</span>
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase leading-none mb-1">{t('Student Details Form')}</h1>
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('Complete your student information')}</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-full border border-slate-200/50 dark:border-slate-700/50">
            <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
            <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">
              {t('Step')} {currentSection} / 6
            </span>
          </div>
          <button 
            onClick={() => navigate('/student/dashboard')}
            className="w-10 h-10 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-all text-slate-400 hover:text-slate-900 active:scale-90"
          >
            <span className="material-icons-round">close</span>
          </button>
        </div>
      </header>

      {/* PROGRESS TIMELINE */}
      <div className="max-w-5xl mx-auto px-10 py-12">
        <div className="relative flex justify-between">
          <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-200 dark:bg-slate-800 -translate-y-1/2 z-0" />
          <div 
            className="absolute top-1/2 left-0 h-0.5 bg-teal-600 -translate-y-1/2 z-0 transition-all duration-700 ease-out" 
            style={{ width: `${((currentSection - 1) / 5) * 100}%` }}
          />
          
          {sections.map((s) => (
            <div key={s.id} className="relative z-10 flex flex-col items-center gap-3">
              <button
                onClick={() => currentSection > s.id && setCurrentSection(s.id)}
                disabled={currentSection <= s.id}
                className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                  currentSection === s.id 
                    ? 'bg-slate-900 text-white shadow-xl scale-110' 
                    : currentSection > s.id 
                      ? 'bg-teal-600 text-white' 
                      : 'bg-white dark:bg-slate-900 text-slate-300 dark:text-slate-600 border border-slate-100 dark:border-slate-800'
                }`}
              >
                <span className="material-icons-round text-lg">{s.icon}</span>
              </button>
              <span className={`text-[9px] font-black uppercase tracking-widest hidden lg:block ${
                currentSection === s.id ? 'text-slate-900 dark:text-white' : 'text-slate-400'
              }`}>
                {t('Section')} {s.id}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* MAIN FORM CARD */}
      <main className="max-w-4xl mx-auto px-6">
        <div className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-2xl shadow-slate-200/50 dark:shadow-none p-10 relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
          
          {/* Section Header */}
          <div className="flex items-center gap-6 mb-12">
            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-3xl flex items-center justify-center border border-slate-100 dark:border-slate-700 shadow-inner">
              <span className="material-icons-round text-3xl text-teal-600">{currentSectionData?.icon}</span>
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{currentSectionData?.label}</h2>
              <p className="text-sm font-medium text-slate-400 dark:text-slate-500">{t('Provide your personal details')}</p>
            </div>
          </div>

          <div className="space-y-12">
            {/* SECTION 1: Student Information */}
            {currentSection === 1 && (
              <div className="animate-in fade-in duration-500 space-y-10">
                
                {/* Passport Photo */}
                <div className="group">
                  <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-4">{t('Passport Photo')} <span className="text-rose-500">*</span></p>
                  <div className="relative w-48 h-60 rounded-[32px] overflow-hidden border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-teal-600/50 transition-all bg-slate-50/50 dark:bg-slate-950/50 flex flex-col items-center justify-center gap-4">
                    {formData.passportPhotoPreview ? (
                      <>
                        <img src={formData.passportPhotoPreview} alt="Passport" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button 
                            type="button" 
                            className="bg-white text-slate-900 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-transform"
                            onClick={() => document.getElementById('passportPhoto')?.click()}
                          >
                            {t('Change')}
                          </button>
                        </div>
                      </>
                    ) : (
                      <label htmlFor="passportPhoto" className="cursor-pointer flex flex-col items-center text-center px-6">
                        <span className="material-icons-round text-4xl text-slate-300 dark:text-slate-700 mb-2">add_a_photo</span>
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-tight">{t('Click to upload photo')}</p>
                        <p className="text-[9px] font-medium text-slate-400 mt-1">(Max 2MB, JPG/PNG)</p>
                      </label>
                    )}
                    <input type="file" id="passportPhoto" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'passportPhoto', 'passportPhotoPreview')} />
                  </div>
                </div>

                {/* Names Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">{t('Name (Myanmar)')} <span className="text-rose-500">*</span></p>
                    <input
                      type="text"
                      name="studentNameMM"
                      value={formData.studentNameMM}
                      onChange={handleChange}
                      placeholder={t('Name (Myanmar)')}
                      className="w-full h-14 px-6 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 focus:ring-4 focus:ring-teal-600/10 focus:border-teal-600 transition-all font-medium text-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">{t('Name (English)')} <span className="text-rose-500">*</span></p>
                    <input
                      type="text"
                      name="studentNameEN"
                      value={formData.studentNameEN}
                      onChange={handleChange}
                      placeholder="Maung Maung"
                      className="w-full h-14 px-6 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 focus:ring-4 focus:ring-teal-600/10 focus:border-teal-600 transition-all font-medium text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* NRC SECTION */}
                <div className="space-y-6">
                  <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">{t('NRC Images')} <span className="text-rose-500">*</span></p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Front */}
                    <div className="relative group aspect-video rounded-3xl overflow-hidden border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
                      {formData.nrcFrontPreview ? (
                        <>
                          <img src={formData.nrcFrontPreview} alt="NRC Front" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button type="button" className="bg-white text-slate-900 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-transform" onClick={() => document.getElementById('nrcFront')?.click()}>{t('Change')}</button>
                          </div>
                        </>
                      ) : (
                        <label htmlFor="nrcFront" className="cursor-pointer h-full flex flex-col items-center justify-center text-center p-6">
                          <span className="material-icons-round text-3xl text-slate-300 dark:text-slate-700 mb-2">fingerprint</span>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('NRC Front (Front)')}</p>
                        </label>
                      )}
                      <input type="file" id="nrcFront" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'nrcFrontImage', 'nrcFrontPreview')} />
                    </div>
                    {/* Back */}
                    <div className="relative group aspect-video rounded-3xl overflow-hidden border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
                      {formData.nrcBackPreview ? (
                        <>
                          <img src={formData.nrcBackPreview} alt="NRC Back" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button type="button" className="bg-white text-slate-900 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-transform" onClick={() => document.getElementById('nrcBack')?.click()}>{t('Change')}</button>
                          </div>
                        </>
                      ) : (
                        <label htmlFor="nrcBack" className="cursor-pointer h-full flex flex-col items-center justify-center text-center p-6">
                          <span className="material-icons-round text-3xl text-slate-300 dark:text-slate-700 mb-2">fingerprint</span>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('NRC Back (Back)')}</p>
                        </label>
                      )}
                      <input type="file" id="nrcBack" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'nrcBackImage', 'nrcBackPreview')} />
                    </div>
                  </div>
                </div>

                {/* Additional Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="space-y-2.5">
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">{t('Religion')}</p>
                    <input type="text" name="religion" value={formData.religion} onChange={handleChange} className="w-full h-12 px-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 focus:ring-4 focus:ring-teal-600/10 transition-all font-bold text-sm" placeholder="ဗုဒ္ဓ" />
                  </div>
                  <div className="space-y-2.5">
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">{t('Ethnicity')}</p>
                    <input type="text" name="ethnic" value={formData.ethnic} onChange={handleChange} className="w-full h-12 px-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 focus:ring-4 focus:ring-teal-600/10 transition-all font-bold text-sm" placeholder="ဗမာ" />
                  </div>
                  <div className="space-y-2.5">
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">{t('Birthplace')}</p>
                    <input type="text" name="birthplace" value={formData.birthplace} onChange={handleChange} className="w-full h-12 px-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 focus:ring-4 focus:ring-teal-600/10 transition-all font-bold text-sm" placeholder="ရန်ကုန်" />
                  </div>
                  <div className="space-y-2.5">
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">{t('Blood Type')}</p>
                    <select name="bloodType" value={formData.bloodType} onChange={handleChange} className="w-full h-12 px-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 focus:ring-4 focus:ring-teal-600/10 transition-all font-bold text-sm">
                      <option value="">{t('Select blood type')}</option>
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="AB">AB</option>
                      <option value="O">O</option>
                    </select>
                  </div>
                </div>

                {/* Academic Placement */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-50 dark:border-slate-800/50">
                  <div className="space-y-2.5">
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">{t('Year')} <span className="text-rose-500">*</span></p>
                    <select name="currentYear" value={formData.currentYear} onChange={handleChange} className="w-full h-12 px-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 focus:ring-4 focus:ring-teal-600/10 transition-all font-bold text-sm">
                      <option value="">{t('Select year')}</option>
                      {yearOptions.map((item) => (
                        <option key={item.value} value={item.value}>{item.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2.5">
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">{t('Semester')} <span className="text-rose-500">*</span></p>
                    <select name="academicSemester" value={formData.academicSemester} onChange={handleChange} disabled={!formData.currentYear} className="w-full h-12 px-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 focus:ring-4 focus:ring-teal-600/10 transition-all font-bold text-sm disabled:opacity-50">
                      <option value="">{formData.currentYear ? t('Select semester') : t('Select year first')}</option>
                      {semesterOptions.map((item) => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {majorsForSelectedYear.length > 0 && (
                  <div className="space-y-2.5">
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">{t('Major')} <span className="text-rose-500">*</span></p>
                    <select name="major" value={formData.major} onChange={handleChange} className="w-full h-14 px-6 rounded-2xl bg-teal-50 dark:bg-teal-900/10 border border-teal-100 dark:border-teal-900/30 focus:ring-4 focus:ring-teal-600/10 transition-all font-black text-teal-600">
                      <option value="">{t('Select major')}</option>
                      {majorsForSelectedYear.map((item: string) => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Full Address */}
                <div className="space-y-2.5">
                  <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">{t('Address')}</p>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    rows={3}
                    placeholder={t('Enter full address')}
                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 focus:ring-4 focus:ring-teal-600/10 transition-all font-medium text-sm leading-relaxed"
                  />
                </div>
              </div>
            )}

            {/* SECTION 2 & 3: Parent Information */}
            {(currentSection === 2 || currentSection === 3) && (
              <div className="animate-in fade-in duration-500 space-y-10">
                {/* Section specific fields (Father or Mother) */}
                {(() => {
                  const isFather = currentSection === 2;
                  const prefix = isFather ? 'father' : 'mother';
                  const townships = isFather ? fatherTownships : motherTownships;
                  
                  return (
                    <div className="space-y-10">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">{isFather ? t('Father Name (Myanmar)') : t('Mother Name (Myanmar)')} <span className="text-rose-500">*</span></p>
                          <input type="text" name={`${prefix}NameMM`} value={formData[`${prefix}NameMM`]} onChange={handleChange} className="w-full h-14 px-6 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 focus:ring-4 focus:ring-teal-600/10 transition-all font-medium text-slate-900 dark:text-white" placeholder="အမည်" />
                        </div>
                        <div className="space-y-3">
                          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">{isFather ? t('Father Name (English)') : t('Mother Name (English)')} <span className="text-rose-500">*</span></p>
                          <input type="text" name={`${prefix}NameEN`} value={formData[`${prefix}NameEN`]} onChange={handleChange} className="w-full h-14 px-6 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 focus:ring-4 focus:ring-teal-600/10 transition-all font-medium text-slate-900 dark:text-white" placeholder="Name" />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">{t('Occupation')}</p>
                          <input type="text" name={`${prefix}Occupation`} value={formData[`${prefix}Occupation`]} onChange={handleChange} className="w-full h-14 px-6 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 focus:ring-4 focus:ring-teal-600/10 transition-all font-medium" placeholder={t('e.g., Teacher')} />
                        </div>
                        <div className="space-y-3">
                          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">{t('Phone')}</p>
                          <input type="tel" name={`${prefix}Phone`} value={formData[`${prefix}Phone`]} onChange={handleChange} className="w-full h-14 px-6 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 focus:ring-4 focus:ring-teal-600/10 transition-all font-bold text-sm" placeholder="09xxxxxxxxx" />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">{t('Religion')}</p>
                          <input type="text" name={`${prefix}Religion`} value={formData[`${prefix}Religion`]} onChange={handleChange} className="w-full h-14 px-6 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 focus:ring-4 focus:ring-teal-600/10 transition-all font-medium text-slate-900 dark:text-white" placeholder="ဗုဒ္ဓ" />
                        </div>
                        <div className="space-y-3">
                          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">{t('Ethnicity')}</p>
                          <input type="text" name={`${prefix}Ethnic`} value={formData[`${prefix}Ethnic`]} onChange={handleChange} className="w-full h-14 px-6 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 focus:ring-4 focus:ring-teal-600/10 transition-all font-medium text-slate-900 dark:text-white" placeholder="ဗမာ" />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">{t('Birthplace')}</p>
                        <input type="text" name={`${prefix}Birthplace`} value={formData[`${prefix}Birthplace`]} onChange={handleChange} className="w-full h-14 px-6 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 focus:ring-4 focus:ring-teal-600/10 transition-all font-medium text-slate-900 dark:text-white" placeholder="ရန်ကုန်" />
                      </div>

                      {/* NRC GROUP */}
                      <div className="space-y-4">
                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">{t('NRC Number')} <span className="text-rose-500">*</span></p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <select name={`${prefix}NrcRegion`} value={formData[`${prefix}NrcRegion`]} onChange={handleChange} className="h-12 px-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 focus:ring-4 focus:ring-teal-600/10 font-bold text-xs">
                            <option value="">{t('Region')}</option>
                            {nrcRegions.map((region) => (
                              <option key={region} value={region}>{toMyanmarDigits(region)}</option>
                            ))}
                          </select>
                          <select name={`${prefix}NrcTownship`} value={formData[`${prefix}NrcTownship`]} onChange={handleChange} className="h-12 px-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 focus:ring-4 focus:ring-teal-600/10 font-bold text-xs">
                            <option value="">{t('Township')}</option>
                            {townships.map((township: any) => (
                              <option key={township.code} value={township.code}>{township.code} - {township.nameMm}</option>
                            ))}
                          </select>
                          <select name={`${prefix}NrcType`} value={formData[`${prefix}NrcType`]} onChange={handleChange} className="h-12 px-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 focus:ring-4 focus:ring-teal-600/10 font-bold text-xs">
                            <option value="">{t('Type')}</option>
                            {nrcTypes.map((type) => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                          <input type="text" name={`${prefix}NrcNumber`} value={formData[`${prefix}NrcNumber`]} onChange={handleChange} placeholder={t('6 digits')} maxLength={6} className="h-12 px-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 focus:ring-4 focus:ring-teal-600/10 font-black text-sm tracking-[0.2em]" />
                        </div>
                      </div>

                      {/* Parent NRC Photos */}
                      <div className="space-y-6">
                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">{isFather ? t('Father\'s NRC Photo') : t('Mother\'s NRC Photo')} <span className="text-rose-500">*</span></p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Front */}
                          <div className="relative group aspect-video rounded-3xl overflow-hidden border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
                            {formData[`${prefix}NrcFrontPreview`] ? (
                              <>
                                <img src={formData[`${prefix}NrcFrontPreview`]} alt="NRC Front" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <button type="button" className="bg-white text-slate-900 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl" onClick={() => document.getElementById(`${prefix}NrcFront`)?.click()}>{t('Change')}</button>
                                </div>
                              </>
                            ) : (
                              <label htmlFor={`${prefix}NrcFront`} className="cursor-pointer h-full flex flex-col items-center justify-center text-center p-6">
                                <span className="material-icons-round text-3xl text-slate-300 dark:text-slate-700 mb-2">fingerprint</span>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">{t('NRC Front (Front)')}</p>
                              </label>
                            )}
                            <input type="file" id={`${prefix}NrcFront`} accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, `${prefix}NrcFront`, `${prefix}NrcFrontPreview`)} />
                          </div>
                          {/* Back */}
                          <div className="relative group aspect-video rounded-3xl overflow-hidden border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
                            {formData[`${prefix}NrcBackPreview`] ? (
                              <>
                                <img src={formData[`${prefix}NrcBackPreview`]} alt="NRC Back" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <button type="button" className="bg-white text-slate-900 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl" onClick={() => document.getElementById(`${prefix}NrcBack`)?.click()}>{t('Change')}</button>
                                </div>
                              </>
                            ) : (
                              <label htmlFor={`${prefix}NrcBack`} className="cursor-pointer h-full flex flex-col items-center justify-center text-center p-6">
                                <span className="material-icons-round text-3xl text-slate-300 dark:text-slate-700 mb-2">fingerprint</span>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">{t('NRC Back (Back)')}</p>
                              </label>
                            )}
                            <input type="file" id={`${prefix}NrcBack`} accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, `${prefix}NrcBack`, `${prefix}NrcBackPreview`)} />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3 pt-4 border-t border-slate-50 dark:border-slate-800/50">
                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">{t('Address')}</p>
                        <textarea
                          name={`${prefix}Address`}
                          value={formData[`${prefix}Address`]}
                          onChange={handleChange}
                          rows={3}
                          placeholder={t('Enter full address')}
                          className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 focus:ring-4 focus:ring-teal-600/10 transition-all font-medium text-sm leading-relaxed"
                        />
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* SECTION 4: Parent Agreement */}
            {currentSection === 4 && (
              <div className="animate-in fade-in duration-500 space-y-12">
                <div className="space-y-6">
                  <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">{t('Who will support your studies?')} <span className="text-rose-500">*</span></p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {['father', 'mother', 'other'].map((opt) => (
                      <label key={opt} className={`relative flex items-center justify-center h-24 rounded-3xl border-2 transition-all cursor-pointer ${
                        formData.financialSupporter === opt 
                          ? 'border-teal-600 bg-teal-50 dark:bg-teal-900/10' 
                          : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 hover:border-teal-600/30'
                      }`}>
                        <input type="radio" name="financialSupporter" value={opt} checked={formData.financialSupporter === opt} onChange={handleChange} className="hidden" />
                        <span className={`text-xs font-black uppercase tracking-widest ${
                          formData.financialSupporter === opt ? 'text-teal-600' : 'text-slate-500'
                        }`}>
                          {t(opt.charAt(0).toUpperCase() + opt.slice(1))}
                        </span>
                        {formData.financialSupporter === opt && (
                          <div className="absolute top-3 right-3 w-4 h-4 bg-teal-600 rounded-full flex items-center justify-center">
                            <span className="material-icons-round text-white text-[10px]">check</span>
                          </div>
                        )}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <label className={`p-8 rounded-[32px] border-2 transition-all cursor-pointer flex flex-col gap-4 ${
                    formData.needsFinancialAid ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/10' : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50'
                  }`}>
                    <div className="flex items-center justify-between w-full">
                      <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center shadow-sm">
                        <span className="material-icons-round text-indigo-600">payments</span>
                      </div>
                      <input type="checkbox" name="needsFinancialAid" checked={formData.needsFinancialAid} onChange={handleChange} className="w-6 h-6 rounded-lg border-slate-300 text-indigo-600 focus:ring-indigo-600/20" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('Financial Support')}</p>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{t('Needs Financial Aid?')}</h4>
                    </div>
                  </label>

                  <label className={`p-8 rounded-[32px] border-2 transition-all cursor-pointer flex flex-col gap-4 ${
                    formData.needsHostel ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-900/10' : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50'
                  }`}>
                    <div className="flex items-center justify-between w-full">
                      <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center shadow-sm">
                        <span className="material-icons-round text-emerald-600">apartment</span>
                      </div>
                      <input type="checkbox" name="needsHostel" checked={formData.needsHostel} onChange={handleChange} className="w-6 h-6 rounded-lg border-slate-300 text-emerald-600 focus:ring-emerald-600/20" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('Hostel Accommodation')}</p>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{t('Needs Hostel?')}</h4>
                    </div>
                  </label>
                </div>

                {formData.needsFinancialAid && (
                  <div className="animate-in fade-in slide-in-from-top-4 duration-500 p-8 rounded-[32px] bg-slate-900 text-white relative overflow-hidden mb-8">
                    <div className="relative z-10 space-y-6">
                      <div className="flex items-center gap-4">
                        <span className="material-icons-round text-indigo-400">upload_file</span>
                        <h4 className="text-sm font-black uppercase tracking-widest">{t('Income Evidence')}</h4>
                      </div>
                      <div className="relative group aspect-video md:w-96 rounded-2xl overflow-hidden border-2 border-dashed border-slate-700 bg-slate-800 flex flex-col items-center justify-center">
                        {formData.financialAidPreview ? (
                          <>
                            <img src={formData.financialAidPreview} alt="Income Evidence" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <button type="button" className="bg-white text-slate-900 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl" onClick={() => document.getElementById('financialAidPhoto')?.click()}>{t('Change')}</button>
                            </div>
                          </>
                        ) : (
                          <label htmlFor="financialAidPhoto" className="cursor-pointer h-full flex flex-col items-center justify-center text-center p-6">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('Upload Recommendation/Income Evidence')}</p>
                            <span className="text-[9px] text-slate-500 font-medium">(Required for Financial Aid)</span>
                          </label>
                        )}
                        <input type="file" id="financialAidPhoto" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'financialAidPhoto', 'financialAidPreview')} />
                      </div>
                    </div>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-bl-full transform translate-x-1/2 -translate-y-1/2" />
                  </div>
                )}

                {formData.needsHostel && (
                  <div className="animate-in fade-in slide-in-from-top-4 duration-500 p-8 rounded-[32px] bg-slate-900 text-white relative overflow-hidden">
                    <div className="relative z-10 space-y-6">
                      <div className="flex items-center gap-4">
                        <span className="material-icons-round text-emerald-400">upload_file</span>
                        <h4 className="text-sm font-black uppercase tracking-widest">{t('Family Registration')}</h4>
                      </div>
                      <div className="relative group aspect-video md:w-96 rounded-2xl overflow-hidden border-2 border-dashed border-slate-700 bg-slate-800 flex flex-col items-center justify-center">
                        {formData.familyRegistrationPreview ? (
                          <>
                            <img src={formData.familyRegistrationPreview} alt="Family Reg" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <button type="button" className="bg-white text-slate-900 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl" onClick={() => document.getElementById('familyReg')?.click()}>{t('Change')}</button>
                            </div>
                          </>
                        ) : (
                          <label htmlFor="familyReg" className="cursor-pointer h-full flex flex-col items-center justify-center text-center p-6">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('Upload Family Registration')}</p>
                            <span className="text-[9px] text-slate-500 font-medium">(Required for Hostel)</span>
                          </label>
                        )}
                        <input type="file" id="familyReg" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'familyRegistrationPhoto', 'familyRegistrationPreview')} />
                      </div>
                    </div>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-bl-full transform translate-x-1/2 -translate-y-1/2" />
                  </div>
                )}
              </div>
            )}

            {/* SECTION 5: School Terms */}
            {currentSection === 5 && (
              <div className="animate-in fade-in duration-500 space-y-10">
                <div className="p-10 rounded-[32px] bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 max-h-[400px] overflow-y-auto scrollbar-hide ring-1 ring-slate-100/50">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-8 flex items-center gap-3">
                    <span className="w-2 h-8 bg-teal-600 rounded-full" />
                    University of Information Technology - စည်းကမ်းချက်များ
                  </h3>
                  <div className="space-y-6 text-sm font-medium text-slate-600 dark:text-slate-400 leading-relaxed">
                    {[
                      '၁။ ကျောင်းသားသည် တက္ကသိုလ်၏ စည်းကမ်းချက်များကို လိုက်နာရမည်။',
                      '၂။ သင်တန်းတက်ရောက်ခြင်းတွင် အနည်းဆုံး ၇၅% တက်ရောက်ရမည်။',
                      '၃။ စာမေးပွဲများတွင် အဝတ်အစားသတ်မှတ်ချက်နှင့်အညီ ဝင်ရောက်ရမည်။',
                      '၄။ ကျောင်းပိုင်ဆိုင်မှုများကို မထိခိုက်စေရ၊ ထိခိုက်ပါက ပြန်လည်ပြင်ဆင်ပေးရမည်။',
                      '၅။ အခြားကျောင်းသားများ၏ အခွင့်အရေးများကို လေးစားရမည်။',
                      '၆။ စာသင်ကြားရေး လုပ်ငန်းစဉ်များကို ဂရုတစိုက် လုပ်ဆောင်ရမည်။',
                      '၇။ တက္ကသိုလ်၏ မျက်နှာသာကို ထိခိုက်စေသည့် လုပ်ရပ်များ မပြုလုပ်ရ။',
                      '၈။ သတ်မှတ်ထားသော စာရင်းကြေးများကို အချိန်မီ ပေးချေရမည်။',
                      '၉။ ကျောင်းထုတ်ခံရပါက ပြန်လည်လျှောက်ထားခွင့် မရှိပါ။',
                      '၁၀။ ဤစည်းကမ်းချက်များကို ချိုးဖောက်ပါက သင့်လျော်သော အရေးယူမှု ခံရမည်။'
                    ].map((term, i) => (
                      <div key={i} className="flex gap-4 p-4 rounded-2xl hover:bg-white dark:hover:bg-slate-900 transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-800 group">
                        <span className="text-teal-600 font-black group-hover:scale-110 transition-transform">{i+1}</span>
                        <p>{term}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <label className={`p-8 rounded-[32px] border-2 transition-all cursor-pointer flex items-center gap-6 ${
                  formData.schoolTermsAccepted ? 'border-teal-600 bg-teal-50 dark:bg-teal-900/10' : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50'
                }`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                    formData.schoolTermsAccepted ? 'bg-teal-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-transparent'
                  }`}>
                    <span className="material-icons-round text-lg">check</span>
                  </div>
                  <input type="checkbox" name="schoolTermsAccepted" checked={formData.schoolTermsAccepted} onChange={handleChange} className="hidden" />
                  <div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight leading-tight mb-1">{t('I have read and agree to all the school terms and conditions')}</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('Agree to all terms')}</p>
                  </div>
                </label>
              </div>
            )}

            {/* SECTION 6: Student Confession */}
            {currentSection === 6 && (
              <div className="animate-in fade-in duration-500 space-y-12">
                <div className="relative p-12 rounded-[40px] bg-slate-900 text-white overflow-hidden group shadow-2xl">
                  <div className="relative z-10 space-y-8">
                    <h3 className="text-2xl font-black uppercase tracking-tight border-b border-white/10 pb-6">{t('Student Confession')}</h3>
                    <div className="space-y-6 text-sm font-medium text-slate-300 leading-relaxed">
                      <p className="text-teal-400 font-black uppercase tracking-widest text-[10px]">အကျွန်ုပ်သည် University of Information Technology တွင် ပညာသင်ကြားရာ၌:</p>
                      <ul className="space-y-4">
                        <li className="flex gap-4">
                          <span className="material-icons-round text-teal-500 text-sm">auto_awesome</span>
                          <span>တက္ကသိုလ်၏ စည်းကမ်းချက်များကို တင်းကြပ်စွာ လိုက်နာပါမည်။</span>
                        </li>
                        <li className="flex gap-4">
                          <span className="material-icons-round text-teal-500 text-sm">auto_awesome</span>
                          <span>ဆရာ/ဆရာမများ၏ ညွှန်ကြားချက်များကို လေးစားလိုက်နာပါမည်။</span>
                        </li>
                        <li className="flex gap-4">
                          <span className="material-icons-round text-teal-500 text-sm">auto_awesome</span>
                          <span>အခြားကျောင်းသားများနှင့် ကောင်းမွန်သော ဆက်ဆံရေး ထိန်းသိမ်းပါမည်။</span>
                        </li>
                        <li className="flex gap-4">
                          <span className="material-icons-round text-teal-500 text-sm">auto_awesome</span>
                          <span>တက္ကသိုလ်၏ ဂုဏ်သိက္ခာကို မြှင့်တင်ရန် ကြိုးစားပါမည်။</span>
                        </li>
                      </ul>
                      <p className="pt-6 text-xs text-slate-400 border-t border-white/5 font-black uppercase tracking-widest">အထက်ပါအချက်များကို ကျွန်ုပ်၏ ကိုယ်ပိုင်ဆန္ဒဖြင့် ကတိပြုပါသည်။</p>
                    </div>
                  </div>
                  <div className="absolute top-0 right-0 p-10 opacity-5 transform group-hover:scale-110 transition-transform">
                    <span className="material-icons-round text-[200px]">verified</span>
                  </div>
                </div>

                <label className={`p-8 rounded-[32px] border-2 transition-all cursor-pointer flex items-center gap-6 ${
                  formData.confessionAccepted ? 'border-teal-600 bg-teal-50 dark:bg-teal-900/10' : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50'
                }`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                    formData.confessionAccepted ? 'bg-teal-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-transparent'
                  }`}>
                    <span className="material-icons-round text-lg">check</span>
                  </div>
                  <input type="checkbox" name="confessionAccepted" checked={formData.confessionAccepted} onChange={handleChange} className="hidden" />
                  <div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight leading-tight mb-1">{t('I accept and agree to this confession statement')}</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('Agree to confession statement')}</p>
                  </div>
                </label>

                <div className="p-8 rounded-[32px] bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30 flex items-start gap-4">
                  <span className="material-icons-round text-rose-500">warning</span>
                  <div>
                    <p className="text-[10px] font-black text-rose-600 uppercase tracking-[0.2em] mb-1">{t('Final Warning: Changes cannot be made after submission.')}</p>
                    <p className="text-sm font-bold text-rose-900 dark:text-rose-400">{t('Ensure all data is correct.')}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-16 pt-10 border-t border-slate-100 dark:border-slate-800">
            <button 
              type="button" 
              onClick={handlePrevious}
              disabled={currentSection === 1}
              className={`flex items-center gap-2 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${
                currentSection === 1 
                  ? 'opacity-0 pointer-events-none' 
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-lg'
              }`}
            >
              <span className="material-icons-round text-sm">arrow_back</span>
              {t('Previous')}
            </button>
            
            {currentSection < 6 ? (
              <button 
                type="button" 
                onClick={handleNext}
                className="flex items-center gap-2 bg-slate-900 text-white px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:shadow-2xl hover:-translate-y-0.5 active:scale-95 transition-all"
              >
                {t('Next')}
                <span className="material-icons-round text-sm">arrow_forward</span>
              </button>
            ) : (
              <button 
                type="button" 
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center gap-2 bg-teal-600 text-white px-12 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-teal-500/20 hover:bg-teal-700 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none"
              >
                <span className="material-icons-round text-sm">{loading ? 'sync' : 'done_all'}</span>
                {loading ? t('Submitting...') : t('Submit Form')}
              </button>
            )}
          </div>

        </div>
      </main>
    </div>
  );
};

export default StudentDetails;
