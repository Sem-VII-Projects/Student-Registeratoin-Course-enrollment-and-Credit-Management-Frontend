import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import '../styles/AdminTermManagement.css';

const SECTION_OPTIONS = ['A', 'B', 'C', 'D'];
const STATUS_OPTIONS = [
  'PENDING',
  'REGISTERED',
  'ENROLLED',
  'COMPLETED',
  'FAILED',
  'REEXAM_PENDING',
  'REEXAM_PASSED',
  'TERMINATED',
  'WITHDRAWN'
];

const formatApiError = (error, fallbackMessage) => {
  const code = error?.apiCode || error?.code;
  const message = error?.apiMessage || error?.message || fallbackMessage;
  return code ? `${code}: ${message}` : message;
};

const toSemesterNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 1;
};

const deriveNextTermDefaults = (academicYear, semester) => {
  const normalizedSemester = toSemesterNumber(semester);
  if (normalizedSemester === 1) {
    return {
      nextAcademicYear: academicYear || '',
      nextSemester: '2'
    };
  }

  const match = String(academicYear || '').trim().match(/^(\d{4})-(\d{4})$/);
  if (!match) {
    return {
      nextAcademicYear: String(academicYear || '').trim(),
      nextSemester: '1'
    };
  }
  const startYear = Number(match[1]);
  const endYear = Number(match[2]);
  return {
    nextAcademicYear: `${startYear + 1}-${endYear + 1}`,
    nextSemester: '1'
  };
};

const normalizeEnrollments = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.enrollments)) return payload.enrollments;
  return [];
};

const normalizeTerm = (payload, fallback = null) => {
  if (!payload && !fallback) return null;
  const base = fallback || {};
  const semesterRaw = payload?.semester ?? payload?.currentSemester ?? base.semester ?? 1;
  return {
    academicYear: payload?.academicYear || payload?.currentAcademicYear || base.academicYear || '',
    semester: toSemesterNumber(semesterRaw),
    enrollmentOpen: payload?.enrollmentOpen ?? base.enrollmentOpen ?? false
  };
};

const toClassToken = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const getConfiguredYears = () => {
  try {
    const raw = localStorage.getItem('registration_form_data');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const configArray = Array.isArray(parsed) ? parsed : [parsed];
    const latestConfig = configArray[configArray.length - 1] || {};
    const totalYears = Number(latestConfig?.header?.totalYears);
    if (!Number.isFinite(totalYears) || totalYears <= 0) return [];
    return Array.from({ length: totalYears }, (_, index) => index + 1);
  } catch (_) {
    return [];
  }
};

