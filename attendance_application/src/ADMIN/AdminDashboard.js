import React, { useState, useEffect } from 'react';
import { Row, Col, Card } from 'react-bootstrap';
import EmployeesPage from './Employeespage';
import EventsPage from './Eventspage';
import EventDetailsPage from './Eventdetailspage';
import EntryExitPage from './Entryexitpage';
import { getDashboardStats, getDepartmentAttendance } from '../api';
import './ccs/dashboard.css';

function AdminDashboard({ onLogout }) {

  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [currentPage, setCurrentPage] = useState({ page: 'dashboard', data: null });
  const [eventsDropdownOpen, setEventsDropdownOpen] = useState(false);

  // ================================
  // DASHBOARD STATE (FROM DATABASE)
  // ================================

  const [stats, setStats] = useState({
    totalPresent: 0,
    totalAbsent: 0,
    totalLate: 0,
    todayEntries: 0,
    todayExits: 0,
  });

  const [departmentData, setDepartmentData] = useState([]);

  // ================================
  // LOAD DATA
  // ================================

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const statsData = await getDashboardStats();
      const deptData = await getDepartmentAttendance();

      setStats(statsData ?? { totalPresent: 0, totalAbsent: 0, totalLate: 0, todayEntries: 0, todayExits: 0 });
      setDepartmentData(Array.isArray(deptData) ? deptData : []);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setDepartmentData([]);
    }
  };

  // ================================
  // CALCULATIONS
  // ================================

  const total = stats.totalPresent + stats.totalAbsent + stats.totalLate;

  const presentPercent = total ? (stats.totalPresent / total) * 100 : 0;
  const latePercent = total ? (stats.totalLate / total) * 100 : 0;
  const absentPercent = total ? (stats.totalAbsent / total) * 100 : 0;

  const formatTime = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const navigateToPage = (pageName, data = null) => {
    setActiveMenu(pageName === 'eventDetails' ? 'events' : pageName);
    setCurrentPage({ page: pageName, data });
  };

  // ================================
  // DASHBOARD VIEW
  // ================================

  const renderDashboard = () => (
    <div className="dashboard-container">

      <h1 className="dashboard-title mb-4">Dashboard Overview</h1>

      {/* ================= STATS CARDS ================= */}
      <Row className="g-4 mb-4">

        <Col md={6} lg={3}>
          <Card className="stat-card">
            <Card.Body>
              <p className="stat-label">Present Today</p>
              <h2 className="stat-value text-success">{stats.totalPresent}</h2>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6} lg={3}>
          <Card className="stat-card">
            <Card.Body>
              <p className="stat-label">Late Today</p>
              <h2 className="stat-value text-warning">{stats.totalLate}</h2>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6} lg={3}>
          <Card className="stat-card">
            <Card.Body>
              <p className="stat-label">Absent Today</p>
              <h2 className="stat-value text-danger">{stats.totalAbsent}</h2>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6} lg={3}>
          <Card className="stat-card">
            <Card.Body>
              <p className="stat-label">Total Employees</p>
              <h2 className="stat-value">{total}</h2>
            </Card.Body>
          </Card>
        </Col>

      </Row>

      {/* ================= ENTRY / EXIT ================= */}
      <Row className="g-4 mb-4">

        <Col md={6}>
          <Card className="gateway-card">
            <Card.Body>
              <h5>Today's Entries</h5>
              <h2>{stats.todayEntries}</h2>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6}>
          <Card className="gateway-card">
            <Card.Body>
              <h5>Today's Exits</h5>
              <h2>{stats.todayExits}</h2>
            </Card.Body>
          </Card>
        </Col>

      </Row>

      {/* ================= PIE CHART ================= */}
      <Row className="g-4">
        <Col lg={6}>
          <Card className="analytics-card">
            <Card.Body>

              <h6>Overall Attendance Distribution</h6>

              <div className="pie-chart-container">
                <svg viewBox="0 0 200 200" className="pie-chart">

                  {/* Present */}
                  <circle
                    cx="100"
                    cy="100"
                    r="65"
                    fill="transparent"
                    stroke="#28a745"
                    strokeWidth="40"
                    strokeDasharray={`${(presentPercent / 100) * 408} 408`}
                    transform="rotate(-90 100 100)"
                  />

                  {/* Late */}
                  <circle
                    cx="100"
                    cy="100"
                    r="65"
                    fill="transparent"
                    stroke="#ffc107"
                    strokeWidth="40"
                    strokeDasharray={`${(latePercent / 100) * 408} 408`}
                    transform={`rotate(${presentPercent * 3.6 - 90} 100 100)`}
                  />

                  {/* Absent */}
                  <circle
                    cx="100"
                    cy="100"
                    r="65"
                    fill="transparent"
                    stroke="#dc3545"
                    strokeWidth="40"
                    strokeDasharray={`${(absentPercent / 100) * 408} 408`}
                    transform={`rotate(${(presentPercent + latePercent) * 3.6 - 90} 100 100)`}
                  />

                </svg>

                <div className="pie-chart-legend">
                  <div className="legend-item">
                    <span className="legend-dot" style={{ background: '#28a745' }}></span>
                    <span>
                      Present: {stats.totalPresent} ({presentPercent.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-dot" style={{ background: '#ffc107' }}></span>
                    <span>
                      Late: {stats.totalLate} ({latePercent.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-dot" style={{ background: '#dc3545' }}></span>
                    <span>
                      Absent: {stats.totalAbsent} ({absentPercent.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              </div>

            </Card.Body>
          </Card>
        </Col>

        {/* ================= DEPARTMENT ATTENDANCE ================= */}
        <Col lg={6}>
          <Card className="analytics-card">
            <Card.Body>
              <h6>Department-wise Attendance</h6>

              {(Array.isArray(departmentData) ? departmentData : []).map((dept, idx) => (
                <div key={idx} className="bar-chart-row">
                  <div className="bar-label">{dept.department_name}</div>
                  <div className="bar-container">

                    <div
                      className="bar bar-present"
                      style={{ width: `${dept.presentPercent}%` }}
                    >
                      {dept.present}
                    </div>

                    <div
                      className="bar bar-absent"
                      style={{ width: `${dept.absentPercent}%` }}
                    >
                      {dept.absent}
                    </div>

                  </div>
                </div>
              ))}

            </Card.Body>
          </Card>
        </Col>

      </Row>
    </div>
  );

  // ================================
  // MAIN RETURN
  // ================================

  return (
    <div className="admin-dashboard">

      {/* ================= SIDEBAR NAVIGATION ================= */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo-circle">
            <i className="bi bi-building" style={{ fontSize: '28px', color: 'white' }}></i>
          </div>
          <div className="sidebar-title">
            <h5>INSTITUTIONAL ADMIN SUPPORT</h5>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div
            className={`nav-item ${activeMenu === 'dashboard' ? 'active' : ''}`}
            onClick={() => navigateToPage('dashboard')}
          >
            <i className="bi bi-grid-3x3-gap-fill"></i>
            <span>Dashboard</span>
          </div>
          <div
            className={`nav-item ${activeMenu === 'employees' ? 'active' : ''}`}
            onClick={() => navigateToPage('employees')}
          >
            <i className="bi bi-people-fill"></i>
            <span>Employees</span>
          </div>
          <div
            className={`nav-item nav-item-dropdown ${activeMenu === 'events' ? 'active' : ''}`}
            onClick={() => navigateToPage('events')}
            onMouseEnter={() => setEventsDropdownOpen(true)}
            onMouseLeave={() => setEventsDropdownOpen(false)}
          >
            <i className="bi bi-calendar-event-fill"></i>
            <span>Events</span>
            <i
              className={`bi bi-chevron-${eventsDropdownOpen ? 'up' : 'down'} ms-auto`}
            ></i>
            {eventsDropdownOpen && (
              <div className="dropdown-menu-custom">
                <div
                  className={`dropdown-item-custom ${
                    currentPage.page === 'events' ? 'active' : ''
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateToPage('events');
                  }}
                >
                  <i className="bi bi-list-task me-2"></i>
                  <span>Events Overview</span>
                </div>
                <div
                  className="dropdown-item-custom"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateToPage('events');
                  }}
                >
                  <i className="bi bi-people-fill me-2"></i>
                  <span>Event Attendance</span>
                </div>
              </div>
            )}
          </div>
          <div
            className={`nav-item ${activeMenu === 'entryExit' ? 'active' : ''}`}
            onClick={() => navigateToPage('entryExit')}
          >
            <i className="bi bi-box-arrow-right"></i>
            <span>Entry/Exit</span>
          </div>
        </nav>

        <div className="sidebar-footer">
          <button className="sign-out-btn" onClick={onLogout}>
            <i className="bi bi-box-arrow-right"></i>
            <span>SIGN OUT</span>
          </button>
        </div>
      </aside>

      <div className="main-content-area">

        <div className="status-bar">
          <span className="status-badge">Live Status</span>
          <span className="status-date">{formatTime(currentTime)}</span>
        </div>

        <div className="content-overlay">
          {currentPage.page === 'dashboard' && renderDashboard()}
          {currentPage.page === 'employees' && <EmployeesPage />}
          {currentPage.page === 'events' && (
            <EventsPage onNavigate={(page, data) => navigateToPage(page, data)} />
          )}
          {currentPage.page === 'eventDetails' && (
            <EventDetailsPage
              eventData={currentPage.data}
              onNavigate={(page) => navigateToPage(page)}
            />
          )}
          {currentPage.page === 'entryExit' && <EntryExitPage />}
        </div>

      </div>
    </div>
  );
}

export default AdminDashboard;