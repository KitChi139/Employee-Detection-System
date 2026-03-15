import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Form, Button, Table } from 'react-bootstrap';
import { getEntryExitLogs } from '../api';
import './ccs/entryexit.css';

function EntryExitPage() {

  const [logs, setLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('All Departments');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ===============================
  // LOAD DATA FROM DATABASE
  // ===============================

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getEntryExitLogs();
      setLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load entry/exit logs:', err);
      setError(err.message || 'Failed to load logs. Please try again later.');
    } finally {
      setLoading(false);
    }
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

          {error && (
            <div className="alert alert-danger mb-3">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              {error}
              <Button variant="link" className="p-0 ms-2" onClick={loadLogs}>Retry</Button>
            </div>
          )}

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

          <div className="table-responsive">
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

                {loading ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center' }}>
                      <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                      Loading logs...
                    </td>
                  </tr>
                ) : filteredLogs.length > 0 ? (
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
          </div>

        </Card.Body>
      </Card>

    </div>
  );
}

export default EntryExitPage;