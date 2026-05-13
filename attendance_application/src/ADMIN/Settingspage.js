import React, { useEffect, useState, useRef, useCallback } from 'react';
import './ccs/settings.css';
//Settingspage.js

import {
  getDepartments, getPositions, getLocations,
  addDepartment, addPosition, addLocation,
  updateDepartment, deleteDepartment,
  updatePosition, deletePosition,
  updateLocation, deleteLocation,
} from '../api';

const TAB_CONFIG = [
  { key: 'branding',    label: 'Branding',    icon: 'bi-palette-fill' },
  { key: 'departments', label: 'Departments', icon: 'bi-diagram-3-fill' },
  { key: 'positions',   label: 'Positions',   icon: 'bi-person-badge-fill' },
  { key: 'locations',   label: 'Locations',   icon: 'bi-geo-alt-fill' },
  { key: 'pdf_export',  label: 'PDF Export',  icon: 'bi-file-earmark-pdf-fill' },
];

const PLP_LOGO_KEY    = 'plp_logo';
const DEPT_LOGOS_KEY  = 'dept_logos';
const NAME_KEY        = 'institution_name';

export const PDF_PASIG_LOGO_KEY      = 'pdf_pasig_logo';
export const PDF_WORDMARK_KEY        = 'pdf_wordmark_logo';
export const PDF_OFFICE_NAME_KEY     = 'pdf_office_name';
export const PDF_ADDRESS_KEY         = 'pdf_address';
export const PDF_CONTACT_KEY         = 'pdf_contact';
export const PDF_RECORDED_BY_KEY     = 'pdf_recorded_by';
export const PDF_SIGNATORY_KEY       = 'pdf_signatory';
export const PDF_SIGNATORY_TITLE_KEY = 'pdf_signatory_title';

// ─────────────────────────────────────────────────────────────────────────────
// usePortaledFileInput
// Creates an <input type="file"> directly on document.body (position:fixed,
// off-screen) so it NEVER lives inside the scrollable panel and therefore can
// never trigger a scroll-jump when .click() is called.
// ─────────────────────────────────────────────────────────────────────────────
function usePortaledFileInput(onFileChange) {
  const inputRef = useRef(null);

  useEffect(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    // Fixed + off-screen = completely outside any scroll container
    input.style.cssText =
      'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;';
    input.tabIndex = -1;

    const handler = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => onFileChange(ev.target.result);
      reader.readAsDataURL(file);
      // Reset so the same file can be re-selected
      input.value = '';
    };

    input.addEventListener('change', handler);
    document.body.appendChild(input);
    inputRef.current = input;

    return () => {
      input.removeEventListener('change', handler);
      if (input.parentNode) input.parentNode.removeChild(input);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stable "open picker" callback — safe to use in onClick handlers
  const open = useCallback((e) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    inputRef.current?.click();
  }, []);

  return open;
}

