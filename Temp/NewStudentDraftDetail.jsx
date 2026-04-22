import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import '../styles/NewStudentDraftDetail.css';

function pick(...values) {
  return values.find((v) => v !== undefined && v !== null && String(v).trim() !== '');
}

function mapRegistrationToDraft(record) {
  if (!record) return null;
  const nestedStudent = record.student || record.studentDto || record.student_data || {};
  return {
    studentid: pick(record.studentid, record.student_id, record.studentId, nestedStudent.studentid, nestedStudent.id),
    registrationid: pick(record.id, record.registrationId, record.registration_id),
    namemm: pick(record.namemm, record.name_mm, record.student_name, record.full_name, nestedStudent.namemm, nestedStudent.name_mm) || 'Unknown',
    student_name: pick(record.student_name, record.studentName, record.full_name, record.fullName, nestedStudent.student_name, nestedStudent.studentName),
    father_name: pick(record.father_name, record.fatherName, nestedStudent.father_name, nestedStudent.fatherName),
    mother_name: pick(record.mother_name, record.motherName, nestedStudent.mother_name, nestedStudent.motherName),
    gender: pick(record.gender, nestedStudent.gender),
    birthplace: pick(record.birthplace, record.place_of_birth, nestedStudent.birthplace, nestedStudent.place_of_birth),
    date_of_birth: pick(record.date_of_birth, record.dateOfBirth, nestedStudent.date_of_birth, nestedStudent.dateOfBirth),
    nrc_number: pick(record.nrc_number, record.nrcNumber, nestedStudent.nrc_number, nestedStudent.nrcNumber),
    email: pick(record.email, record.student_email, nestedStudent.email),
    phone: pick(record.phone, record.phone_number, nestedStudent.phone),
    exam_roll_no: pick(record.exam_roll_no, record.examRollNo, nestedStudent.exam_roll_no, nestedStudent.examRollNo),
    matriculation_rollno: pick(record.matriculation_rollno, record.matriculation_roll_no, nestedStudent.matriculation_rollno, nestedStudent.matriculation_roll_no),
    matriculation_passed_year: pick(
      record.matriculation_passed_year,
      record.matriculationPassedYear,
      record.matriculation_year,
      record.matriculationYear,
      nestedStudent.matriculation_passed_year,
      nestedStudent.matriculationPassedYear,
      nestedStudent.matriculation_year,
      nestedStudent.matriculationYear
    ),
    totalmarks_obtained: pick(record.totalmarks_obtained, record.total_marks_obtained, record.total_marks, nestedStudent.totalmarks_obtained, nestedStudent.total_marks_obtained),
    academicyearentered: pick(record.academicyearentered, record.academic_year_entered, record.academicYearEntered, nestedStudent.academicyearentered, nestedStudent.academic_year_entered),
    division_or_state: pick(record.division_or_state, record.divisionOrState, nestedStudent.division_or_state),
    township: pick(record.township, nestedStudent.township),
    address: pick(record.address, nestedStudent.address),
    status: pick(record.status, nestedStudent.status) || 'DRAFT',
    createdAt: pick(record.createdAt, record.created_at, nestedStudent.createdAt)
  };
}

function formatDate(raw) {
  if (!raw) return '-';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return String(raw);
  return date.toLocaleDateString();
}

function NewStudentDraftDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const { recordId } = useParams();
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState(location.state?.draftRecord || null);

  const recordType = useMemo(() => (recordId || '').split('_')[0], [recordId]);
  const recordValue = useMemo(() => (recordId || '').split('_').slice(1).join('_'), [recordId]);

  useEffect(() => {
    const adminData = localStorage.getItem('adminData');
    if (!adminData) {
      navigate('/admin-login');
      return;
    }

    const loadDraft = async () => {
      try {
        let found = location.state?.draftRecord || null;

        if (!found && recordType === 's' && recordValue) {
          const students = await api.getStudents();
          found = students.find((s) => String(s.studentid || s.id) === recordValue);
        }

        if (!found && (recordType === 'r' || recordType === 'e')) {
          const registrations = await api.listRegistrations();
          const matched = registrations.find((r) => {
            if (recordType === 'r') {
              return String(r.id || r.registrationId || r.registration_id) === recordValue;
            }
            const emailValue = decodeURIComponent(recordValue || '').toLowerCase();
            return String(r.email || r.student_email || '').toLowerCase() === emailValue;
          });
          found = mapRegistrationToDraft(matched);
        }

        if (found) {
          const currentYear = pick(
            found.matriculation_passed_year,
            found.matriculationPassedYear,
            found.matriculation_year,
            found.matriculationYear
          );
          const studentId = pick(found.studentid, found.student_id, found.studentId, found.id);
          if (!currentYear && studentId) {
            try {
              const registrations = await api.listRegistrations(studentId);
              if (Array.isArray(registrations) && registrations.length > 0) {
                const latest = [...registrations].sort((a, b) => {
                  const aTime = new Date(a?.submittedAt || a?.submitted_at || a?.createdAt || a?.created_at || 0).getTime() || 0;
                  const bTime = new Date(b?.submittedAt || b?.submitted_at || b?.createdAt || b?.created_at || 0).getTime() || 0;
                  return bTime - aTime;
                })[0];
                const registrationDraft = mapRegistrationToDraft(latest);
                found = {
                  ...registrationDraft,
                  ...found,
                  registrationid: pick(
                    found.registrationid,
                    found.registrationId,
                    found.registration_id,
                    registrationDraft?.registrationid
                  ),
                  exam_roll_no: pick(
                    found.exam_roll_no,
                    found.examRollNo,
                    found.entrance_roll_no,
                    found.entranceRollNo,
                    registrationDraft?.exam_roll_no
                  ),
                  matriculation_rollno: pick(
                    found.matriculation_rollno,
                    found.matriculation_roll_no,
                    found.matriculationRollNo,
                    registrationDraft?.matriculation_rollno
                  ),
                  matriculation_passed_year: pick(
                    found.matriculation_passed_year,
                    found.matriculationPassedYear,
                    found.matriculation_year,
                    found.matriculationYear,
                    registrationDraft?.matriculation_passed_year
                  ),
                  totalmarks_obtained: pick(
                    found.totalmarks_obtained,
                    found.total_marks_obtained,
                    found.totalMarksObtained,
                    registrationDraft?.totalmarks_obtained
                  )
                };
              }
            } catch (_) {
              // Best-effort fallback only.
            }
          }
        }

        setDraft(found);
      } catch (error) {
        setDraft(null);
      } finally {
        setLoading(false);
      }
    };

    loadDraft();
  }, [location.state, navigate, recordType, recordValue]);

  if (loading) {
    return <div className="draft-detail-loading">Loading draft details...</div>;
  }

  if (!draft) {
    return (
      <div className="draft-detail-page">
        <div className="draft-detail-empty">
          <h2>Draft record not found</h2>
          <p>This draft may be removed or unavailable.</p>
          <button className="draft-btn back" onClick={() => navigate('/admin-dashboard')}>
            Back to Admin Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="draft-detail-page">
      <div className="draft-detail-wrap">
        <header className="draft-detail-header">
          <div>
            <h1>New Student Draft Detail</h1>
            <p>Registration form data submitted by student</p>
          </div>
          <button className="draft-btn back" onClick={() => navigate('/admin-dashboard')}>
            Back
          </button>
        </header>

        <section className="draft-detail-card">
          <div className="draft-badge">{String(draft.status || 'DRAFT').toUpperCase()}</div>
          <h2>{pick(draft.namemm, draft.student_name) || 'Unknown Student'}</h2>
          <p className="meta">Submitted: {formatDate(draft.createdAt)}</p>
        </section>

        <section className="draft-detail-grid">
          <div className="draft-section">
            <h3>Basic Information</h3>
            <p><strong>Student Name:</strong> {pick(draft.student_name, draft.namemm) || '-'}</p>
            <p><strong>Father Name:</strong> {draft.father_name || '-'}</p>
            <p><strong>Mother Name:</strong> {draft.mother_name || '-'}</p>
            <p><strong>Gender:</strong> {draft.gender || '-'}</p>
            <p><strong>Date of Birth:</strong> {formatDate(draft.date_of_birth)}</p>
            <p><strong>NRC Number:</strong> {draft.nrc_number || '-'}</p>
            <p><strong>Birthplace:</strong> {draft.birthplace || '-'}</p>
          </div>

          <div className="draft-section">
            <h3>Contact</h3>
            <p><strong>Email:</strong> {draft.email || '-'}</p>
            <p><strong>Phone:</strong> {draft.phone || '-'}</p>
            <p><strong>Address:</strong> {draft.address || '-'}</p>
          </div>

          <div className="draft-section">
            <h3>Exam / Academic</h3>
            <p><strong>Entrance Roll No:</strong> {draft.exam_roll_no || '-'}</p>
            <p><strong>Matric Roll No:</strong> {draft.matriculation_rollno || '-'}</p>
            <p><strong>Matric Passed Year:</strong> {draft.matriculation_passed_year || '-'}</p>
            <p><strong>Total Marks:</strong> {draft.totalmarks_obtained || '-'}</p>
            <p><strong>Academic Year Entered:</strong> {draft.academicyearentered || '-'}</p>
          </div>
        </section>
      </div>
    </div>
  );
}

export default NewStudentDraftDetail;