function AdminTermManagement() {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState(null);
  const [currentTerm, setCurrentTerm] = useState(null);
  const [rolloverReport, setRolloverReport] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [filters, setFilters] = useState({
    yearLevel: '',
    section: '',
    status: ''
  });
  const [discoveredYearLevels, setDiscoveredYearLevels] = useState([]);
  const [selectedEnrollmentIds, setSelectedEnrollmentIds] = useState([]);
  const [loadingPage, setLoadingPage] = useState(true);
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);
  const [rowActionKey, setRowActionKey] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [prepareLoading, setPrepareLoading] = useState(false);
  const [toggleEnrollmentLoading, setToggleEnrollmentLoading] = useState(false);
  const [prepareForm, setPrepareForm] = useState({
    nextAcademicYear: '',
    nextSemester: '1'
  });
  const handleAdminUnauthorized = useCallback((error) => {
    if (error?.status === 401 || error?.status === 403) {
      localStorage.removeItem('adminData');
      localStorage.removeItem('adminAuthToken');
      navigate('/admin-login');
      return true;
    }
    return false;
  }, [navigate]);

  const fetchRolloverReport = useCallback(async (term) => {
    if (!term?.academicYear || !term?.semester) {
      setRolloverReport(null);
      return;
    }
    const report = await api.getRolloverReport({
      academicYear: term.academicYear,
      semester: term.semester
    });
    setRolloverReport(report || null);
  }, []);

  const fetchTermEnrollments = useCallback(async (term, activeFilters) => {
    if (!term?.academicYear || !term?.semester) {
      setEnrollments([]);
      setSelectedEnrollmentIds([]);
      return;
    }
    setLoadingEnrollments(true);
    try {
      const payload = await api.adminListTermEnrollments({
        academicYear: term.academicYear,
        semester: term.semester,
        yearLevel: activeFilters?.yearLevel || undefined,
        section: activeFilters?.section || undefined,
        status: activeFilters?.status || undefined
      });
      const list = normalizeEnrollments(payload);
      setEnrollments(list);
      setDiscoveredYearLevels((prev) => {
        const next = new Set(prev);
        list.forEach((row) => {
          const yearLevel = Number(row?.yearLevel);
          if (Number.isFinite(yearLevel) && yearLevel > 0) {
            next.add(yearLevel);
          }
        });
        return Array.from(next).sort((a, b) => a - b);
      });
      setSelectedEnrollmentIds((prev) => prev.filter((id) => list.some((row) => row.enrollmentId === id)));
    } catch (error) {
      setEnrollments([]);
      setSelectedEnrollmentIds([]);
      if (handleAdminUnauthorized(error)) return;
      alert(formatApiError(error, 'Failed to load term enrollments.'));
    } finally {
      setLoadingEnrollments(false);
    }
  }, [handleAdminUnauthorized]);

  const loadInitialData = useCallback(async () => {
    setLoadingPage(true);
    try {
      const term = await api.getCurrentTerm();
      const normalizedTerm = normalizeTerm(term);
      setCurrentTerm(normalizedTerm);
      await fetchRolloverReport(normalizedTerm);
      const nextTermDefaults = deriveNextTermDefaults(normalizedTerm?.academicYear, normalizedTerm?.semester);
      setPrepareForm(nextTermDefaults);
    } catch (error) {
      if (handleAdminUnauthorized(error)) return;
      alert(formatApiError(error, 'Failed to load current term.'));
    } finally {
      setLoadingPage(false);
    }
  }, [fetchRolloverReport, handleAdminUnauthorized]);

  useEffect(() => {
    const adminData = localStorage.getItem('adminData');
    if (!adminData) {
      navigate('/admin-login');
      return;
    }
    try {
      setAdmin(JSON.parse(adminData));
    } catch (error) {
      localStorage.removeItem('adminData');
      localStorage.removeItem('adminAuthToken');
      navigate('/admin-login');
      return;
    }
    loadInitialData();
  }, [navigate, loadInitialData]);

  useEffect(() => {
    if (!currentTerm?.academicYear || !currentTerm?.semester) return;
    fetchTermEnrollments(currentTerm, {
      yearLevel: filters.yearLevel,
      section: filters.section,
      status: filters.status
    });
  }, [currentTerm, filters.yearLevel, filters.section, filters.status, fetchTermEnrollments]);

  const allVisibleIds = useMemo(
    () => enrollments.map((row) => row.enrollmentId).filter(Boolean),
    [enrollments]
  );

  const allVisibleSelected = useMemo(() => {
    if (allVisibleIds.length === 0) return false;
    return allVisibleIds.every((id) => selectedEnrollmentIds.includes(id));
  }, [allVisibleIds, selectedEnrollmentIds]);

  const selectedCount = selectedEnrollmentIds.length;
  const configuredYears = useMemo(() => getConfiguredYears(), []);
  const yearOptions = useMemo(() => {
    const next = new Set();
    configuredYears.forEach((year) => next.add(year));
    discoveredYearLevels.forEach((year) => next.add(year));
    return Array.from(next).sort((a, b) => a - b);
  }, [configuredYears, discoveredYearLevels]);
  const termLabel = currentTerm?.academicYear && currentTerm?.semester
    ? `${currentTerm.academicYear} \u2022 Semester ${currentTerm.semester}`
    : '-';

  const refreshTableAndReport = useCallback(async () => {
    if (!currentTerm) return;
    await Promise.all([
      fetchTermEnrollments(currentTerm, {
        yearLevel: filters.yearLevel,
        section: filters.section,
        status: filters.status
      }),
      fetchRolloverReport(currentTerm)
    ]);
  }, [currentTerm, filters.yearLevel, filters.section, filters.status, fetchTermEnrollments, fetchRolloverReport]);

  const handleToggleAll = () => {
    if (allVisibleSelected) {
      setSelectedEnrollmentIds((prev) => prev.filter((id) => !allVisibleIds.includes(id)));
      return;
    }
    setSelectedEnrollmentIds((prev) => Array.from(new Set([...prev, ...allVisibleIds])));
  };

  const handleToggleOne = (enrollmentId) => {
    if (!enrollmentId) return;
    setSelectedEnrollmentIds((prev) =>
      prev.includes(enrollmentId)
        ? prev.filter((id) => id !== enrollmentId)
        : [...prev, enrollmentId]
    );
  };

  const handleSetResult = async (enrollmentId, result) => {
    if (!enrollmentId) return;
    setRowActionKey(`${enrollmentId}:${result}:result`);
    try {
      await api.adminSetTermResult(enrollmentId, result);
      await refreshTableAndReport();
    } catch (error) {
      alert(formatApiError(error, `Failed to set ${result} result.`));
    } finally {
      setRowActionKey('');
    }
  };

  const handleSetReexamResult = async (enrollmentId, result) => {
    if (!enrollmentId) return;
    setRowActionKey(`${enrollmentId}:${result}:reexam`);
    try {
      await api.adminSetTermReexamResult(enrollmentId, result);
      await refreshTableAndReport();
    } catch (error) {
      alert(formatApiError(error, `Failed to set reexam result ${result}.`));
    } finally {
      setRowActionKey('');
    }
  };

  const summarizeBulkResponse = (summary, actionLabel) => {
    if (!summary || typeof summary !== 'object') return;
    const errors = Array.isArray(summary.errors) ? summary.errors : [];
    const firstThreeErrors = errors.slice(0, 3)
      .map((error) => `${error.id || 'unknown'} - ${error.code || 'ERROR'}: ${error.message || 'Failed'}`)
      .join('\n');
    const message = [
      `${actionLabel} completed.`,
      `Updated: ${summary.updated ?? 0}`,
      `Skipped: ${summary.skipped ?? 0}`,
      errors.length > 0 ? `Errors:\n${firstThreeErrors}` : ''
    ].filter(Boolean).join('\n');
    alert(message);
  };

  const handleBulkSetResult = async (result) => {
    if (selectedEnrollmentIds.length === 0) {
      alert('Select at least one enrollment first.');
      return;
    }
    setBulkLoading(true);
    try {
      const summary = await api.adminBulkSetTermResult(selectedEnrollmentIds, result);
      summarizeBulkResponse(summary, `Bulk ${result}`);
      await refreshTableAndReport();
    } catch (error) {
      alert(formatApiError(error, `Bulk ${result} failed.`));
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkSetReexam = async (result) => {
    if (selectedEnrollmentIds.length === 0) {
      alert('Select at least one enrollment first.');
      return;
    }
    setBulkLoading(true);
    try {
      const summary = await api.adminBulkSetTermReexamResult(selectedEnrollmentIds, result);
      summarizeBulkResponse(summary, `Bulk reexam ${result}`);
      await refreshTableAndReport();
    } catch (error) {
      alert(formatApiError(error, `Bulk reexam ${result} failed.`));
    } finally {
      setBulkLoading(false);
    }
  };

  const handlePrepareRollover = async (event) => {
    event.preventDefault();
    if (!prepareForm.nextAcademicYear || !prepareForm.nextSemester) {
      alert('nextAcademicYear and nextSemester are required.');
      return;
    }
    setPrepareLoading(true);
    try {
      const updated = await api.adminPrepareRollover({
        nextAcademicYear: prepareForm.nextAcademicYear,
        nextSemester: Number(prepareForm.nextSemester)
      });
      const updatedTerm = normalizeTerm(updated, {
        academicYear: prepareForm.nextAcademicYear,
        semester: Number(prepareForm.nextSemester),
        enrollmentOpen: false
      });
      setCurrentTerm(updatedTerm);
      setSelectedEnrollmentIds([]);
      await Promise.all([
        fetchRolloverReport(updatedTerm),
        fetchTermEnrollments(updatedTerm, {
          yearLevel: filters.yearLevel,
          section: filters.section,
          status: filters.status
        })
      ]);
      setPrepareForm(deriveNextTermDefaults(updatedTerm.academicYear, updatedTerm.semester));
      alert('Rollover prepared successfully.');
    } catch (error) {
      alert(formatApiError(error, 'Failed to prepare rollover.'));
    } finally {
      setPrepareLoading(false);
    }
  };

  const handleToggleEnrollmentOpen = async () => {
    if (!currentTerm?.academicYear || !currentTerm?.semester) {
      alert('Current term is unavailable.');
      return;
    }
    const nextOpenState = !Boolean(currentTerm.enrollmentOpen);
    const confirmed = window.confirm(
      nextOpenState
        ? 'Open enrollment for the current term now?'
        : 'Close enrollment for the current term now?'
    );
    if (!confirmed) return;

    setToggleEnrollmentLoading(true);
    try {
      const updated = await api.updateAdminTermConfig({
        academicYear: currentTerm.academicYear,
        semester: currentTerm.semester,
        enrollmentOpen: nextOpenState
      });
      const updatedTerm = normalizeTerm(updated, currentTerm);
      setCurrentTerm(updatedTerm);
      alert(nextOpenState ? 'Enrollment is now OPEN.' : 'Enrollment is now CLOSED.');
    } catch (error) {
      alert(formatApiError(error, 'Failed to update enrollment state.'));
    } finally {
      setToggleEnrollmentLoading(false);
    }
  };

  return (
    <div className="term-management-page">
      <header className="term-management-header">
        <div>
          <h1>Term Management</h1>
          <p>{termLabel}</p>
          <p className={`term-open-state ${currentTerm?.enrollmentOpen ? 'open' : 'closed'}`}>
            Enrollment: {currentTerm?.enrollmentOpen ? 'Open' : 'Closed'}
          </p>
        </div>
        <div className="term-management-header-actions">
          <span className="admin-name">Admin: {admin?.adminname || 'System Admin'}</span>
          <button
            type="button"
            className={`tm-btn ${currentTerm?.enrollmentOpen ? 'tm-btn-fail' : 'tm-btn-pass'}`}
            onClick={handleToggleEnrollmentOpen}
            disabled={loadingPage || toggleEnrollmentLoading || !currentTerm}
          >
            {toggleEnrollmentLoading
              ? 'Updating...'
              : currentTerm?.enrollmentOpen
                ? 'Close Enrollment'
                : 'Open Enrollment'}
          </button>
          <button type="button" className="tm-btn tm-btn-secondary" onClick={() => navigate('/admin-dashboard')}>
            Back to Dashboard
          </button>
          <button type="button" className="tm-btn tm-btn-primary" onClick={loadInitialData} disabled={loadingPage}>
            Refresh
          </button>
        </div>
      </header>

      <section className="term-summary-cards">
        <div className="term-summary-card">
          <strong>Total Enrollments</strong>
          <span>{rolloverReport?.counts?.totalEnrollments ?? 0}</span>
        </div>
        <div className="term-summary-card">
          <strong>Completed Pass</strong>
          <span>{rolloverReport?.counts?.completedPass ?? 0}</span>
        </div>
        <div className="term-summary-card">
          <strong>Completed Fail</strong>
          <span>{rolloverReport?.counts?.completedFail ?? 0}</span>
        </div>
        <div className="term-summary-card">
          <strong>Reexam Pending</strong>
          <span>{rolloverReport?.counts?.reexamPending ?? 0}</span>
        </div>
        <div className="term-summary-card">
          <strong>Unfinished</strong>
          <span>{rolloverReport?.counts?.unfinished ?? 0}</span>
        </div>
        <div className="term-summary-card">
          <strong>Ready To Rollover</strong>
          <span>{rolloverReport?.readyToRollover ? 'YES' : 'NO'}</span>
        </div>
      </section>

      <section className="term-management-actions">
        <div className="term-filters">
          <label>
            Year
            <select
              value={filters.yearLevel}
              onChange={(event) => setFilters((prev) => ({ ...prev, yearLevel: event.target.value }))}
            >
              <option value="">All Years</option>
              {yearOptions.map((yearLevel) => (
                <option key={yearLevel} value={String(yearLevel)}>
                  Year {yearLevel}
                </option>
              ))}
            </select>
          </label>
          <label>
            Section
            <select
              value={filters.section}
              onChange={(event) => setFilters((prev) => ({ ...prev, section: event.target.value }))}
            >
              <option value="">All Sections</option>
              {SECTION_OPTIONS.map((section) => (
                <option key={section} value={section}>{section}</option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select
              value={filters.status}
              onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
            >
              <option value="">All Status</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="term-bulk-actions">
          <span className="term-selected-count">{selectedCount} selected</span>
          <button className="tm-btn tm-btn-pass" type="button" onClick={() => handleBulkSetResult('PASS')} disabled={bulkLoading || selectedCount === 0}>
            Bulk PASS
          </button>
          <button className="tm-btn tm-btn-fail" type="button" onClick={() => handleBulkSetResult('FAIL')} disabled={bulkLoading || selectedCount === 0}>
            Bulk FAIL
          </button>
          <button className="tm-btn tm-btn-reexam-pass" type="button" onClick={() => handleBulkSetReexam('PASS')} disabled={bulkLoading || selectedCount === 0}>
            Bulk Reexam PASS
          </button>
          <button className="tm-btn tm-btn-reexam-fail" type="button" onClick={() => handleBulkSetReexam('FAIL')} disabled={bulkLoading || selectedCount === 0}>
            Bulk Reexam FAIL
          </button>
        </div>
      </section>

      <section className="term-management-table-wrapper">
        <table className="term-management-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={handleToggleAll}
                  disabled={allVisibleIds.length === 0}
                />
              </th>
              <th>Student</th>
              <th>Student ID</th>
              <th>Year</th>
              <th>Section</th>
              <th>Status</th>
              <th>Result</th>
              <th>Reexam Taken</th>
              <th>Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loadingPage || loadingEnrollments ? (
              <tr>
                <td colSpan={10} className="term-loading-cell">Loading enrollments...</td>
              </tr>
            ) : enrollments.length === 0 ? (
              <tr>
                <td colSpan={10} className="term-loading-cell">No enrollments found for selected filters.</td>
              </tr>
            ) : (
              enrollments.map((row) => {
                const status = String(row?.termStatus || '').toUpperCase();
                const canSetResult = status === 'REGISTERED' || status === 'ENROLLED';
                const canSetReexam = status === 'REEXAM_PENDING';
                const rowId = row?.enrollmentId;
                const isRowBusy = rowActionKey.startsWith(`${rowId}:`);
                const statusToken = toClassToken(row?.termStatus) || 'na';
                const resultToken = toClassToken(row?.result) || 'na';
                const reexamTaken = Boolean(row?.reexamTaken);
                return (
                  <tr key={rowId}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedEnrollmentIds.includes(rowId)}
                        onChange={() => handleToggleOne(rowId)}
                      />
                    </td>
                    <td>{row?.studentName || '-'}</td>
                    <td>{row?.studentId || '-'}</td>
                    <td>{row?.yearLevel ?? '-'}</td>
                    <td>{row?.section || '-'}</td>
                    <td>
                      <span className={`tm-pill tm-pill-status tm-pill-${statusToken}`}>
                        {row?.termStatus || '-'}
                      </span>
                    </td>
                    <td>
                      <span className={`tm-pill tm-pill-result tm-pill-${resultToken}`}>
                        {row?.result || '-'}
                      </span>
                    </td>
                    <td>
                      <span className={`tm-pill tm-pill-flag ${reexamTaken ? 'tm-pill-yes' : 'tm-pill-no'}`}>
                        {reexamTaken ? 'YES' : 'NO'}
                      </span>
                    </td>
                    <td>{row?.updatedAt || row?.createdAt || '-'}</td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="tm-btn tm-btn-pass"
                          type="button"
                          onClick={() => handleSetResult(rowId, 'PASS')}
                          disabled={!canSetResult || isRowBusy}
                        >
                          PASS
                        </button>
                        <button
                          className="tm-btn tm-btn-fail"
                          type="button"
                          onClick={() => handleSetResult(rowId, 'FAIL')}
                          disabled={!canSetResult || isRowBusy}
                        >
                          FAIL
                        </button>
                        {canSetReexam && (
                          <>
                            <button
                              className="tm-btn tm-btn-reexam-pass"
                              type="button"
                              onClick={() => handleSetReexamResult(rowId, 'PASS')}
                              disabled={isRowBusy}
                            >
                              REEXAM PASS
                            </button>
                            <button
                              className="tm-btn tm-btn-reexam-fail"
                              type="button"
                              onClick={() => handleSetReexamResult(rowId, 'FAIL')}
                              disabled={isRowBusy}
                            >
                              REEXAM FAIL
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>

      <section className="term-rollover-panel">
        <h2>Prepare Rollover</h2>
        <form onSubmit={handlePrepareRollover} className="term-rollover-form">
          <label>
            Next Academic Year
            <input
              type="text"
              value={prepareForm.nextAcademicYear}
              onChange={(event) => setPrepareForm((prev) => ({ ...prev, nextAcademicYear: event.target.value }))}
              placeholder="2026-2027"
              required
            />
          </label>
          <label>
            Next Semester
            <select
              value={prepareForm.nextSemester}
              onChange={(event) => setPrepareForm((prev) => ({ ...prev, nextSemester: event.target.value }))}
              required
            >
              <option value="1">1</option>
              <option value="2">2</option>
            </select>
          </label>
          <button className="tm-btn tm-btn-primary" type="submit" disabled={prepareLoading}>
            {prepareLoading ? 'Preparing...' : 'Prepare Rollover'}
          </button>
        </form>
      </section>
    </div>
  );
}

export default AdminTermManagement;
