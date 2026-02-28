import React from 'react';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import './LandingPage.css';

function LandingPage({ onSelectMode }) {
  return (
    <div className="landing-container" style={{
      backgroundImage: `url(${process.env.PUBLIC_URL}/BG.png)`
    }}>
      {/* Background Overlay */}
      <div className="landing-overlay"></div>

      {/* Logo */}
      <div className="landing-logo-container">
        <img 
          src={`${process.env.PUBLIC_URL}/LOGO.png`} 
          alt="Pasig City Logo" 
          className="landing-logo"
        />
      </div>

      {/* Main Content */}
      <Container className="landing-content">
        <Row className="justify-content-center align-items-center min-vh-100">
          <Col lg={10} xl={9}>
            <Row className="g-4">
              {/* Employee Card */}
              <Col md={6}>
                <Card className="mode-card shadow-lg h-100">
                  <Card.Body className="text-center p-5">
                    <div className="icon-circle employee-icon mb-4">
                      <i className="bi bi-person-circle"></i>
                    </div>
                    <h3 className="mb-3 fw-bold">Employee</h3>
                    <p className="text-muted mb-4">
                      Check in/out using face recognition
                    </p>
                    <Button 
                      variant="success" 
                      size="lg" 
                      className="w-100 py-3 fw-bold mode-button"
                      onClick={() => onSelectMode('employee')}
                    >
                      Continue as Employee
                    </Button>
                    <div className="feature-list mt-4 text-start">
                      <div className="feature-item">
                        <i className="bi bi-check-circle-fill text-success me-2"></i>
                        <span>Face recognition check-in</span>
                      </div>
                      <div className="feature-item">
                        <i className="bi bi-check-circle-fill text-success me-2"></i>
                        <span>Quick entrance/exit logging</span>
                      </div>
                      <div className="feature-item">
                        <i className="bi bi-check-circle-fill text-success me-2"></i>
                        <span>Flag ceremony attendance</span>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>

              {/* Administrator Card */}
              <Col md={6}>
                <Card className="mode-card shadow-lg h-100">
                  <Card.Body className="text-center p-5">
                    <div className="icon-circle admin-icon mb-4">
                      <i className="bi bi-shield-fill-check"></i>
                    </div>
                    <h3 className="mb-3 fw-bold">Administrator</h3>
                    <p className="text-muted mb-4">
                      Manage attendance and analytics
                    </p>
                    <Button 
                      variant="primary" 
                      size="lg" 
                      className="w-100 py-3 fw-bold mode-button"
                      onClick={() => onSelectMode('admin')}
                    >
                      Continue as Admin
                    </Button>
                    <div className="feature-list mt-4 text-start">
                      <div className="feature-item">
                        <i className="bi bi-check-circle-fill text-primary me-2"></i>
                        <span>View dashboard & analytics</span>
                      </div>
                      <div className="feature-item">
                        <i className="bi bi-check-circle-fill text-primary me-2"></i>
                        <span>Manage employee records</span>
                      </div>
                      <div className="feature-item">
                        <i className="bi bi-check-circle-fill text-primary me-2"></i>
                        <span>Track flag ceremony & logs</span>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            {/* Footer Features */}
            <Row className="mt-5">
              <Col md={4} className="text-center mb-3">
                <div className="footer-feature">
                  <i className="bi bi-door-open-fill text-warning fs-2 mb-2"></i>
                  <p className="text-white mb-0 small fw-semibold">Entrance Support</p>
                </div>
              </Col>
              <Col md={4} className="text-center mb-3">
                <div className="footer-feature">
                  <i className="bi bi-graph-up text-warning fs-2 mb-2"></i>
                  <p className="text-white mb-0 small fw-semibold">Exit Analytics</p>
                </div>
              </Col>
              <Col md={4} className="text-center mb-3">
                <div className="footer-feature">
                  <i className="bi bi-flag-fill text-warning fs-2 mb-2"></i>
                  <p className="text-white mb-0 small fw-semibold">Flag Ceremony Tracking</p>
                </div>
              </Col>
            </Row>
          </Col>
        </Row>
      </Container>

      {/* Bootstrap Icons CDN */}
      <link 
        rel="stylesheet" 
        href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css"
      />
    </div>
  );
}

export default LandingPage;