// ── Reusable Modal ────────────────────────────────────────────────────────────
function SettingsModal({ modal, onConfirm, onCancel }) {
  const inputRef = useRef(null);

  useEffect(() => {
    if (modal?.type === 'input' && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [modal]);

  if (!modal) return null;

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && modal.type === 'input') onConfirm(inputRef.current?.value);
    if (e.key === 'Escape') onCancel();
  };

  return (
    <div className="settings-modal-overlay" onClick={onCancel}>
      <div className="settings-modal" onClick={e => e.stopPropagation()} onKeyDown={handleKeyDown}>
        <div className={`settings-modal-icon ${modal.variant || 'primary'}`}>
          <i className={`bi ${modal.icon || 'bi-question-circle'}`}></i>
        </div>
        <h3 className="settings-modal-title">{modal.title}</h3>
        {modal.message && <p className="settings-modal-message">{modal.message}</p>}
        {modal.type === 'input' && (
          <input
            ref={inputRef}
            type="text"
            className="settings-modal-input"
            defaultValue={modal.defaultValue || ''}
            placeholder={modal.placeholder || 'Enter name...'}
          />
        )}
        <div className="settings-modal-actions">
          <button type="button" className="settings-modal-btn-cancel" onClick={onCancel}>Cancel</button>
          <button
            type="button"
            className={`settings-modal-btn-confirm ${modal.variant || 'primary'}`}
            onClick={() => onConfirm(modal.type === 'input' ? inputRef.current?.value : true)}
          >
            <i className={`bi ${modal.confirmIcon || 'bi-check-lg'}`}></i>
            {modal.confirmLabel || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Logo Upload Box (used in Dept Logos grid) ─────────────────────────────────
function LogoUploadBox({ label, hint, previewUrl, onFileChange, onClear }) {
  const open = usePortaledFileInput(onFileChange);

  return (
    <div className="logo-upload-box">
      <div
        className="logo-preview-circle"
        onClick={open}
        title="Click to choose a logo"
        style={{ cursor: 'pointer', overflow: 'hidden', position: 'relative' }}
      >
        {previewUrl ? (
          <>
            <img
              src={previewUrl}
              alt="Logo preview"
              style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 8, display: 'block' }}
            />
            <div
              className="logo-hover-overlay"
              style={{
                position: 'absolute', inset: 0,
                background: 'rgba(0,0,0,0.45)',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                opacity: 0, transition: 'opacity .2s',
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = 1}
              onMouseLeave={e => e.currentTarget.style.opacity = 0}
            >
              <i className="bi bi-camera" style={{ fontSize: 22, color: '#fff' }}></i>
              <span style={{ fontSize: 12, color: '#fff', marginTop: 4 }}>Change</span>
            </div>
          </>
        ) : (
          <>
            <i className="bi bi-building"></i>
            <span>Click to<br />upload logo</span>
          </>
        )}
      </div>

      <p className="logo-upload-hint" style={{ textAlign: 'center', fontWeight: 600, color: '#374151', marginBottom: 2 }}>{label}</p>
      <p className="logo-upload-hint">{hint || 'PNG or JPG · Max 2MB'}</p>

      {previewUrl && onClear && (
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); onClear(); }}
          style={{
            marginTop: 4, background: 'none', border: '1px solid #fecaca',
            borderRadius: 8, padding: '3px 10px', fontSize: 12, color: '#dc2626', cursor: 'pointer',
          }}
        >
          <i className="bi bi-x-lg me-1"></i>Remove
        </button>
      )}
    </div>
  );
}

