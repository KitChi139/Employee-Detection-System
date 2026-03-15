import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Form, Button, Table, Modal, Alert } from 'react-bootstrap';
import { 
  getEmployees, 
  addEmployee, 
  deleteEmployee,   // this should archive
  updateEmployee, 
  getDepartments, 
  getPositions, 
  getEmailsList 
} from '../api';
import './ccs/employee.css';

function EmployeesPage() {
  const [employees, setEmployees]           = useState([]);
  const [departments, setDepartments]       = useState([]);
  const [positions, setPositions]           = useState([]);
  const [emails, setEmails]                 = useState([]);

  const [searchTerm, setSearchTerm]         = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('All Departments');

  const [showModal, setShowModal]           = useState(false);
  const [isEditing, setIsEditing]           = useState(false);
  const [editingId, setEditingId]           = useState(null);

  const [formData, setFormData]             = useState({
    employee_code:     '',
    employee_firstName: '',
    employee_LastName:  '',
    department_ID:     '',
    position_ID:       '',
    email_ID:          '',
  });

  const [saving, setSaving]     = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // ────────────────────────────────────────────────
  // Load data
  // ────────────────────────────────────────────────
  useEffect(() => {
    loadEmployees();
    loadMetadata();
  }, []);

  const loadEmployees = async () => {
    try {
      const data = await getEmployees({ archived: 0 });
      const list = Array.isArray(data) ? data : (data?.data ?? []);
      setEmployees(list.filter(e => e.is_archived !== 1 && e.is_archived !== true));
    } catch (err) {
      showFeedback('danger', 'Failed to load employees');
    }
  };

  const loadMetadata = async () => {
    try {
      const [deps, pos, emls] = await Promise.all([
        getDepartments(),
        getPositions(),
        getEmailsList()
      ]);
      setDepartments(Array.isArray(deps) ? deps : deps?.data ?? []);
      setPositions(Array.isArray(pos) ? pos : pos?.data ?? []);
      setEmails(Array.isArray(emls) ? emls : emls?.data ?? []);
    } catch (err) {
      console.error('Failed to load metadata', err);
    }
  };

  // ────────────────────────────────────────────────
  // Filtering
  // ────────────────────────────────────────────────
  const filteredEmployees = employees.filter(emp => {
    const fullName = `${emp.employee_firstName || ''} ${emp.employee_LastName || ''}`.toLowerCase();
    const q = searchTerm.toLowerCase();

    const matchSearch =
      fullName.includes(q) ||
      String(emp.employee_code || '').includes(q) ||
      (emp.position || '').toLowerCase().includes(q);

    const matchDept =
      selectedDepartment === 'All Departments' ||
      emp.department_name === selectedDepartment;

    return matchSearch && matchDept;
  });

  // ────────────────────────────────────────────────
  // Modal & Form handlers
  // ────────────────────────────────────────────────
  const openAddModal = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormData({
      employee_code: '', employee_firstName: '', employee_LastName: '',
      department_ID: '', position_ID: '', email_ID: ''
    });
    setFeedback({ type: '', message: '' });
    setShowModal(true);
  };

  const openEditModal = (emp) => {
    setIsEditing(true);
    setEditingId(emp.employee_ID);
    setFormData({
      employee_code:     emp.employee_code     || '',
      employee_firstName: emp.employee_firstName || '',
      employee_LastName:  emp.employee_LastName  || '',
      department_ID:     emp.department_ID     || '',
      position_ID:       emp.position_ID       || '',
      email_ID:          emp.email_ID          || '',
    });
    setFeedback({ type: '', message: '' });
    setShowModal(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFeedback({ type: '', message: '' });

    // Basic client-side validation
    if (!formData.employee_code.trim() ||
        !formData.employee_firstName.trim() ||
        !formData.employee_LastName.trim()) {
      setFeedback({ type: 'danger', message: 'Employee code, first name and last name are required.' });
      return;
    }

    if (!formData.department_ID) {
      setFeedback({ type: 'danger', message: 'Please select a department.' });
      return;
    }

    if (!formData.position_ID) {
      setFeedback({ type: 'danger', message: 'Please select a position.' });
      return;
    }

    setSaving(true);

    try {
      let result;
      if (isEditing) {
        result = await updateEmployee({
          employee_ID: editingId,
          ...formData
        });
      } else {
        result = await addEmployee(formData);
      }

      setShowModal(false);
      showFeedback('success', result?.message || (isEditing ? 'Employee updated' : 'Employee added'));
      loadEmployees();
    } catch (err) {
      showFeedback('danger', err?.message || 'Operation failed. Check console or backend logs.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Archive this employee?')) return;
    try {
      await deleteEmployee(id);
      showFeedback('success', 'Employee archived');
      loadEmployees();
    } catch (err) {
      showFeedback('danger', 'Failed to archive employee');
    }
  };

  const showFeedback = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback({ type: '', message: '' }), 4500);
  };

  // ────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────
  return (
    <div className="admin-page">
      <div className="page-header-section">
        <h1 className="page-title">Employee Management</h1>
        <Button variant="success" onClick={openAddModal}>
          + Add Employee
        </Button>
      </div>

      <Card className="content-card">
        <Card.Body>

          {feedback.message && (
            <Alert variant={feedback.type} dismissible onClose={() => setFeedback({type:'', message:''})}>
              {feedback.message}
            </Alert>
          )}

          <Row className="mb-4">
            <Col md={7}>
              <Form.Control
                placeholder="Search name, code, position..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </Col>
            <Col md={5}>
              <Form.Select
                value={selectedDepartment}
                onChange={e => setSelectedDepartment(e.target.value)}
              >
                <option>All Departments</option>
                {departments.map(d => (
                  <option key={d.department_ID} value={d.department_name}>
                    {d.department_name}
                  </option>
                ))}
              </Form.Select>
            </Col>
          </Row>

          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th>Code</th>
                <th>Full Name</th>
                <th>Department</th>
                <th>Position</th>
                <th style={{ width: 140 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-4 text-muted">
                    No employees found
                  </td>
                </tr>
              ) : (
                filteredEmployees.map(emp => (
                  <tr key={emp.employee_ID}>
                    <td>{emp.employee_code}</td>
                    <td>{emp.employee_firstName} {emp.employee_LastName}</td>
                    <td>{emp.department_name || '—'}</td>
                    <td>{emp.position || '—'}</td>
                    <td>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        className="me-2"
                        onClick={() => openEditModal(emp)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => handleDelete(emp.employee_ID)}
                      >
                        Archive
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>

        </Card.Body>
      </Card>

      {/* ──── MODAL ──── */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{isEditing ? 'Edit Employee' : 'Add New Employee'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmit}>
            
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Employee Code *</Form.Label>
                  <Form.Control
                    name="employee_code"
                    value={formData.employee_code}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                {/* Photo upload placeholder — expand when ready */}
                {/* <Form.Label>Photo (max 5)</Form.Label>
                <Form.Control type="file" multiple accept="image/*" /> */}
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>First Name *</Form.Label>
                  <Form.Control
                    name="employee_firstName"
                    value={formData.employee_firstName}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Last Name *</Form.Label>
                  <Form.Control
                    name="employee_LastName"
                    value={formData.employee_LastName}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Department *</Form.Label>
                  <Form.Select
                    name="department_ID"
                    value={formData.department_ID}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select Department</option>
                    {departments.map(d => (
                      <option key={d.department_ID} value={d.department_ID}>
                        {d.department_name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Position *</Form.Label>
                  <Form.Select
                    name="position_ID"
                    value={formData.position_ID}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select Position</option>
                    {positions.map(p => (
                      <option key={p.position_ID} value={p.position_ID}>
                        {p.position_name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-4">
              <Form.Label>Email (optional)</Form.Label>
              <Form.Select
                name="email_ID"
                value={formData.email_ID}
                onChange={handleChange}
              >
                <option value="">— None —</option>
                {emails.map(em => (
                  <option key={em.email_ID} value={em.email_ID}>
                    {em.email}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <div className="d-flex justify-content-end gap-2">
              <Button variant="secondary" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                variant={isEditing ? "warning" : "success"}
                disabled={saving}
              >
                {saving ? 'Saving...' : isEditing ? 'Update Employee' : 'Add Employee'}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
}

export default EmployeesPage;