import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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

const StudentDetails: React.FC<{ user?: any; onLogout?: () => void }> = () => {
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
          const candidates = await api.getStudents(parsedStudent.email);
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
    if (!validateSection(6)) return;

    const confirm = window.confirm('သင့်အချက်အလက်များ အပြည့်အစုံ ဖြည့်သွင်းပြီးပါပြီလား?\n\nတင်သွင်းမည်လား?');
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
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="details-form-container">
      {/* Header */}
      <header className="form-header">
        <div className="header-content">
          <h1>Student Details Form</h1>
          <p>Complete your student information</p>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="progress-container">
        <div className="progress-bar">
          {[1, 2, 3, 4, 5, 6].map((stepNumber) => (
            <div
              key={stepNumber}
              className={`progress-step ${currentSection >= stepNumber ? 'active' : ''} ${currentSection === stepNumber ? 'current' : ''}`}
            >
              <div className="step-number">{stepNumber}</div>
              <div className="step-label">Section {stepNumber}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Form Content */}
      <div className="form-content">
        <div className="form-card">

          {/* SECTION 1: Student Information */}
          {currentSection === 1 && (
            <div className="section">
              <h2 className="section-title">Section 1: Student Information</h2>
              <p className="section-subtitle">Provide your personal details</p>

              {/* Passport Photo */}
              <div className="form-group">
                <label>Passport Photo: <span className="required">*</span></label>
                <div className="image-upload-box">
                  {formData.passportPhotoPreview ? (
                    <div className="image-preview">
                      <img src={formData.passportPhotoPreview} alt="Passport" />
                      <button 
                        type="button" 
                        className="btn-change-image"
                        onClick={() => document.getElementById('passportPhoto')?.click()}
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <label htmlFor="passportPhoto" className="upload-label">
                      <div className="upload-icon">Upload</div>
                      <p>Click to upload photo</p>
                      <small>(Max 2MB, JPG/PNG)</small>
                    </label>
                  )}
                  <input
                    type="file"
                    id="passportPhoto"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'passportPhoto', 'passportPhotoPreview')}
                    style={{ display: 'none' }}
                  />
                </div>
              </div>

              {/* Student Names */}
              <div className="form-row">
                <div className="form-group">
                  <label>အမည် (မြန်မာ): <span className="required">*</span></label>
                  <input
                    type="text"
                    name="studentNameMM"
                    value={formData.studentNameMM}
                    onChange={handleChange}
                    placeholder="မြန်မာအမည်"
                  />
                </div>
                <div className="form-group">
                  <label>Name (English): <span className="required">*</span></label>
                  <input
                    type="text"
                    name="studentNameEN"
                    value={formData.studentNameEN}
                    onChange={handleChange}
                    placeholder="Maung Maung"
                  />
                </div>
              </div>

              {/* NRC Images */}
              <div className="form-group">
                <label>မှတ်ပုံတင် ဓာတ်ပုံ (NRC Images): <span className="required">*</span></label>
                <div className="image-row">
                  {/* NRC Front */}
                  <div className="image-upload-box half">
                    {formData.nrcFrontPreview ? (
                      <div className="image-preview">
                        <img src={formData.nrcFrontPreview} alt="NRC Front" />
                        <button 
                          type="button" 
                          className="btn-change-image"
                          onClick={() => document.getElementById('nrcFront')?.click()}
                        >
                          Change
                        </button>
                      </div>
                    ) : (
                      <label htmlFor="nrcFront" className="upload-label">
                        <div className="upload-icon">📄</div>
                        <p>NRC Front (ရှေ့)</p>
                      </label>
                    )}
                    <input
                      type="file"
                      id="nrcFront"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, 'nrcFrontImage', 'nrcFrontPreview')}
                      style={{ display: 'none' }}
                    />
                  </div>

                  {/* NRC Back */}
                  <div className="image-upload-box half">
                    {formData.nrcBackPreview ? (
                      <div className="image-preview">
                        <img src={formData.nrcBackPreview} alt="NRC Back" />
                        <button 
                          type="button" 
                          className="btn-change-image"
                          onClick={() => document.getElementById('nrcBack')?.click()}
                        >
                          Change
                        </button>
                      </div>
                    ) : (
                      <label htmlFor="nrcBack" className="upload-label">
                        <div className="upload-icon">📄</div>
                        <p>NRC Back (နောက်)</p>
                      </label>
                    )}
                    <input
                      type="file"
                      id="nrcBack"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, 'nrcBackImage', 'nrcBackPreview')}
                      style={{ display: 'none' }}
                    />
                  </div>
                </div>
              </div>

              {/* Personal Details */}
              <div className="form-row">
                <div className="form-group">
                  <label>ဘာသာ (Religion):</label>
                  <input
                    type="text"
                    name="religion"
                    value={formData.religion}
                    onChange={handleChange}
                    placeholder="ဗုဒ္ဓ"
                  />
                </div>
                <div className="form-group">
                  <label>လူမျိုး (Ethnicity):</label>
                  <input
                    type="text"
                    name="ethnic"
                    value={formData.ethnic}
                    onChange={handleChange}
                    placeholder="ဗမာ"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>မွေးဖွားရာဌာန (Birthplace):</label>
                  <input
                    type="text"
                    name="birthplace"
                    value={formData.birthplace}
                    onChange={handleChange}
                    placeholder="ရန်ကုန်"
                  />
                </div>
                <div className="form-group">
                  <label>သွေးအမျိုးအစား (Blood Type):</label>
                  <select name="bloodType" value={formData.bloodType} onChange={handleChange}>
                    <option value="">ရွေးချယ်ပါ</option>
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="AB">AB</option>
                    <option value="O">O</option>
                  </select>
                </div>
              </div>

                            <div className="form-row">
                <div className="form-group">
                  <label>Year: <span className="required">*</span></label>
                  <select name="currentYear" value={formData.currentYear} onChange={handleChange}>
                    <option value="">Select year</option>
                    {yearOptions.map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Semester: <span className="required">*</span></label>
                  <select
                    name="academicSemester"
                    value={formData.academicSemester}
                    onChange={handleChange}
                    disabled={!formData.currentYear}
                  >
                    <option value="">{formData.currentYear ? 'Select semester' : 'Select year first'}</option>
                    {semesterOptions.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </div>
              </div>

              {majorsForSelectedYear.length > 0 && (
                <div className="form-group">
                  <label>Major: <span className="required">*</span></label>
                  <select name="major" value={formData.major} onChange={handleChange}>
                    <option value="">Select major</option>
                    {majorsForSelectedYear.map((item: string) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Contact Info */}
              <div className="form-group">
                <label>လိပ်စာ (Address):</label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  rows={3}
                  placeholder="အပြည့်အစုံ လိပ်စာ ရေးပါ"
                />
              </div>
            </div>
          )}

          {/* SECTION 2: Father Information */}
          {currentSection === 2 && (
            <div className="section">
              <h2 className="section-title">Section 2: Father's Information</h2>
              <p className="section-subtitle">Father's details</p>

              <div className="form-row">
                <div className="form-group">
                  <label>Father Name (Myanmar): <span className="required">*</span></label>
                  <input
                    type="text"
                    name="fatherNameMM"
                    value={formData.fatherNameMM}
                    onChange={handleChange}
                    placeholder="Enter name"
                  />
                </div>
                <div className="form-group">
                  <label>Father Name (English): <span className="required">*</span></label>
                  <input
                    type="text"
                    name="fatherNameEN"
                    value={formData.fatherNameEN}
                    onChange={handleChange}
                    placeholder="U Aung Aung"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Occupation:</label>
                <input
                  type="text"
                  name="fatherOccupation"
                  value={formData.fatherOccupation}
                  onChange={handleChange}
                  placeholder="e.g., Teacher"
                />
              </div>

              <div className="form-group">
                <label>NRC Number:</label>
                <div className="nrc-group">
                  <select
                    name="fatherNrcRegion"
                    value={formData.fatherNrcRegion}
                    onChange={handleChange}
                  >
                    <option value="">Region</option>
                    {nrcRegions.map((region) => (
                      <option key={region} value={region}>{toMyanmarDigits(region)}</option>
                    ))}
                  </select>
                  <select
                    name="fatherNrcTownship"
                    value={formData.fatherNrcTownship}
                    onChange={handleChange}
                  >
                    <option value="">Township</option>
                    {fatherTownships.map((township: any) => (
                      <option key={township.code} value={township.code}>
                        {township.code} - {township.nameMm || township.nameEn}
                      </option>
                    ))}
                  </select>
                  <select
                    name="fatherNrcType"
                    value={formData.fatherNrcType}
                    onChange={handleChange}
                  >
                    <option value="">Type</option>
                    {nrcTypes.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    name="fatherNrcNumber"
                    value={formData.fatherNrcNumber}
                    onChange={handleChange}
                    placeholder="6 digits"
                    maxLength={6}
                  />
                </div>
              </div>

              {/* Father NRC Images */}
              <div className="form-group">
                <label>Father's NRC Photo: <span className="required">*</span></label>
                <div className="image-row">
                  {/* Father NRC Front */}
                  <div className="image-upload-box half">
                    {formData.fatherNrcFrontPreview ? (
                      <div className="image-preview">
                        <img src={formData.fatherNrcFrontPreview} alt="Father NRC Front" />
                        <button 
                          type="button" 
                          className="btn-change-image"
                          onClick={() => document.getElementById('fatherNrcFront')?.click()}
                        >
                          Change
                        </button>
                      </div>
                    ) : (
                      <label htmlFor="fatherNrcFront" className="upload-label">
                        <div className="upload-icon">Upload</div>
                        <p>NRC Front</p>
                      </label>
                    )}
                    <input
                      type="file"
                      id="fatherNrcFront"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, 'fatherNrcFront', 'fatherNrcFrontPreview')}
                      style={{ display: 'none' }}
                    />
                  </div>

                  {/* Father NRC Back */}
                  <div className="image-upload-box half">
                    {formData.fatherNrcBackPreview ? (
                      <div className="image-preview">
                        <img src={formData.fatherNrcBackPreview} alt="Father NRC Back" />
                        <button 
                          type="button" 
                          className="btn-change-image"
                          onClick={() => document.getElementById('fatherNrcBack')?.click()}
                        >
                          Change
                        </button>
                      </div>
                    ) : (
                      <label htmlFor="fatherNrcBack" className="upload-label">
                        <div className="upload-icon">Upload</div>
                        <p>NRC Back</p>
                      </label>
                    )}
                    <input
                      type="file"
                      id="fatherNrcBack"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, 'fatherNrcBack', 'fatherNrcBackPreview')}
                      style={{ display: 'none' }}
                    />
                  </div>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>ဘာသာ (Religion):</label>
                  <input
                    type="text"
                    name="fatherReligion"
                    value={formData.fatherReligion}
                    onChange={handleChange}
                    placeholder="ဗုဒ္ဓ"
                  />
                </div>
                <div className="form-group">
                  <label>လူမျိုး (Ethnicity):</label>
                  <input
                    type="text"
                    name="fatherEthnic"
                    value={formData.fatherEthnic}
                    onChange={handleChange}
                    placeholder="ဗမာ"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>မွေးဖွားရာဌာန (Birthplace):</label>
                <input
                  type="text"
                  name="fatherBirthplace"
                  value={formData.fatherBirthplace}
                  onChange={handleChange}
                  placeholder="မန္တလေး"
                />
              </div>

              <div className="form-group">
                <label>လိပ်စာ (Address):</label>
                <textarea
                  name="fatherAddress"
                  value={formData.fatherAddress}
                  onChange={handleChange}
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label>ဖုန်းနံပါတ် (Phone):</label>
                <input
                  type="tel"
                  name="fatherPhone"
                  value={formData.fatherPhone}
                  onChange={handleChange}
                  placeholder="09xxxxxxxxx"
                />
              </div>
            </div>
          )}

          {/* SECTION 3: Mother Information */}
          {currentSection === 3 && (
            <div className="section">
              <h2 className="section-title">👩 Section 3: Mother's Information</h2>
              <p className="section-subtitle">အမေ၏ အချက်အလက်များ</p>

              <div className="form-row">
                <div className="form-group">
                  <label>အမေအမည် (မြန်မာ): <span className="required">*</span></label>
                  <input
                    type="text"
                    name="motherNameMM"
                    value={formData.motherNameMM}
                    onChange={handleChange}
                    placeholder="ဒေါ်မြမြ"
                  />
                </div>
                <div className="form-group">
                  <label>Mother Name (English): <span className="required">*</span></label>
                  <input
                    type="text"
                    name="motherNameEN"
                    value={formData.motherNameEN}
                    onChange={handleChange}
                    placeholder="Daw Mya Mya"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>အလုပ်အကိုင် (Occupation):</label>
                <input
                  type="text"
                  name="motherOccupation"
                  value={formData.motherOccupation}
                  onChange={handleChange}
                  placeholder="ဥပမာ - ဆရာမ"
                />
              </div>

              <div className="form-group">
                <label>မှတ်ပုံတင်အမှတ် (NRC Number):</label>
                <div className="nrc-group">
                  <select
                    name="motherNrcRegion"
                    value={formData.motherNrcRegion}
                    onChange={handleChange}
                  >
                    <option value="">Region</option>
                    {nrcRegions.map((region) => (
                      <option key={region} value={region}>{toMyanmarDigits(region)}</option>
                    ))}
                  </select>
                  <select
                    name="motherNrcTownship"
                    value={formData.motherNrcTownship}
                    onChange={handleChange}
                  >
                    <option value="">Township</option>
                    {motherTownships.map((township: any) => (
                      <option key={township.code} value={township.code}>
                        {township.code} - {township.nameMm || township.nameEn}
                      </option>
                    ))}
                  </select>
                  <select
                    name="motherNrcType"
                    value={formData.motherNrcType}
                    onChange={handleChange}
                  >
                    <option value="">Type</option>
                    {nrcTypes.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    name="motherNrcNumber"
                    value={formData.motherNrcNumber}
                    onChange={handleChange}
                    placeholder="6 digits"
                    maxLength={6}
                  />
                </div>
              </div>

              {/* Mother NRC Images */}
              <div className="form-group">
                <label>အမေ၏ မှတ်ပုံတင် ဓာတ်ပုံ: <span className="required">*</span></label>
                <div className="image-row">
                  {/* Mother NRC Front */}
                  <div className="image-upload-box half">
                  {formData.motherNrcFrontPreview ? (
                    <div className="image-preview">
                      <img src={formData.motherNrcFrontPreview} alt="Mother NRC Front" />
                      <button 
                        type="button" 
                        className="btn-change-image"
                        onClick={() => document.getElementById('motherNrcFront')?.click()}
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <label htmlFor="motherNrcFront" className="upload-label">
                      <div className="upload-icon">Upload</div>
                      <p>NRC Front (ရှေ့)</p>
                    </label>
                  )}
                  <input
                    type="file"
                    id="motherNrcFront"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'motherNrcFront', 'motherNrcFrontPreview')}
                    style={{ display: 'none' }}
                  />
                  </div>

                  {/* Mother NRC Back */}
                  <div className="image-upload-box half">
                  {formData.motherNrcBackPreview ? (
                    <div className="image-preview">
                      <img src={formData.motherNrcBackPreview} alt="Mother NRC Back" />
                      <button 
                        type="button" 
                        className="btn-change-image"
                        onClick={() => document.getElementById('motherNrcBack')?.click()}
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <label htmlFor="motherNrcBack" className="upload-label">
                      <div className="upload-icon">Upload</div>
                      <p>NRC Back (နောက်)</p>
                    </label>
                  )}

                    <input
                      type="file"
                      id="motherNrcBack"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, 'motherNrcBack', 'motherNrcBackPreview')}
                      style={{ display: 'none' }}
                    />
                  </div>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>ဘာသာ (Religion):</label>
                  <input
                    type="text"
                    name="motherReligion"
                    value={formData.motherReligion}
                    onChange={handleChange}
                    placeholder="ဗုဒ္ဓ"
                  />
                </div>
                <div className="form-group">
                  <label>လူမျိုး (Ethnicity):</label>
                  <input
                    type="text"
                    name="motherEthnic"
                    value={formData.motherEthnic}
                    onChange={handleChange}
                    placeholder="ဗမာ"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>မွေးဖွားရာဌာန (Birthplace):</label>
                <input
                  type="text"
                  name="motherBirthplace"
                  value={formData.motherBirthplace}
                  onChange={handleChange}
                  placeholder="ရန်ကုန်"
                />
              </div>

              <div className="form-group">
                <label>လိပ်စာ (Address):</label>
                <textarea
                  name="motherAddress"
                  value={formData.motherAddress}
                  onChange={handleChange}
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label>ဖုန်းနံပါတ် (Phone):</label>
                <input
                  type="tel"
                  name="motherPhone"
                  value={formData.motherPhone}
                  onChange={handleChange}
                  placeholder="09xxxxxxxxx"
                />
              </div>
            </div>
          )}

          {/* SECTION 4: Parent Agreement */}
          {currentSection === 4 && (
            <div className="section">
              <h2 className="section-title">Section 4: Parent Agreement Form</h2>
              <p className="section-subtitle">မိဘ သဘောတူညီချက်</p>

              {/* Question 1: Financial Supporter */}
              <div className="form-group">
                <label className="question-label">
                  1. သင့်အားတက္ကသိုလ်တွင် ပညာသင်ကြားရန် ငွေကြေးထောက်ပံ့မည့်သူ: <span className="required">*</span>
                </label>
                <div className="radio-group-vertical">
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="financialSupporter"
                      value="father"
                      checked={formData.financialSupporter === 'father'}
                      onChange={handleChange}
                    />
                    <span>အဖ (Father)</span>
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="financialSupporter"
                      value="mother"
                      checked={formData.financialSupporter === 'mother'}
                      onChange={handleChange}
                    />
                    <span>အမေ (Mother)</span>
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="financialSupporter"
                      value="other"
                      checked={formData.financialSupporter === 'other'}
                      onChange={handleChange}
                    />
                    <span>အခြား (Other)</span>
                  </label>
                </div>
              </div>

              {/* Question 2: Financial Aid */}
              <div className="form-group">
                <label className="question-label">
                  2. တက္ကသိုလ်မှ ငွေကြေးအကူအညီ လိုအပ်ပါသလား?
                </label>
                <div className="checkbox-group-box">
                  <label className="checkbox-label-large">
                    <input
                      type="checkbox"
                      name="needsFinancialAid"
                      checked={formData.needsFinancialAid}
                      onChange={handleChange}
                    />
                    <div className="checkbox-content">
                      <span className="checkbox-title">လိုအပ်ပါသည်</span>
                      <span className="checkbox-desc">
                        (အက်ဒမင်မှ သင့်လျှောက်လွှာကို စစ်ဆေး၍ ဆုံးဖြတ်ပေးပါမည်)
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Question 3: Hostel */}
              <div className="form-group">
                <label className="question-label">
                  3. ဘော်ဒါ (Hostel) လိုအပ်ပါသလား?
                </label>
                <div className="checkbox-group-box">
                  <label className="checkbox-label-large">
                    <input
                      type="checkbox"
                      name="needsHostel"
                      checked={formData.needsHostel}
                      onChange={handleChange}
                    />
                    <div className="checkbox-content">
                      <span className="checkbox-title">လိုအပ်ပါသည်</span>
                      <span className="checkbox-desc">
                        (ကျောင်းနေထိုင်ခွင့် လိုအပ်ပါသည်)
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Family Registration Photo (if hostel needed) */}
              {formData.needsHostel && (
                <div className="form-group hostel-document">
                  <label>
                    အိမ်ထောင်စုစာရင်း ဓာတ်ပုံ (Family Registration):
                  </label>
                  <p className="helper-text">Family registration photo is required only when hostel is selected.</p>
                  <div className="image-upload-box">
                    {formData.familyRegistrationPreview ? (
                      <div className="image-preview">
                        <img src={formData.familyRegistrationPreview} alt="Family Registration" />
                        <button 
                          type="button" 
                          className="btn-change-image"
                          onClick={() => document.getElementById('familyReg')?.click()}
                        >
                          Change
                        </button>
                      </div>
                    ) : (
                      <label htmlFor="familyReg" className="upload-label">
                        <div className="upload-icon">Upload</div>
                        <p>Upload Family Registration</p>
                        <small>(အိမ်ထောင်စုစာရင်း)</small>
                      </label>
                    )}
                    <input
                      type="file"
                      id="familyReg"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, 'familyRegistrationPhoto', 'familyRegistrationPreview')}
                      style={{ display: 'none' }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SECTION 5: School Terms */}
          {currentSection === 5 && (
            <div className="section">
              <h2 className="section-title">Section 5: School Terms and Conditions</h2>
              <p className="section-subtitle">ကျောင်းစည်းကမ်းများ</p>

              <div className="terms-box">
                <h3>University of Information Technology - စည်းကမ်းချက်များ</h3>
                <ul className="terms-list">
                  <li>၁။ ကျောင်းသားသည် တက္ကသိုလ်၏ စည်းကမ်းချက်များကို လိုက်နာရမည်။</li>
                  <li>၂။ သင်တန်းတက်ရောက်ခြင်းတွင် အနည်းဆုံး ၇၅% တက်ရောက်ရမည်။</li>
                  <li>၃။ စာမေးပွဲများတွင် အဝတ်အစားသတ်မှတ်ချက်နှင့်အညီ ဝင်ရောက်ရမည်။</li>
                  <li>၄။ ကျောင်းပိုင်ဆိုင်မှုများကို မထိခိုက်စေရ၊ ထိခိုက်ပါက ပြန်လည်ပြင်ဆင်ပေးရမည်။</li>
                  <li>၅။ အခြားကျောင်းသားများ၏ အခွင့်အရေးများကို လေးစားရမည်။</li>
                  <li>၆။ စာသင်ကြားရေး လုပ်ငန်းစဉ်များကို ဂရုတစိုက် လုပ်ဆောင်ရမည်။</li>
                  <li>၇။ တက္ကသိုလ်၏ မျက်နှာသာကို ထိခိုက်စေသည့် လုပ်ရပ်များ မပြုလုပ်ရ။</li>
                  <li>၈။ သတ်မှတ်ထားသော စာရင်းကြေးများကို အချိန်မီ ပေးချေရမည်။</li>
                  <li>၉။ ကျောင်းထုတ်ခံရပါက ပြန်လည်လျှောက်ထားခွင့် မရှိပါ။</li>
                  <li>၁၀။ ဤစည်းကမ်းချက်များကို ချိုးဖောက်ပါက သင့်လျော်သော အရေးယူမှု ခံရမည်။</li>
                </ul>
              </div>

              <div className="checkbox-group-box acceptance">
                <label className="checkbox-label-large">
                  <input
                    type="checkbox"
                    name="schoolTermsAccepted"
                    checked={formData.schoolTermsAccepted}
                    onChange={handleChange}
                  />
                  <div className="checkbox-content">
                    <span className="checkbox-title">
                      အထက်ပါ ကျောင်းစည်းကမ်းချက်များအားလုံးကို ဖတ်ရှုပြီး သဘောတူပါသည် <span className="required">*</span>
                    </span>
                    <span className="checkbox-desc">
                      I have read and agree to all the school terms and conditions
                    </span>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* SECTION 6: Student Confession */}
          {currentSection === 6 && (
            <div className="section">
              <h2 className="section-title">Section 6: Student Confession</h2>
              <p className="section-subtitle">ကျောင်းသား ကတိသစ္စာ</p>

              <div className="confession-box">
                <h3>ကျောင်းသား ကတိသစ္စာ ပြုချက်</h3>
                <div className="confession-text">
                  <p>
                    အကျွန်ုပ်သည် University of Information Technology တွင် ပညာသင်ကြားရာ၌:
                  </p>
                  <ul>
                    <li>တက္ကသိုလ်၏ စည်းကမ်းချက်များကို တင်းကြပ်စွာ လိုက်နာပါမည်။</li>
                    <li>ဆရာ/ဆရာမများ၏ ညွှန်ကြားချက်များကို လေးစားလိုက်နာပါမည်။</li>
                    <li>အခြားကျောင်းသားများနှင့် ကောင်းမွန်သော ဆက်ဆံရေး ထိန်းသိမ်းပါမည်။</li>
                    <li>တက္ကသိုလ်၏ ဂုဏ်သိက္ခာကို မြှင့်တင်ရန် ကြိုးစားပါမည်။</li>
                    <li>သတ်မှတ်ထားသော စည်းကမ်းချက်များကို ချိုးဖောက်ပါက အပြစ်ဒဏ်ခံယူပါမည်။</li>
                  </ul>
                  <p className="confession-footer">
                    အထက်ပါအချက်များကို ကျွန်ုပ်၏ ကိုယ်ပိုင်ဆန္ဒဖြင့် ကတိပြုပါသည်။
                  </p>
                </div>
              </div>

              <div className="checkbox-group-box acceptance">
                <label className="checkbox-label-large">
                  <input
                    type="checkbox"
                    name="confessionAccepted"
                    checked={formData.confessionAccepted}
                    onChange={handleChange}
                  />
                  <div className="checkbox-content">
                    <span className="checkbox-title">
                      အထက်ပါ ကတိသစ္စာပြုချက်အား လက်ခံသဘောတူပါသည် <span className="required">*</span>
                    </span>
                    <span className="checkbox-desc">
                      I accept and agree to this confession statement
                    </span>
                  </div>
                </label>
              </div>

              <div className="final-note">
                <p>သတိပြုရန်: Form တင်သွင်းပြီးပါက ပြင်ဆင်၍ မရတော့ပါ။</p>
                <p>အချက်အလက်များ မှန်ကန်ကြောင်း သေချာပါစေ။</p>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="form-navigation">
            {currentSection > 1 && (
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={handlePrevious}
              >
                ← Previous
              </button>
            )}
            
            {currentSection < 6 ? (
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={handleNext}
              >
                Next →
              </button>
            ) : (
              <button 
                type="button" 
                className="btn btn-submit"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? 'တင်သွင်းနေသည်...' : 'Submit Form'}
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default StudentDetails;
