import React, { useEffect, useState } from 'react';
import './ccs/settings.css';
import {
  getDepartments,
  getPositions,
  getLocations,
  addDepartment,
  addPosition,
  addLocation,
  updateDepartment,
  deleteDepartment,
  updatePosition,
  deletePosition,
  updateLocation,
  deleteLocation,
} from '../api';

export default function Settingspage() {

  const [activeTab, setActiveTab] = useState("branding");
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [locations, setLocations] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [deptRes, posRes, locRes] = await Promise.all([
          getDepartments(),
          getPositions(),
          getLocations(),
        ]);
        setDepartments(Array.isArray(deptRes) ? deptRes : []);
        setPositions(Array.isArray(posRes) ? posRes : []);
        setLocations(Array.isArray(locRes) ? locRes : []);
      } catch (e) {
        console.error("Failed to load settings data", e);
      }
    };

    loadData();
  }, []);

  const handleAddDepartment = async () => {
    const name = window.prompt("Enter new department name:");
    if (!name || !name.trim()) return;
    try {
      await addDepartment({ department_name: name.trim() });
      const updated = await getDepartments();
      setDepartments(Array.isArray(updated) ? updated : []);
    } catch (e) {
      console.error("Failed to add department", e);
      window.alert("Failed to add department.");
    }
  };

  const handleAddPosition = async () => {
    const name = window.prompt("Enter new position name:");
    if (!name || !name.trim()) return;
    try {
      await addPosition({ position_name: name.trim() });
      const updated = await getPositions();
      setPositions(Array.isArray(updated) ? updated : []);
    } catch (e) {
      console.error("Failed to add position", e);
      window.alert("Failed to add position.");
    }
  };

  const handleAddLocation = async () => {
    const name = window.prompt("Enter new location name:");
    if (!name || !name.trim()) return;
    try {
      await addLocation({ location_name: name.trim() });
      const updated = await getLocations();
      setLocations(Array.isArray(updated) ? updated : []);
    } catch (e) {
      console.error("Failed to add location", e);
      window.alert("Failed to add location.");
    }
  };

  const handleEditDepartment = async (dept) => {
    const name = window.prompt("Edit department name:", dept.department_name);
    if (!name || !name.trim() || name.trim() === dept.department_name) return;
    try {
      await updateDepartment(dept.department_ID, { department_name: name.trim() });
      const updated = await getDepartments();
      setDepartments(Array.isArray(updated) ? updated : []);
    } catch (e) {
      console.error("Failed to update department", e);
      window.alert("Failed to update department.");
    }
  };

  const handleRemoveDepartment = async (dept) => {
    if (!window.confirm(`Remove department "${dept.department_name}"?`)) return;
    try {
      await deleteDepartment(dept.department_ID);
      const updated = await getDepartments();
      setDepartments(Array.isArray(updated) ? updated : []);
    } catch (e) {
      console.error("Failed to remove department", e);
      window.alert("Failed to remove department.");
    }
  };

  const handleEditPosition = async (pos) => {
    const name = window.prompt("Edit position name:", pos.position_name);
    if (!name || !name.trim() || name.trim() === pos.position_name) return;
    try {
      await updatePosition(pos.position_ID, { position_name: name.trim() });
      const updated = await getPositions();
      setPositions(Array.isArray(updated) ? updated : []);
    } catch (e) {
      console.error("Failed to update position", e);
      window.alert("Failed to update position.");
    }
  };

  const handleRemovePosition = async (pos) => {
    if (!window.confirm(`Remove position "${pos.position_name}"?`)) return;
    try {
      await deletePosition(pos.position_ID);
      const updated = await getPositions();
      setPositions(Array.isArray(updated) ? updated : []);
    } catch (e) {
      console.error("Failed to remove position", e);
      window.alert("Failed to remove position.");
    }
  };

  const handleEditLocation = async (loc) => {
    const name = window.prompt("Edit location name:", loc.location_name);
    if (!name || !name.trim() || name.trim() === loc.location_name) return;
    try {
      await updateLocation(loc.location_ID, { location_name: name.trim() });
      const updated = await getLocations();
      setLocations(Array.isArray(updated) ? updated : []);
    } catch (e) {
      console.error("Failed to update location", e);
      window.alert("Failed to update location.");
    }
  };

  const handleRemoveLocation = async (loc) => {
    if (!window.confirm(`Remove location "${loc.location_name}"?`)) return;
    try {
      await deleteLocation(loc.location_ID);
      const updated = await getLocations();
      setLocations(Array.isArray(updated) ? updated : []);
    } catch (e) {
      console.error("Failed to remove location", e);
      window.alert("Failed to remove location.");
    }
  };

  return (
    <div className="settings-page">

      <div className="settings-card-main">

        <h1 className="settings-title">Settings</h1>

        {/* Tabs */}
        <div className="settings-tabs">

          <button
            className={activeTab === "branding" ? "tab active" : "tab"}
            onClick={() => setActiveTab("branding")}
          >
            Branding
          </button>

          <button
            className={activeTab === "departments" ? "tab active" : "tab"}
            onClick={() => setActiveTab("departments")}
          >
            Departments
          </button>

          <button
            className={activeTab === "positions" ? "tab active" : "tab"}
            onClick={() => setActiveTab("positions")}
          >
            Positions
          </button>

          <button
            className={activeTab === "locations" ? "tab active" : "tab"}
            onClick={() => setActiveTab("locations")}
          >
            Locations
          </button>

        </div>


        <div className="settings-content">

        {/* TAB 1 — BRANDING */}

        {activeTab === "branding" && (

          <div className="branding-section">

            <div className="logo-preview">
              <img src="/placeholder-logo.png" alt="logo preview" />
            </div>

            <div className="branding-controls">

              <div className="settings-field">
                <label>Upload Logo</label>
                <input type="file" className="settings-input" />
              </div>

              <div className="settings-field">
                <label>Institution Name</label>

                <div className="inline-row">
                  <input
                    type="text"
                    className="settings-input"
                    defaultValue="College / Institution Name"
                  />

                  <button className="btn-primary">
                    Edit
                  </button>
                </div>

              </div>

            </div>

          </div>

        )}



        {/* TAB 2 — DEPARTMENTS */}

        {activeTab === "departments" && (

          <div>

            <div className="list-toolbar">

              <input
                type="text"
                className="settings-input search"
                placeholder="Search departments..."
              />

              <button className="btn-primary" onClick={handleAddDepartment}>
                Add
              </button>

            </div>

            <div className="list-items">
              {departments.map((dept) => (
                <div className="list-item" key={dept.department_ID}>
                  <span>{dept.department_name}</span>
                  <div className="actions">
                    <button
                      className="btn-edit"
                      onClick={() => handleEditDepartment(dept)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn-remove"
                      onClick={() => handleRemoveDepartment(dept)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

          </div>

        )}



        {/* TAB 3 — POSITIONS */}

        {activeTab === "positions" && (

          <div>

            <div className="list-toolbar">

              <input
                type="text"
                className="settings-input search"
                placeholder="Search positions..."
              />

              <button className="btn-primary" onClick={handleAddPosition}>
                Add
              </button>

            </div>

            <div className="list-items">
              {positions.map((pos) => (
                <div className="list-item" key={pos.position_ID}>
                  <span>{pos.position_name}</span>
                  <div className="actions">
                    <button
                      className="btn-edit"
                      onClick={() => handleEditPosition(pos)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn-remove"
                      onClick={() => handleRemovePosition(pos)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

          </div>

        )}



        {/* TAB 4 — LOCATIONS */}

        {activeTab === "locations" && (

          <div>

            <div className="list-toolbar">

              <input
                type="text"
                className="settings-input search"
                placeholder="Search locations..."
              />

              <button className="btn-primary" onClick={handleAddLocation}>
                Add
              </button>

            </div>

            <div className="list-items">
              {locations.map((loc) => (
                <div className="list-item" key={loc.location_ID}>
                  <span>{loc.location_name}</span>
                  <div className="actions">
                    <button
                      className="btn-edit"
                      onClick={() => handleEditLocation(loc)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn-remove"
                      onClick={() => handleRemoveLocation(loc)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

          </div>

        )}

        </div>

      </div>

    </div>
  );
}