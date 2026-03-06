import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Form, Button, Table, Badge, Modal } from 'react-bootstrap';
import {
  getEmployees,
  getDepartments,
  getPositions,
} from '../api';
import './ccs/archives.css';

function EmployeesArchive({ onNavigate }) {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('All Departments');
  const [selectedPosition, setSelectedPosition] = useState('All Positions');

  const [viewMode, setViewMode] = useState('list'); // keep for future use

  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);

  // =========================================
  // LOAD DATA
  // =========================================

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      setLoadError('');
      const [empsData, deptData, posData] = await Promise.all([
        getEmployees(),
        getDepartments(),
        getPositions(),
      ]);

      const empList = Array.isArray(empsData) ? empsData : (empsData?.data ?? []);
      const deptList = Array.isArray(deptData) ? deptData : (deptData?.data ?? []);
      const posList = Array.isArray(posData) ? posData : (posData?.data ?? []);

      // treat all employees as "archived" for now; filtering could be added later
      setEmployees(empList);
      setDepartments(deptList);
      setPositions(posList);
    } catch (err) {
      console.error('Failed to load employee archive:', err);
      setLoadError('Unable to load archived employees. Please check your server/API.');
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  // =========================================
  // FILTER HELPERS
  // =========================================

  const filteredEmployees = employees.filter(emp => {
    const fullName = `${emp.employee_firstName} ${emp.employee_LastName}`;
    const q = searchTerm.toLowerCase();

    const matchSearch =
      fullName.toLowerCase().includes(q) ||
      String(emp.employee_code).includes(q) ||
      (emp.position || '').toLowerCase().includes(q);

    const matchDept =
      selectedDepartment === 'All Departments' ||
      emp.department_name === selectedDepartment;

    const matchPos =
      selectedPosition === 'All Positions' ||
      emp.position === selectedPosition;

    return matchSearch && matchDept && matchPos;
  });

  const departmentCounts = employees.reduce((acc, emp) => {
    const found = acc.find(d => d.name === emp.department_name);
    if (found) {
      found.count += 1;
    } else {
      acc.push({ name: emp.department_name, count: 1 });
    }
    return acc;
  }, []);

  const totalArchived = employees.length;
  const uniqueDepartments = departmentCounts.length;
  const uniquePositions = [...new Set(employees.map(e => e.position))].filter(Boolean).length;

  // =========================================
  // UI
  // =========================================

  return (
    <div className="archive-page">
      {/* ===== HEADER ===== */}
      <div className="archive-header-section">
        <div className="archive-title-block">
          <div className="archive-eyebrow">
            <span className="archive-eyebrow-dot" />
            Historical Records
          </div>
          <h1 className="archive-title">Employees Archive</h1>
          <p className="archive-subtitle">
            Browse and review all past employee records
          </p>
        </div>
        <Button className="back-btn" onClick={() => onNavigate('employees')}>
          ← Back to Employees
        </Button>
      </div>

      {/* ===== STAT STRIP ===== */}
      <div className="archive-stat-strip">
        <div className="archive-stat-item">
          <span className="archive-stat-value">{totalArchived}</span>
          <span className="archive-stat-label">Archived Employees</span>
        </div>
        <div className="archive-stat-divider" />
        <div className="archive-stat-item">
          <span className="archive-stat-value">{uniqueDepartments}</span>
          <span className="archive-stat-label">Departments</span>
        </div>
        <div className="archive-stat-divider" />
        <div className="archive-stat-item">
          <span className="archive-stat-value">{uniquePositions}</span>
          <span className="archive-stat-label">Positions</span>
        </div>
      </div>

      {/* ===== FILTERS CARD ===== */}
      <Card className="archive-filter-card">
        <Card.Body>
          <div className="archive-filter-header">
            <span className="archive-filter-title">🗂 Filter Archive</span>
            <div className="archive-view-toggle">
              <button
                className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
                title="List view"
              >
                ☰ List
              </button>
            </div>
          </div>

          <Row className="g-3 align-items-end">
            <Col md={4}>
              <Form.Control
                type="text"
                placeholder="Search name, ID, position..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </Col>
            <Col md={3}>
              <Form.Select
                value={selectedDepartment}
                onChange={e => setSelectedDepartment(e.target.value)}
              >
                <option>All Departments</option>
                {departmentCounts.map((d,i)=>(
                  <option key={i} value={d.name}>{d.name}</option>
                ))}
              </Form.Select>
            </Col>
            <Col md={3}>
              <Form.Select
                value={selectedPosition}
                onChange={e => setSelectedPosition(e.target.value)}
              >
                <option>All Positions</option>
                {[...new Set(employees.map(e=>e.position))].filter(Boolean).map((p,i)=>(
                  <option key={i} value={p}>{p}</option>
                ))}
              </Form.Select>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* ===== RESULTS TABLE ===== */}
      <div className="archive-results mt-3">
        {loadError && <div className="alert alert-danger">{loadError}</div>}
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>Employee Code</th>
              <th>Name</th>
              <th>Department</th>
              <th>Position</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.map(emp => (
              <tr key={emp.employee_ID}>
                <td>{emp.employee_code}</td>
                <td>{emp.employee_firstName} {emp.employee_LastName}</td>
                <td>{emp.department_name}</td>
                <td>{emp.position}</td>
              </tr>
            ))}
            {filteredEmployees.length === 0 && (
              <tr>
                <td colSpan="4" className="text-center">No records found</td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>
    </div>
  );
}

export default EmployeesArchive;
