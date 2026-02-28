import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Form, Button, Table, Modal } from 'react-bootstrap';
import { getEmployees, addEmployee, deleteEmployee } from '../api';
import './ccs/employee.css';

function EmployeesPage() {

  // ===============================
  // STATE
  // ===============================

  const [employees, setEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('All Departments');

  const [showAddModal, setShowAddModal] = useState(false);

  const [newEmployee, setNewEmployee] = useState({
    employee_code: '',
    employee_firstName: '',
    employee_LastName: '',
  });

  // ===============================
  // LOAD DATA FROM DATABASE
  // ===============================

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    const data = await getEmployees();
    const list = Array.isArray(data) ? data : (data?.data ?? []);
    setEmployees(list);
  };

  // ===============================
  // FILTER LOGIC
  // ===============================

  const filteredEmployees = employees.filter(emp => {
    const fullName = `${emp.employee_firstName} ${emp.employee_LastName}`;
    const q = searchTerm.toLowerCase();

    const matchSearch =
      fullName.toLowerCase().includes(q) ||
      String(emp.employee_code).includes(q) ||
      emp.position.toLowerCase().includes(q);

    const matchDept =
      selectedDepartment === 'All Departments' ||
      emp.department_name === selectedDepartment;

    return matchSearch && matchDept;
  });

  // ===============================
  // DYNAMIC DEPARTMENT COUNTS
  // ===============================

  const departmentCounts = employees.reduce((acc, emp) => {
    const found = acc.find(d => d.name === emp.department_name);
    if (found) {
      found.count += 1;
    } else {
      acc.push({ name: emp.department_name, count: 1 });
    }
    return acc;
  }, []);

  // ===============================
  // DELETE EMPLOYEE
  // ===============================

  const handleDelete = async (id) => {
    if (window.confirm("Delete this employee?")) {
      await deleteEmployee(id);
      loadEmployees();
    }
  };

  // ===============================
  // ADD EMPLOYEE
  // ===============================

  const handleSubmitAdd = async (e) => {
    e.preventDefault();

    await addEmployee({
      employee_code: newEmployee.employee_code,
      employee_firstName: newEmployee.employee_firstName,
      employee_LastName: newEmployee.employee_LastName,
      department_ID: 1, // Adjust if you implement dynamic department selection
      position_ID: 1,
      email_ID: 1
    });

    setShowAddModal(false);
    setNewEmployee({
      employee_code: '',
      employee_firstName: '',
      employee_LastName: '',
    });

    loadEmployees();
  };

  // ===============================
  // UI
  // ===============================

  return (
    <div className="admin-page">

      {/* HEADER */}
      <div className="page-header-section">
        <h1 className="page-title">Employee Management</h1>
        <Button onClick={() => setShowAddModal(true)}>
          Add Employee
        </Button>
      </div>

      <Card className="content-card">
        <Card.Body>

          {/* SEARCH */}
          <Row className="mb-3">
            <Col md={8}>
              <Form.Control
                type="text"
                placeholder="Search name, ID, position..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </Col>
            <Col md={4}>
              <Form.Select
                value={selectedDepartment}
                onChange={e => setSelectedDepartment(e.target.value)}
              >
                <option value="All Departments">All Departments</option>
                {departmentCounts.map((dept, i) => (
                  <option key={i} value={dept.name}>
                    {dept.name}
                  </option>
                ))}
              </Form.Select>
            </Col>
          </Row>

          {/* DEPARTMENT BADGES */}
          <div className="mb-3">
            {departmentCounts.map((dept, i) => (
              <span key={i} style={{ marginRight: 10 }}>
                {dept.name} ({dept.count})
              </span>
            ))}
          </div>

          {/* TABLE */}
          <Table striped bordered hover>
            <thead>
              <tr>
                <th>Employee Code</th>
                <th>Name</th>
                <th>Department</th>
                <th>Position</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.length > 0 ? (
                filteredEmployees.map(emp => (
                  <tr key={emp.employee_ID}>
                    <td>{emp.employee_code}</td>
                    <td>{emp.employee_firstName} {emp.employee_LastName}</td>
                    <td>{emp.department_name}</td>
                    <td>{emp.position}</td>
                    <td>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(emp.employee_ID)}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center" }}>
                    No employees found
                  </td>
                </tr>
              )}
            </tbody>
          </Table>

        </Card.Body>
      </Card>

      {/* ADD MODAL */}
      <Modal show={showAddModal} onHide={() => setShowAddModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Add Employee</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Form onSubmit={handleSubmitAdd}>
            <Form.Group className="mb-3">
              <Form.Label>Employee Code</Form.Label>
              <Form.Control
                required
                value={newEmployee.employee_code}
                onChange={e => setNewEmployee({
                  ...newEmployee,
                  employee_code: e.target.value
                })}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>First Name</Form.Label>
              <Form.Control
                required
                value={newEmployee.employee_firstName}
                onChange={e => setNewEmployee({
                  ...newEmployee,
                  employee_firstName: e.target.value
                })}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Last Name</Form.Label>
              <Form.Control
                required
                value={newEmployee.employee_LastName}
                onChange={e => setNewEmployee({
                  ...newEmployee,
                  employee_LastName: e.target.value
                })}
              />
            </Form.Group>

            <Button type="submit">Save</Button>
          </Form>
        </Modal.Body>
      </Modal>

    </div>
  );
}

export default EmployeesPage;