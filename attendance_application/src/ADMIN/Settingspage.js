import React, { useEffect, useState, useRef } from 'react';
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
];
 
const LOGO_KEY = 'institution_logo';
const NAME_KEY = 'institution_name';
 
// ── Reusable Modal Component ───────────────────────────────────────────────
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
 
        {/* Icon */}
        <div className={`settings-modal-icon ${modal.variant || 'primary'}`}>
          <i className={`bi ${modal.icon || 'bi-question-circle'}`}></i>
        </div>
 
        {/* Content */}
        <h3 className="settings-modal-title">{modal.title}</h3>
        {modal.message && <p className="settings-modal-message">{modal.message}</p>}
 
        {/* Input field (for Add / Edit) */}
        {modal.type === 'input' && (
          <input
            ref={inputRef}
            type="text"
            className="settings-modal-input"
            defaultValue={modal.defaultValue || ''}
            placeholder={modal.placeholder || 'Enter name...'}
          />
        )}
 
        {/* Actions */}
        <div className="settings-modal-actions">
          <button className="settings-modal-btn-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button
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
 
export default function Settingspage({ onBrandingChange }) {
  const [activeTab, setActiveTab] = useState('branding');
  const [departments, setDepartments] = useState([]);
  const [positions,   setPositions]   = useState([]);
  const [locations,   setLocations]   = useState([]);
 
  const [deptSearch, setDeptSearch] = useState('');
  const [posSearch,  setPosSearch]  = useState('');
  const [locSearch,  setLocSearch]  = useState('');
 
  const [previewUrl,      setPreviewUrl]      = useState(() => localStorage.getItem(LOGO_KEY) || null);
  const [institutionName, setInstitutionName] = useState(() => localStorage.getItem(NAME_KEY) || 'College / Institution Name');
  const [pendingFile,     setPendingFile]     = useState(null);
  const [saveSuccess,     setSaveSuccess]     = useState(false);
  const fileInputRef = useRef(null);
 
  // ── Modal state ────────────────────────────────────────────────────────
  const [modal,       setModal]       = useState(null);
  const [modalResolve, setModalResolve] = useState(null);
 
  // Opens a modal and returns a promise that resolves with the result
  const openModal = (config) => {
    return new Promise((resolve) => {
      setModal(config);
      setModalResolve({ fn: resolve });
    });
  };
 
  const handleModalConfirm = (value) => {
    setModal(null);
    modalResolve?.fn(value !== undefined ? value : true);
  };
 
  const handleModalCancel = () => {
    setModal(null);
    modalResolve?.fn(null);
  };
 
  // ── Refresh helpers ────────────────────────────────────────────────────
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
 
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPreviewUrl(ev.target.result);
    reader.readAsDataURL(file);
  };
 
  const handlePreviewClick = () => fileInputRef.current?.click();
 
  // ── Save branding (with confirmation modal) ────────────────────────────
  const handleBrandingSave = async () => {
    const result = await openModal({
      type: 'confirm',
      variant: 'primary',
      icon: 'bi-check-circle',
      title: 'Save Branding',
      message: 'Are you sure you want to save the branding changes? This will update the logo and institution name across the system.',
      confirmLabel: 'Save Changes',
      confirmIcon: 'bi-check-lg',
    });
 
    if (!result) return;
 
    if (previewUrl) localStorage.setItem(LOGO_KEY, previewUrl);
    localStorage.setItem(NAME_KEY, institutionName);
 
    if (onBrandingChange) {
      onBrandingChange({ logo: previewUrl, name: institutionName });
    }
 
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };
 
  // ── CRUD helpers ──────────────────────────────────────────────────────
  const typeLabels = { departments: 'Department', positions: 'Position', locations: 'Location' };
 
  const handleAdd = async (type) => {
    const label = typeLabels[type];
 
    // Step 1: Input modal — get the name
    const name = await openModal({
      type: 'input',
      variant: 'primary',
      icon: 'bi-plus-circle',
      title: `Add ${label}`,
      message: `Enter the name for the new ${label.toLowerCase()}.`,
      placeholder: `${label} name...`,
      confirmLabel: 'Next',
      confirmIcon: 'bi-arrow-right',
    });
 
    if (!name?.trim()) return;
 
    // Step 2: Confirmation modal — confirm the action
    const confirmed = await openModal({
      type: 'confirm',
      variant: 'primary',
      icon: 'bi-plus-circle',
      title: `Confirm Add ${label}`,
      message: `Are you sure you want to add "${name.trim()}" as a new ${label.toLowerCase()}?`,
      confirmLabel: 'Add',
      confirmIcon: 'bi-plus-lg',
    });
 
    if (!confirmed) return;
 
    try {
      if (type === 'departments') { await addDepartment({ department_name: name.trim() }); await refreshDepartments(); }
      if (type === 'positions')   { await addPosition({ position_name: name.trim() });    await refreshPositions(); }
      if (type === 'locations')   { await addLocation({ location_name: name.trim() });    await refreshLocations(); }
    } catch (e) {
      await openModal({
        type: 'confirm',
        variant: 'danger',
        icon: 'bi-exclamation-triangle',
        title: 'Action Failed',
        message: `Failed to add the ${label.toLowerCase()}. Please try again.`,
        confirmLabel: 'OK',
        confirmIcon: 'bi-x-lg',
      });
    }
  };
 
  const handleEdit = async (type, item) => {
    const fieldMap = { departments: 'department_name', positions: 'position_name', locations: 'location_name' };
    const idMap    = { departments: 'department_ID',   positions: 'position_ID',   locations: 'location_ID'   };
    const field = fieldMap[type], id = idMap[type];
    const label = typeLabels[type];
 
    // Step 1: Input modal — get the updated name
    const name = await openModal({
      type: 'input',
      variant: 'primary',
      icon: 'bi-pencil-square',
      title: `Edit ${label}`,
      message: `Update the name for this ${label.toLowerCase()}.`,
      placeholder: `${label} name...`,
      defaultValue: item[field],
      confirmLabel: 'Next',
      confirmIcon: 'bi-arrow-right',
    });
 
    if (!name?.trim() || name.trim() === item[field]) return;
 
    // Step 2: Confirmation modal — confirm the action
    const confirmed = await openModal({
      type: 'confirm',
      variant: 'primary',
      icon: 'bi-pencil-square',
      title: `Confirm Edit ${label}`,
      message: `Are you sure you want to rename "${item[field]}" to "${name.trim()}"?`,
      confirmLabel: 'Save Changes',
      confirmIcon: 'bi-check-lg',
    });
 
    if (!confirmed) return;
 
    try {
      if (type === 'departments') { await updateDepartment(item[id], { [field]: name.trim() }); await refreshDepartments(); }
      if (type === 'positions')   { await updatePosition(item[id],   { [field]: name.trim() }); await refreshPositions(); }
      if (type === 'locations')   { await updateLocation(item[id],   { [field]: name.trim() }); await refreshLocations(); }
    } catch (e) {
      await openModal({
        type: 'confirm',
        variant: 'danger',
        icon: 'bi-exclamation-triangle',
        title: 'Update Failed',
        message: `Failed to update the ${label.toLowerCase()}. Please try again.`,
        confirmLabel: 'OK',
        confirmIcon: 'bi-x-lg',
      });
    }
  };
 
  const handleRemove = async (type, item) => {
    const fieldMap = { departments: 'department_name', positions: 'position_name', locations: 'location_name' };
    const idMap    = { departments: 'department_ID',   positions: 'position_ID',   locations: 'location_ID'   };
    const label = typeLabels[type];
 
    const confirmed = await openModal({
      type: 'confirm',
      variant: 'danger',
      icon: 'bi-trash',
      title: `Remove ${label}`,
      message: `Are you sure you want to remove "${item[fieldMap[type]]}"? This action cannot be undone.`,
      confirmLabel: 'Remove',
      confirmIcon: 'bi-trash',
    });
 
    if (!confirmed) return;
    try {
      if (type === 'departments') { await deleteDepartment(item[idMap[type]]); await refreshDepartments(); }
      if (type === 'positions')   { await deletePosition(item[idMap[type]]);   await refreshPositions(); }
      if (type === 'locations')   { await deleteLocation(item[idMap[type]]);   await refreshLocations(); }
    } catch (e) {
      await openModal({
        type: 'confirm',
        variant: 'danger',
        icon: 'bi-exclamation-triangle',
        title: 'Remove Failed',
        message: `Failed to remove the ${label.toLowerCase()}. Please try again.`,
        confirmLabel: 'OK',
        confirmIcon: 'bi-x-lg',
      });
    }
  };
 
  // ── List renderer ──────────────────────────────────────────────────────
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
          <button className="btn-settings-primary" onClick={() => handleAdd(type)}>
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
                <div className="list-item-icon">
                  <i className={`bi ${iconClass}`}></i>
                </div>
                {item[nameField]}
              </div>
              <div className="list-item-actions">
                <button className="btn-settings-edit" onClick={() => handleEdit(type, item)}>
                  <i className="bi bi-pencil"></i> Edit
                </button>
                <button className="btn-settings-remove" onClick={() => handleRemove(type, item)}>
                  <i className="bi bi-trash"></i> Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </>
    );
  };
 
  const panelMeta = {
    branding:    { title: 'Branding',     desc: 'Customize your institution logo and name' },
    departments: { title: 'Departments',  desc: 'Manage department records used across the system' },
    positions:   { title: 'Positions',    desc: 'Manage employee position types' },
    locations:   { title: 'Locations',    desc: 'Manage event and entry/exit locations' },
  };
 
  return (
    <div className="settings-page">
 
      {/* ── Modal ── */}
      <SettingsModal
        modal={modal}
        onConfirm={handleModalConfirm}
        onCancel={handleModalCancel}
      />
 
      {/* Page header */}
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
 
            {/* BRANDING */}
            {activeTab === 'branding' && (
              <div className="branding-grid">
 
                <div className="logo-upload-box">
                  <div
                    className="logo-preview-circle"
                    onClick={handlePreviewClick}
                    title="Click to choose a logo"
                    style={{ cursor: 'pointer', overflow: 'hidden', position: 'relative' }}
                  >
                    {previewUrl ? (
                      <>
                        <img
                          src={previewUrl}
                          alt="Logo preview"
                          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit', display: 'block' }}
                        />
                        <div
                          style={{
                            position: 'absolute', inset: 0,
                            background: 'rgba(0,0,0,0.45)',
                            display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center',
                            opacity: 0, transition: 'opacity .2s',
                            borderRadius: 'inherit',
                          }}
                          className="logo-hover-overlay"
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
                  <p className="logo-upload-hint">PNG or JPG<br />Max 2MB</p>
                </div>
 
                <div className="branding-fields">
                  <div className="settings-field-group">
                    <label className="settings-field-label">Upload Logo</label>
                    <div className="settings-file-input-wrapper">
                      <label className="settings-file-label" style={{ cursor: 'pointer' }}>
                        <i className="bi bi-cloud-upload"></i>
                        {pendingFile ? pendingFile.name : 'Choose file to upload'}
                        <input
                          ref={fileInputRef}
                          type="file"
                          className="hidden-file-input"
                          accept="image/*"
                          onChange={handleFileChange}
                        />
                      </label>
                    </div>
                    <p className="settings-field-hint">Supported formats: PNG, JPG, SVG</p>
                  </div>
 
                  <div className="settings-field-group">
                    <label className="settings-field-label">Institution Name</label>
                    <div className="settings-input-row">
                      <input
                        type="text"
                        className="settings-text-input"
                        value={institutionName}
                        onChange={e => setInstitutionName(e.target.value)}
                      />
                      <button
                        className="btn-settings-primary"
                        onClick={handleBrandingSave}
                        style={saveSuccess ? { background: '#155724', borderColor: '#155724' } : {}}
                      >
                        {saveSuccess
                          ? <><i className="bi bi-check2-all"></i> Saved!</>
                          : <><i className="bi bi-check-lg"></i> Save</>
                        }
                      </button>
                    </div>
                    <p className="settings-field-hint">This name appears in the sidebar and reports</p>
                  </div>
                </div>
              </div>
            )}
 
            {activeTab === 'departments' && renderList('departments', departments, deptSearch, setDeptSearch, 'department_name', 'bi-diagram-3')}
            {activeTab === 'positions'   && renderList('positions',   positions,   posSearch,  setPosSearch,  'position_name',   'bi-person-badge')}
            {activeTab === 'locations'   && renderList('locations',   locations,   locSearch,  setLocSearch,  'location_name',   'bi-geo-alt')}
 
          </div>
        </div>
      </div>
    </div>
  );
}