// ── Inline Logo Upload (horizontal — PDF Export & Branding) ───────────────────
function InlineLogoUpload({ label, hint, previewUrl, onFileChange, onClear, disabled }) {
  const open = usePortaledFileInput(onFileChange);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16,
      padding: '14px 0', borderBottom: '1px solid #f3f4f6',
      opacity: disabled ? 0.55 : 1,
      pointerEvents: disabled ? 'none' : 'auto',
    }}>
      {/* Preview thumbnail */}
      <div
        onClick={disabled ? undefined : open}
        title={disabled ? '' : 'Click to change logo'}
        style={{
          width: 72, height: 72, flexShrink: 0,
          border: '1.5px dashed #d1d5db', borderRadius: 10,
          background: '#f9fafb', cursor: disabled ? 'default' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', position: 'relative',
        }}
      >
        {previewUrl ? (
          <>
            <img src={previewUrl} alt={label} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 6 }} />
            {!disabled && (
              <div
                style={{
                  position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: 0, transition: 'opacity .2s',
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = 1}
                onMouseLeave={e => e.currentTarget.style.opacity = 0}
              >
                <i className="bi bi-camera" style={{ fontSize: 18, color: '#fff' }}></i>
              </div>
            )}
          </>
        ) : (
          <i className="bi bi-image" style={{ fontSize: 22, color: '#d1d5db' }}></i>
        )}
      </div>

      {/* Info + buttons */}
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 2 }}>{label}</p>
        <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 8 }}>{hint || 'PNG or JPG · Max 2MB'}</p>
        {!disabled && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={open}
              style={{
                fontSize: 12, padding: '4px 12px', borderRadius: 6, cursor: 'pointer',
                background: '#f3f4f6', border: '1px solid #d1d5db', color: '#374151',
              }}
            >
              <i className="bi bi-upload me-1"></i>Upload
            </button>
            {previewUrl && onClear && (
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); onClear(); }}
                style={{
                  fontSize: 12, padding: '4px 12px', borderRadius: 6, cursor: 'pointer',
                  background: 'none', border: '1px solid #fecaca', color: '#dc2626',
                }}
              >
                <i className="bi bi-x-lg me-1"></i>Remove
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── DepartmentLogos sub-panel ─────────────────────────────────────────────────
function DepartmentLogosPanel({ departments, openModal }) {
  const [deptLogos, setDeptLogos] = useState(() => {
    try { return JSON.parse(localStorage.getItem(DEPT_LOGOS_KEY) || '{}'); }
    catch { return {}; }
  });
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleLogoChange = (deptName, dataUrl) =>
    setDeptLogos(prev => ({ ...prev, [deptName]: dataUrl }));

  const handleRemoveLogo = (deptName) =>
    setDeptLogos(prev => { const n = { ...prev }; delete n[deptName]; return n; });

  const handleSave = async () => {
    const confirmed = await openModal({
      type: 'confirm', variant: 'primary', icon: 'bi-check-circle',
      title: 'Save Department Logos',
      message: 'Save the logos for all departments? This will update the college logos used in attendance exports.',
      confirmLabel: 'Save Logos', confirmIcon: 'bi-check-lg',
    });
    if (!confirmed) return;
    localStorage.setItem(DEPT_LOGOS_KEY, JSON.stringify(deptLogos));
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  if (!departments || departments.length === 0) {
    return (
      <div className="list-empty">
        <i className="bi bi-diagram-3" style={{ fontSize: 36, display: 'block', marginBottom: 10, opacity: 0.5 }}></i>
        <p>No departments found. Add departments first.</p>
      </div>
    );
  }

  return (
    <div>
      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>
        Each department can have its own college logo. This logo appears on the right side of attendance exports when that department is selected.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 20, marginBottom: 24 }}>
        {departments.map((dept, i) => {
          const name = dept.department_name;
          return (
            <div key={i} style={{
              background: '#f9fafb', border: '1px solid #e5e7eb',
              borderRadius: 12, padding: '16px 12px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
            }}>
              <LogoUploadBox
                label={name}
                hint="College logo"
                previewUrl={deptLogos[name] || null}
                onFileChange={url => handleLogoChange(name, url)}
                onClear={() => handleRemoveLogo(name)}
              />
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          type="button"
          className="btn-settings-primary"
          onClick={handleSave}
          style={saveSuccess ? { background: '#155724' } : {}}
        >
          {saveSuccess
            ? <><i className="bi bi-check2-all"></i> Saved!</>
            : <><i className="bi bi-check-lg"></i> Save Department Logos</>}
        </button>
      </div>
    </div>
  );
}

// ── PDF Export: stable helper components (defined OUTSIDE panel to prevent
//    remount-on-state-change which caused scroll-to-top when clicking fields) ──

function PdfSection({ title, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <p style={{
        fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase',
        letterSpacing: '0.6px', marginBottom: 14, paddingBottom: 6,
        borderBottom: '1px solid #f3f4f6',
      }}>{title}</p>
      {children}
    </div>
  );
}

// ── PDF Export Settings Panel ─────────────────────────────────────────────────
function PdfExportPanel({ openModal }) {
  const [fields, setFields] = useState({
    pasigLogo:      localStorage.getItem(PDF_PASIG_LOGO_KEY)      || '',
    wordmarkLogo:   localStorage.getItem(PDF_WORDMARK_KEY)         || '',
    officeName:     localStorage.getItem(PDF_OFFICE_NAME_KEY)      || 'Office of the Human Resource Development',
    address:        localStorage.getItem(PDF_ADDRESS_KEY)          || 'Alkalde Jose St., Kapasigan, Pasig City, Philippines 1600',
    contact:        localStorage.getItem(PDF_CONTACT_KEY)          || '638-1014 Loc. 106  |  hrd@plpasig.edu.ph',
    recordedBy:     localStorage.getItem(PDF_RECORDED_BY_KEY)      || 'Recorded by HRD Personnel\nAttendance checked/monitored by:',
    signatory:      localStorage.getItem(PDF_SIGNATORY_KEY)        || 'Signature Over Printed Name',
    signatoryTitle: localStorage.getItem(PDF_SIGNATORY_TITLE_KEY)  || 'Head of Office',
  });

  const [saveSuccess, setSaveSuccess] = useState(false);

  const setKey = (key) => (val) =>
    setFields(prev => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    const confirmed = await openModal({
      type: 'confirm', variant: 'primary', icon: 'bi-file-earmark-pdf',
      title: 'Save PDF Export Settings',
      message: 'Save these settings? They will be applied to all future attendance PDF exports.',
      confirmLabel: 'Save Settings', confirmIcon: 'bi-check-lg',
    });
    if (!confirmed) return;

    localStorage.setItem(PDF_PASIG_LOGO_KEY,      fields.pasigLogo);
    localStorage.setItem(PDF_WORDMARK_KEY,         fields.wordmarkLogo);
    localStorage.setItem(PDF_OFFICE_NAME_KEY,      fields.officeName);
    localStorage.setItem(PDF_ADDRESS_KEY,          fields.address);
    localStorage.setItem(PDF_CONTACT_KEY,          fields.contact);
    localStorage.setItem(PDF_RECORDED_BY_KEY,      fields.recordedBy);
    localStorage.setItem(PDF_SIGNATORY_KEY,        fields.signatory);
    localStorage.setItem(PDF_SIGNATORY_TITLE_KEY,  fields.signatoryTitle);

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const fieldStyle = {
    width: '100%', padding: '9px 12px',
    border: '1px solid #d1d5db', borderRadius: 8,
    fontSize: 13, color: '#111827', background: '#fff',
    outline: 'none', boxSizing: 'border-box',
  };
  const labelStyle = { fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6, display: 'block' };
  const hintStyle  = { fontSize: 11.5, color: '#9ca3af', marginTop: 4 };

  return (
    <div>
      {/* ── Description ── */}
      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>
        Customize the logos, office information, and footer text that appear on exported attendance PDFs.
      </p>

      {/* ── LOGOS ── */}
      <PdfSection title="Header Logos">
        <InlineLogoUpload
          label="Pasig City Logo"
          hint="Left-most logo in the PDF header (e.g. Pasig City seal)"
          previewUrl={fields.pasigLogo}
          onFileChange={setKey('pasigLogo')}
          onClear={() => setKey('pasigLogo')('')}
        />
        <InlineLogoUpload
          label="Pasig Wordmark / Secondary Logo"
          hint='The "Lungsod ng Pasig — Umaagos ang Pag-asa" wordmark logo'
          previewUrl={fields.wordmarkLogo}
          onFileChange={setKey('wordmarkLogo')}
          onClear={() => setKey('wordmarkLogo')('')}
        />
        <p style={{ ...hintStyle, marginTop: 10 }}>
          The School Logo (set in Branding) and Department logos appear after these. Department logos are managed in the Departments tab.
        </p>
      </PdfSection>

      {/* ── OFFICE INFO ── */}
      <PdfSection title="Office / Contact Information">
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Office Name</label>
          <input
            style={fieldStyle}
            value={fields.officeName}
            onChange={e => setKey('officeName')(e.target.value)}
            placeholder="e.g. Office of the Human Resource Development"
          />
          <p style={hintStyle}>Appears in bold below the institution name ribbon.</p>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Address</label>
          <input
            style={fieldStyle}
            value={fields.address}
            onChange={e => setKey('address')(e.target.value)}
            placeholder="e.g. Alkalde Jose St., Kapasigan, Pasig City, Philippines 1600"
          />
        </div>
        <div>
          <label style={labelStyle}>Contact Line</label>
          <input
            style={fieldStyle}
            value={fields.contact}
            onChange={e => setKey('contact')(e.target.value)}
            placeholder='e.g. 638-1014 Loc. 106  |  hrd@plpasig.edu.ph'
          />
          <p style={hintStyle}>Tip: use " | " to separate phone and email.</p>
        </div>
      </PdfSection>

      {/* ── FOOTER / SIGNATURE ── */}
      <PdfSection title="Footer / Signature Block">
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Footer Note</label>
          <textarea
            style={{ ...fieldStyle, resize: 'vertical', minHeight: 64, fontFamily: 'inherit' }}
            value={fields.recordedBy}
            onChange={e => setKey('recordedBy')(e.target.value)}
            placeholder={'e.g. Recorded by HRD Personnel\nAttendance checked/monitored by:'}
          />
          <p style={hintStyle}>Text shown above the signature line. Use a new line for a second line.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label style={labelStyle}>Signature Label</label>
            <input
              style={fieldStyle}
              value={fields.signatory}
              onChange={e => setKey('signatory')(e.target.value)}
              placeholder="e.g. Signature Over Printed Name"
            />
          </div>
          <div>
            <label style={labelStyle}>Signatory Title</label>
            <input
              style={fieldStyle}
              value={fields.signatoryTitle}
              onChange={e => setKey('signatoryTitle')(e.target.value)}
              placeholder="e.g. Head of Office"
            />
          </div>
        </div>
      </PdfSection>

      {/* ── SAVE BUTTON ── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 8 }}>
        <button
          type="button"
          className="btn-settings-primary"
          onClick={handleSave}
          style={saveSuccess ? { background: '#155724' } : {}}
        >
          {saveSuccess
            ? <><i className="bi bi-check2-all"></i> Saved!</>
            : <><i className="bi bi-check-lg"></i> Save PDF Settings</>}
        </button>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Settingspage({ onBrandingChange }) {
  const [activeTab, setActiveTab] = useState('branding');
  const [departments, setDepartments] = useState([]);
  const [positions,   setPositions]   = useState([]);
  const [locations,   setLocations]   = useState([]);

  const [deptSearch, setDeptSearch] = useState('');
  const [posSearch,  setPosSearch]  = useState('');
  const [locSearch,  setLocSearch]  = useState('');

  const [plpLogo,         setPlpLogo]        = useState(() => localStorage.getItem(PLP_LOGO_KEY) || null);
  const [institutionName, setInstitutionName] = useState(() => localStorage.getItem(NAME_KEY) || 'College / Institution Name');
  const [saveSuccess,     setSaveSuccess]     = useState(false);

  const [modal,        setModal]        = useState(null);
  const [modalResolve, setModalResolve] = useState(null);

  const openModal = (config) => new Promise(resolve => {
    setModal(config);
    setModalResolve({ fn: resolve });
  });
  const handleModalConfirm = (value) => { setModal(null); modalResolve?.fn(value !== undefined ? value : true); };
  const handleModalCancel  = ()      => { setModal(null); modalResolve?.fn(null); };

  const refreshDepartments = async () => { const d = await getDepartments(); setDepartments(Array.isArray(d) ? d : []); };
  const refreshPositions   = async () => { const p = await getPositions();   setPositions(Array.isArray(p)   ? p : []); };
  const refreshLocations   = async () => { const l = await getLocations();   setLocations(Array.isArray(l)   ? l : []); };

  useEffect(() => {
    (async () => {
      try {
        const [d, p, l] = await Promise.all([getDepartments(), getPositions(), getLocations()]);
        setDepartments(Array.isArray(d) ? d : []);
        setPositions(Array.isArray(p)   ? p : []);
        setLocations(Array.isArray(l)   ? l : []);
      } catch (e) { console.error('Failed to load settings data', e); }
    })();
  }, []);

  // Portaled file input for the Branding logo — never inside the scroll panel
  const openBrandingFile = usePortaledFileInput((url) => setPlpLogo(url));

  const handleBrandingSave = async () => {
    const result = await openModal({
      type: 'confirm', variant: 'primary', icon: 'bi-check-circle',
      title: 'Save Branding',
      message: 'Save the branding changes? This will update the PLP logo and institution name across the system.',
      confirmLabel: 'Save Changes', confirmIcon: 'bi-check-lg',
    });
    if (!result) return;
    localStorage.setItem(PLP_LOGO_KEY, plpLogo || '');
    localStorage.setItem(NAME_KEY, institutionName);
    if (onBrandingChange) onBrandingChange({ logo: plpLogo, name: institutionName });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const typeLabels = { departments: 'Department', positions: 'Position', locations: 'Location' };

  const handleAdd = async (type) => {
    const label = typeLabels[type];
    const name = await openModal({
      type: 'input', variant: 'primary', icon: 'bi-plus-circle',
      title: `Add ${label}`,
      message: `Enter the name for the new ${label.toLowerCase()}.`,
      placeholder: `${label} name...`,
      confirmLabel: 'Next', confirmIcon: 'bi-arrow-right',
    });
    if (!name?.trim()) return;
    const confirmed = await openModal({
      type: 'confirm', variant: 'primary', icon: 'bi-plus-circle',
      title: `Confirm Add ${label}`,
      message: `Are you sure you want to add "${name.trim()}" as a new ${label.toLowerCase()}?`,
      confirmLabel: 'Add', confirmIcon: 'bi-plus-lg',
    });
    if (!confirmed) return;
    if (type === 'departments') { await addDepartment({ department_name: name.trim() }); await refreshDepartments(); }
    if (type === 'positions')   { await addPosition(  { position_name:   name.trim() }); await refreshPositions(); }
    if (type === 'locations')   { await addLocation(  { location_name:   name.trim() }); await refreshLocations(); }
  };

  const handleEdit = async (type, item) => {
    const label     = typeLabels[type];
    const nameField = type === 'departments' ? 'department_name' : type === 'positions' ? 'position_name' : 'location_name';
    const newName = await openModal({
      type: 'input', variant: 'primary', icon: 'bi-pencil',
      title: `Edit ${label}`,
      message: `Update the name for this ${label.toLowerCase()}.`,
      defaultValue: item[nameField],
      placeholder: `${label} name...`,
      confirmLabel: 'Save', confirmIcon: 'bi-check-lg',
    });
    if (!newName?.trim() || newName.trim() === item[nameField]) return;
    if (type === 'departments') { await updateDepartment(item.department_ID, { department_name: newName.trim() }); await refreshDepartments(); }
    if (type === 'positions')   { await updatePosition(  item.position_ID,   { position_name:   newName.trim() }); await refreshPositions(); }
    if (type === 'locations')   { await updateLocation(  item.location_ID,   { location_name:   newName.trim() }); await refreshLocations(); }
  };

  const handleRemove = async (type, item) => {
    const label     = typeLabels[type];
    const nameField = type === 'departments' ? 'department_name' : type === 'positions' ? 'position_name' : 'location_name';
    const confirmed = await openModal({
      type: 'confirm', variant: 'danger', icon: 'bi-trash',
      title: `Remove ${label}`,
      message: `Are you sure you want to remove "${item[nameField]}"? This action cannot be undone.`,
      confirmLabel: 'Remove', confirmIcon: 'bi-trash',
    });
    if (!confirmed) return;
    if (type === 'departments') { await deleteDepartment(item.department_ID); await refreshDepartments(); }
    if (type === 'positions')   { await deletePosition(  item.position_ID);   await refreshPositions(); }
    if (type === 'locations')   { await deleteLocation(  item.location_ID);   await refreshLocations(); }
  };

  const renderList = (type, items, search, setSearch, nameField, iconClass) => {
    const filtered = items.filter(i => i[nameField]?.toLowerCase().includes(search.toLowerCase()));
    return (
      <>
        <div className="list-toolbar">
          <div className="list-search-wrapper">
            <i className="bi bi-search list-search-icon"></i>
            <input
              type="text"
              className="list-search-input"
              placeholder={`Search ${type}...`}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <span className="list-count-badge">{filtered.length} {type}</span>
          <button type="button" className="btn-settings-primary" onClick={() => handleAdd(type)}>
            <i className="bi bi-plus-lg"></i> Add
          </button>
        </div>
        <div className="list-items">
          {filtered.length === 0 ? (
            <div className="list-empty">
              <i className={`bi ${iconClass}`}></i>
              <p>No {type} found</p>
            </div>
          ) : filtered.map((item, i) => (
            <div className="list-item" key={i}>
              <div className="list-item-name">
                <div className="list-item-icon"><i className={`bi ${iconClass}`}></i></div>
                {item[nameField]}
              </div>
              <div className="list-item-actions">
                <button type="button" className="btn-settings-edit"   onClick={() => handleEdit(type, item)}><i className="bi bi-pencil"></i> Edit</button>
                <button type="button" className="btn-settings-remove" onClick={() => handleRemove(type, item)}><i className="bi bi-trash"></i> Remove</button>
              </div>
            </div>
          ))}
        </div>
      </>
    );
  };

  const panelMeta = {
    branding:    { title: 'Branding',    desc: 'Customize your institution logo and name' },
    departments: { title: 'Departments', desc: 'Manage department records used across the system' },
    positions:   { title: 'Positions',   desc: 'Manage employee position types' },
    locations:   { title: 'Locations',   desc: 'Manage event and entry/exit locations' },
    pdf_export:  { title: 'PDF Export',  desc: 'Customize logos and text used in attendance PDF exports' },
  };

  return (
    <div className="settings-page">
      <SettingsModal modal={modal} onConfirm={handleModalConfirm} onCancel={handleModalCancel} />

      <div className="settings-page-header">
        <h1 className="settings-page-title">Settings</h1>
        <p className="settings-page-subtitle">Manage your system configuration and preferences</p>
      </div>

      <div className="settings-layout">
        {/* ── Sidebar ── */}
        <aside className="settings-sidebar">
          <span className="settings-sidebar-label">Configuration</span>
          {TAB_CONFIG.map(tab => (
            <button
              type="button"
              key={tab.key}
              className={`settings-tab-btn ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <i className={`bi ${tab.icon}`}></i>
              {tab.label}
            </button>
          ))}
        </aside>

        {/* ── Panel ── */}
        <div className="settings-panel">
          <div className="settings-panel-header">
            <div>
              <h2 className="settings-panel-title">{panelMeta[activeTab].title}</h2>
              <p className="settings-panel-desc">{panelMeta[activeTab].desc}</p>
            </div>
          </div>

          <div className="settings-panel-body">

            {/* ── BRANDING TAB ── */}
            {activeTab === 'branding' && (
              <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', flexWrap: 'wrap' }}>

                {/* Left: Logo preview circle */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <div
                    onClick={openBrandingFile}
                    title="Click to choose a logo"
                    style={{
                      width: 130, height: 130,
                      border: '1.5px dashed #d1d5db', borderRadius: 12,
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center',
                      gap: 8, cursor: 'pointer',
                      overflow: 'hidden', position: 'relative',
                      background: '#f9fafb',
                    }}
                  >
                    {plpLogo ? (
                      <>
                        <img src={plpLogo} alt="Logo preview" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 8 }} />
                        <div
                          style={{
                            position: 'absolute', inset: 0,
                            background: 'rgba(0,0,0,0.45)',
                            display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center',
                            opacity: 0, transition: 'opacity .2s',
                          }}
                          onMouseEnter={e => e.currentTarget.style.opacity = 1}
                          onMouseLeave={e => e.currentTarget.style.opacity = 0}
                        >
                          <i className="bi bi-camera" style={{ fontSize: 22, color: '#fff' }}></i>
                          <span style={{ fontSize: 12, color: '#fff', marginTop: 4 }}>Change</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <i className="bi bi-building" style={{ fontSize: 28, color: '#9ca3af' }}></i>
                        <span style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', lineHeight: 1.4 }}>Click to<br />upload logo</span>
                      </>
                    )}
                  </div>

                  <span style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', lineHeight: 1.5 }}>PNG or JPG<br />Max 2MB</span>

                  {plpLogo && (
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); setPlpLogo(null); }}
                      style={{
                        background: 'none', border: '1px solid #fecaca',
                        borderRadius: 8, padding: '3px 10px',
                        fontSize: 12, color: '#dc2626', cursor: 'pointer',
                      }}
                    >
                      <i className="bi bi-x-lg me-1"></i>Remove
                    </button>
                  )}
                </div>

                {/* Right: Upload button + Institution Name */}
                <div style={{ flex: 1, minWidth: 260, display: 'flex', flexDirection: 'column', gap: 24 }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 8 }}>Upload Logo</p>
                    {/* Using a <button> instead of <label> to avoid any scroll side-effects */}
                    <button
                      type="button"
                      onClick={openBrandingFile}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                        border: '1px solid #d1d5db', borderRadius: 10,
                        padding: '11px 14px', cursor: 'pointer', background: '#fff',
                        textAlign: 'left',
                      }}
                    >
                      <i className="bi bi-cloud-arrow-up" style={{ fontSize: 17, color: '#6b7280' }}></i>
                      <span style={{ fontSize: 14, color: '#6b7280' }}>Choose file to upload</span>
                    </button>
                    <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 6 }}>Supported formats: PNG, JPG, SVG</p>
                  </div>

                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 8 }}>Institution Name</p>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <input
                        type="text"
                        className="settings-text-input"
                        value={institutionName}
                        onChange={e => setInstitutionName(e.target.value)}
                        style={{ flex: 1 }}
                      />
                      <button
                        type="button"
                        className="btn-settings-primary"
                        onClick={handleBrandingSave}
                        style={saveSuccess ? { background: '#155724' } : {}}
                      >
                        {saveSuccess
                          ? <><i className="bi bi-check2-all"></i> Saved!</>
                          : <><i className="bi bi-check-lg"></i> Save</>}
                      </button>
                    </div>
                    <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 6 }}>This name appears in the sidebar and reports</p>
                  </div>
                </div>
              </div>
            )}

            {/* ── DEPARTMENTS TAB ── */}
            {activeTab === 'departments' && (
              <div>
                {renderList('departments', departments, deptSearch, setDeptSearch, 'department_name', 'bi-diagram-3')}
                <div style={{ borderTop: '1px solid #f3f4f6', marginTop: 28, paddingTop: 24 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Department / College Logos
                  </p>
                  <DepartmentLogosPanel departments={departments} openModal={openModal} />
                </div>
              </div>
            )}

            {activeTab === 'positions'  && renderList('positions',  positions,  posSearch,  setPosSearch,  'position_name',  'bi-person-badge')}
            {activeTab === 'locations'  && renderList('locations',  locations,  locSearch,  setLocSearch,  'location_name',  'bi-geo-alt')}
            {activeTab === 'pdf_export' && <PdfExportPanel openModal={openModal} />}

          </div>
        </div>
      </div>
    </div>
  );
}