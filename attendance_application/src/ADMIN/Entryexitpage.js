import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Form, Button, Table } from 'react-bootstrap';
import { getEntryExitLogs } from '../api';
import './ccs/entryexit.css';

function EntryExitPage() {

  const [logs, setLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('All Departments');

  // ===============================
  // LOAD DATA FROM DATABASE
  // ===============================

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    const data = await getEntryExitLogs();
    setLogs(data);
  };

  // ===============================
  // FILTERING
  // ===============================

  const filteredLogs = logs.filter(log => {

    const matchesSearch =
      log.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.employee_code.toString().includes(searchTerm);

    const matchesDepartment =
      selectedDepartment === 'All Departments' ||
      log.department_name === selectedDepartment;

    return matchesSearch && matchesDepartment;
  });

  // ===============================
  // STATS
  // ===============================

  const totalEntries = logs.filter(log => log.type === 'Entry').length;
  const totalExits = logs.filter(log => log.type === 'Exit').length;
  const totalMovements = logs.length;

  const departments = [
    'All Departments',
    ...new Set(logs.map(log => log.department_name))
  ];

  const getTypeBadgeClass = (type) =>
    type === 'Entry' ? 'badge-entry' : 'badge-exit';

  const getTypeIcon = (type) =>
    type === 'Entry' ? 'bi-arrow-down-left' : 'bi-arrow-up-right';

  // ===============================
  // UI
  // ===============================

  return (
    <div className="admin-page">

      <div className="page-header-section">
        <h1 className="page-title">Entrance & Exit Logs</h1>
      </div>

      {/* ================= STATS ================= */}
      <Row className="g-3 mb-4">
        <Col md={4}>
          <Card className="stat-card-ee">
            <Card.Body>
              <p>Total Movements</p>
              <h2>{totalMovements}</h2>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card className="stat-card-ee">
            <Card.Body>
              <p>Entries</p>
              <h2>{totalEntries}</h2>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card className="stat-card-ee">
            <Card.Body>
              <p>Exits</p>
              <h2>{totalExits}</h2>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* ================= TABLE ================= */}
      <Card className="content-card">
        <Card.Body>

          <Row className="mb-3">
            <Col md={6}>
              <Form.Control
                type="text"
                placeholder="Search name or employee ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </Col>

            <Col md={6}>
              <Form.Select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
              >
                {departments.map((dept, index) => (
                  <option key={index}>{dept}</option>
                ))}
              </Form.Select>
            </Col>
          </Row>

          <Table striped bordered hover>
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Type</th>
                <th>Employee Code</th>
                <th>Name</th>
                <th>Department</th>
                <th>Location</th>
              </tr>
            </thead>
            <tbody>

              {filteredLogs.length > 0 ? (
                filteredLogs.map((log, index) => (
                  <tr key={index}>
                    <td>{log.timestamp}</td>

                    <td>
                      <span className={`type-badge-ee ${getTypeBadgeClass(log.type)}`}>
                        <i className={`bi ${getTypeIcon(log.type)} me-1`}></i>
                        {log.type}
                      </span>
                    </td>

                    <td>{log.employee_code}</td>
                    <td>{log.fullName}</td>
                    <td>{log.department_name}</td>
                    <td>{log.location || 'Main Gate'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center' }}>
                    No logs found
                  </td>
                </tr>
              )}

            </tbody>
          </Table>

        </Card.Body>
      </Card>

    </div>
  );
}

export default EntryExitPage;