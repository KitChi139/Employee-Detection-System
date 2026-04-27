import React, { useState, useRef, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Container, Row, Col, Card, Button, Badge, Modal, Form } from 'react-bootstrap';
import './LandingPage.css';
import { getEvents, getEmployees, getEmployeePhotos, markAttendance, getEventSetup } from '../api';
import LoginPage from './Adminlogin';
import * as faceapi from 'face-api.js';
import { Html5QrcodeScanner, Html5Qrcode } from "html5-qrcode";




// ── Keys shared with Settingspage ──────────────────────────────────────────
const LOGO_KEY = 'plp_logo';
const NAME_KEY = 'institution_name';

function EmployeePage({ onBack, onNavigateAdmin }) {
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // ── Branding (logo + name) ─────────────────────────────────────────────
  const [branding, setBranding] = useState({
    logo: localStorage.getItem(LOGO_KEY) || null,
    name: localStorage.getItem(NAME_KEY) || 'INSTITUTIONAL ADMIN SUPPORT'
  });

  const [cameraActive, setCameraActive] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [eventExpanded, setEventExpanded] = useState(false);
  const [recognizedUser, setRecognizedUser] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [attendanceType, setAttendanceType] = useState('');
  const [attendanceStatus, setAttendanceStatus] = useState(null); // 'success' or 'error'
  const [attendanceMsg, setAttendanceMsg] = useState('');
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [isDetecting, setIsDetecting] = useState(false);

  const [manualMode, setManualMode]         = useState(false);
  const [manualId, setManualId]             = useState('');
  const [manualError, setManualError]       = useState('');
  const [manualSearched, setManualSearched] = useState(false);
  const [employees, setEmployees]           = useState([]);
  const [dataLoading, setDataLoading]       = useState(false);
  const [dataError, setDataError]           = useState('');
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const detectionLoopRef = useRef(null);
  // Pre-parsed & pre-normalized embeddings — built once when employees load, never rebuilt
  const cachedEmbeddingsRef = useRef([]); // [{ emp, vec: Float32Array, norm: number }]
  const [recognitionConfidence, setRecognitionConfidence] = useState(0);
  const [recognitionTimer, setRecognitionTimer] = useState(null);
  const [showConfirmButtons, setShowConfirmButtons] = useState(false);
  const [currentDetectedName, setCurrentDetectedName] = useState('');
  const [currentConfidence, setCurrentConfidence] = useState(0);
  const [isScanning, setIsScanning] = useState(true);   // Controls whether we run recognition

  const [qrMode, setQrMode] = useState(false);
  const qrScannerRef = useRef(null);

  // --- Cooldown Tracking Refs ---
  const lastFaceIdRef = useRef(null);
  const lastScanTimeRef = useRef(0);
  const SCAN_COOLDOWN = 10000; // 10 seconds

  const handleManualIdKey = (digit) => {
    setManualError('');
    setManualSearched(false);
    setManualId(prev => prev + digit);
  };

  const handleManualBackspace = () => {
    setManualError('');
    setManualSearched(false);
    setManualId(prev => prev.slice(0, -1));
  };

  const handleManualClear = () => {
    setManualId('');
    setManualError('');
    setManualSearched(false);
  };

  const handleManualSearch = () => {
    if (!manualId.trim()) {
      setManualError('Please enter an employee ID.');
      return;
    }
    if (!employees.length) {
      setManualError('Employee data is not loaded yet. Please try again in a moment.');
      return;
    }

    setManualSearched(true);

    const normalizedInput = manualId.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

    const found = employees.find(emp => {
      const codeRaw = String(emp.employee_code || '');
      const codeNoDash = codeRaw.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      return (
        codeNoDash === normalizedInput ||
        codeRaw.toLowerCase() === manualId.toLowerCase()
      );
    });

    if (found) {
      const newUser = {
        name: `${found.employee_firstName} ${found.employee_LastName}`,
        id: found.employee_code,
        department: found.department_name,
        role: found.position,
        employeeId: found.employee_ID,
        lastAction: null,
        photo: null
      };

      // --- Cooldown Logic for Manual Entry ---
      const now = Date.now();
      if (newUser.employeeId === lastFaceIdRef.current && (now - lastScanTimeRef.current < SCAN_COOLDOWN)) {
        setManualError('This employee recently scanned. Please wait a few seconds.');
        return;
      }

      // Update tracking
      lastFaceIdRef.current = newUser.employeeId;
      lastScanTimeRef.current = now;

      setRecognizedUser(newUser);
      setManualError('');
      // Automatically trigger attendance after a short delay for manual entry too
      setTimeout(() => {
        handleMarkAttendance(newUser, 'manual');
      }, 500);
    } else {
      setManualError('No employee found with that ID. Please try again.');
      setRecognizedUser(null);
    }
  };

  const handleScanDifferentFace = () => {
    if (recognitionTimer) clearTimeout(recognitionTimer);
    
    setRecognizedUser(null);
    setShowConfirmButtons(false);
    setRecognitionConfidence(0);
    setCurrentDetectedName('');
    setCurrentConfidence(0);
    setIsScanning(true);            // Resume scanning
  };

  const handleExitManualMode = () => {
    setManualMode(false);
    setManualId('');
    setManualError('');
    setManualSearched(false);
    setRecognizedUser(null);
  };

  const startQrScanner = () => {
    if (!selectedEvent) {
      alert("Please select an event first");
      return;
    }
    stopCamera();
    setManualMode(false);
    setQrMode(true);
  };

  const stopQrScanner = async () => {
    if (qrScannerRef.current) {
      try {
        await qrScannerRef.current.stop();
        qrScannerRef.current = null;
      } catch (err) {
        console.warn("Failed to stop QR scanner:", err);
      }
    }
    setQrMode(false);
    setRecognizedUser(null);
  };

  useEffect(() => {
    if (qrMode && !qrScannerRef.current) {
      const html5QrCode = new Html5Qrcode("qr-reader");
      qrScannerRef.current = html5QrCode;

      const config = { fps: 10, qrbox: { width: 250, height: 250 } };

      html5QrCode.start(
        { facingMode: "user" },
        config,
        (decodedText) => {
          try {
            const data = JSON.parse(decodedText);
            if (data.employee_id) {
              handleQrScan(data);
            }
          } catch (e) {
            console.warn("Invalid QR data:", decodedText);
          }
        },
        (errorMessage) => {
          // ignore scan errors
        }
      ).catch(err => {
        console.error("Failed to start QR scanner:", err);
        setQrMode(false);
      });
    }

    return () => {
      if (qrScannerRef.current && !qrMode) {
        qrScannerRef.current.stop().catch(err => console.warn(err));
        qrScannerRef.current = null;
      }
    };
  }, [qrMode]);

  const handleQrScan = (data) => {
    const now = Date.now();
    const employeeId = data.employee_id;

    // Cooldown check
    if (employeeId === lastFaceIdRef.current && (now - lastScanTimeRef.current < SCAN_COOLDOWN)) {
      return;
    }

    // Find employee in loaded data to get department/role
    const found = employees.find(emp => String(emp.employee_code) === String(employeeId) || String(emp.employee_ID) === String(employeeId));
    
    const newUser = {
      name: data.name || (found ? `${found.employee_firstName} ${found.employee_LastName}` : 'Unknown'),
      id: employeeId,
      department: data.department || (found ? found.department_name : ''),
      role: data.designation || (found ? found.position : ''),
      employeeId: found ? found.employee_ID : employeeId, // Fallback if not found in list
      photo: null,
      lastAction: null
    };

    lastFaceIdRef.current = employeeId;
    lastScanTimeRef.current = now;

    setRecognizedUser(newUser);
    handleMarkAttendance(newUser, 'qr');
  };

  const [clockTapCount, setClockTapCount] = useState(0);
  const clockTapTimer                     = useRef(null);
  const [showAdminLogin, setShowAdminLogin] = useState(false);

  const handleClockTap = () => {
    const next = clockTapCount + 1;
    setClockTapCount(next);
    clearTimeout(clockTapTimer.current);
    if (next >= 5) {
      setClockTapCount(0);
      setShowAdminLogin(true);
    } else {
      clockTapTimer.current = setTimeout(() => setClockTapCount(0), 2000);
    }
  };

  const [availableEvents, setAvailableEvents] = useState([]);

  // ── Cleanup overflow on component unmount ──
  useEffect(() => {
    return () => {
      // Just ensure we're clean on unmount
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setDataLoading(true);
        setDataError('');

        const [eventsData, employeesData] = await Promise.all([
          getEvents({ archived: 0, is_active: 1 }),
          getEmployees(),
        ]);

        // Events
        const eventsArr = Array.isArray(eventsData) ? eventsData : (eventsData?.data ?? []);
        if (Array.isArray(eventsArr)) {
          const formattedEvents = eventsArr.map(event => ({
            id: event.event_ID,
            name: event.event_name,
            time: event.event_time ?? event.time ?? '',
            description: event.description ?? event.event_desc ?? '',
            type: event.eventtype_name ?? event.eventtype ?? '',
            scanMode: event.scan_mode || 'check_in',
          }));
          setAvailableEvents(formattedEvents);
        }

        // Employees - Basic info first
        let empArr = Array.isArray(employeesData) ? employeesData : (employeesData?.data ?? []);
        const activeEmps = (Array.isArray(empArr) ? empArr : []).filter(e => e.is_archived != 1);

        console.log(`Loaded ${activeEmps.length} active employees (basic info)`);

        // Now fetch embeddings for all active employees
        const employeesWithEmbeddings = await Promise.all(
          activeEmps.map(async (emp) => {
            try {
              const photosData = await getEmployeePhotos(emp.employee_ID);
              const photos = Array.isArray(photosData) ? photosData : (photosData?.data ?? []);

              // Take the first embedding (or combine multiple if you want)
              if (photos.length > 0 && photos[0].embedding) {
                return {
                  ...emp,
                  embedding: photos[0].embedding   // array of 128 numbers
                };
              }
              return emp; // no embedding
            } catch (err) {
              console.warn(`Failed to load embedding for employee ${emp.employee_code}`, err);
              return emp;
            }
          })
        );

        setEmployees(employeesWithEmbeddings);
        console.log("Final employees with embeddings:", employeesWithEmbeddings.length);

      } catch (error) {
        console.error('Failed to load initial data:', error);
        setDataError(error.message || 'Failed to load events or employees.');
      } finally {
        setDataLoading(false);
      }
    };

    loadInitialData();
    
    // Refresh events every 10 seconds to sync with Admin changes
    const eventTimer = setInterval(async () => {
      try {
        const eventsData = await getEvents({ archived: 0, is_active: 1 });
        const eventsArr = Array.isArray(eventsData) ? eventsData : (eventsData?.data ?? []);
        if (Array.isArray(eventsArr)) {
          const formattedEvents = eventsArr.map(event => ({
            id: event.event_ID,
            name: event.event_name,
            time: event.event_time ?? event.time ?? '',
            description: event.description ?? event.event_desc ?? '',
            type: event.eventtype_name ?? event.eventtype ?? '',
            scanMode: event.scan_mode || 'check_in',
          }));
          setAvailableEvents(formattedEvents);
        }
      } catch (e) {
        console.warn("Failed to auto-refresh events", e);
      }
    }, 10000);

    return () => clearInterval(eventTimer);
  }, []);


  useEffect(() => {
    if (availableEvents.length > 0 && !selectedEvent) {
      setSelectedEvent(availableEvents[0].id.toString());
    }
  }, [availableEvents, selectedEvent]);

  useEffect(() => {
    if (showAdminLogin) {
      document.body.classList.add('overlay-active');
    } else {
      document.body.classList.remove('overlay-active');
    }
    return () => {
      document.body.classList.remove('overlay-active');
    };
  }, [showAdminLogin]);

  const formatDate = (date) => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { hour12: true });
  };

  const getSelectedEventDetails = () => {
    return availableEvents.find(event => event.id.toString() === selectedEvent);
  };
    useEffect(() => {
      const setupBackend = async () => {
        try {
          // Force CPU backend to avoid WebGL crash
          await faceapi.tf.setBackend('cpu');
          await faceapi.tf.ready();   // Important: wait until ready
          
          console.log('✅ Using CPU backend for face-api.js');
          
          // Now load your models
          await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
            faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
            faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
          ]);
          
          setModelsLoaded(true);
          console.log('✅ Models loaded with CPU backend');
        } catch (err) {
          console.error('❌ Backend or model loading failed:', err);
        }
      };

      setupBackend();
    }, []);

  // Live Face Detection + Recognition — optimized with RAF + pre-built cache
  useEffect(() => {
    if (!cameraActive || !modelsLoaded || !employees.length || !isScanning) {
      setCurrentDetectedName('');
      setCurrentConfidence(0);
      return;
    }

    let rafId = null;
    let lastRun = 0;
    const INTERVAL = 350; // ms between detections — enough for smooth UI without hammering CPU

    const runRecognition = async (timestamp) => {
      rafId = requestAnimationFrame(runRecognition);

      if (timestamp - lastRun < INTERVAL) return;
      lastRun = timestamp;

      const video = videoRef.current;
      if (!video || video.readyState < 2) return;

      try {
        // Skip withFaceLandmarks — not needed for recognition, saves ~30% CPU
        const detection = await faceapi
          .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({
            inputSize: 128,        // Smallest size — fast enough for attendance
            scoreThreshold: 0.4
          }))
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (!detection) {
          setCurrentDetectedName('');
          setCurrentConfidence(0);
          return;
        }

        const liveVec = detection.descriptor;

        // Pre-compute live norm once
        let liveNorm = 0;
        for (let i = 0; i < 128; i++) liveNorm += liveVec[i] * liveVec[i];
        liveNorm = Math.sqrt(liveNorm);

        // Fast dot-product similarity using pre-built cache
        let bestEmp = null;
        let bestScore = -Infinity;
        const cache = cachedEmbeddingsRef.current;

        for (let c = 0; c < cache.length; c++) {
          const { emp, vec, norm } = cache[c];
          let dot = 0;
          for (let i = 0; i < 128; i++) dot += liveVec[i] * vec[i];
          const sim = dot / (liveNorm * norm);
          if (sim > bestScore) { bestScore = sim; bestEmp = emp; }
        }

        const MIN_SIMILARITY = 0.40;

        if (bestEmp && bestScore > MIN_SIMILARITY) {
          const detectedName = `${bestEmp.employee_firstName} ${bestEmp.employee_LastName}`;
          const confidencePercent = Math.round(bestScore * 100);
          const employeeId = bestEmp.employee_ID;

          const now = Date.now();
          if (employeeId === lastFaceIdRef.current && (now - lastScanTimeRef.current < SCAN_COOLDOWN)) return;

          lastFaceIdRef.current = employeeId;
          lastScanTimeRef.current = now;

          setCurrentDetectedName(detectedName);
          setCurrentConfidence(confidencePercent);

          const newUser = {
            name: detectedName,
            id: bestEmp.employee_code,
            department: bestEmp.department_name,
            role: bestEmp.position,
            employeeId: bestEmp.employee_ID,
            photo: null,
            lastAction: null,
            similarity: bestScore
          };

          setRecognizedUser(newUser);
          setRecognitionConfidence(confidencePercent);
          setIsScanning(false);
          handleMarkAttendance(newUser);
        } else {
          setCurrentDetectedName('');
          setCurrentConfidence(0);
        }
      } catch (err) {
        console.error("Recognition error:", err);
      }
    };

    rafId = requestAnimationFrame(runRecognition);
    return () => { if (rafId) cancelAnimationFrame(rafId); };
  }, [cameraActive, modelsLoaded, employees, isScanning]);

const startCamera = async () => {
  if (!selectedEvent) {
    alert("Please select an event first");
    return;
  }

  try {
    const mediaStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'user',
        width: { ideal: 480 },   // Lower from 640
      height: { ideal: 360 },  // Keep 4:3 or 16:9 ratio
      frameRate: { ideal: 15 }
      }
    });

    const video = videoRef.current;
    if (!video) {
      console.error("Video ref is still null");
      alert("Video element not ready. Please try again.");
      return;
    }

    video.srcObject = mediaStream;
    setStream(mediaStream);

    // Play the video
    video.onloadedmetadata = async () => {
      try {
        await video.play();
        console.log("✅ Camera started successfully");
        setCameraActive(true);
      } catch (err) {
        console.error("❌ Video play failed:", err);
        alert("Camera started but video failed to display");
      }
    };

  } catch (error) {
    console.error("Camera access error:", error);
    alert(`Cannot access camera: ${error.message || error.name}`);
  }
};

const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    const video = videoRef.current;
    if (video) video.srcObject = null;

    setCameraActive(false);
    setRecognizedUser(null);
    setShowConfirmButtons(false);
    setRecognitionConfidence(0);
    setCurrentDetectedName('');
    setCurrentConfidence(0);
    setIsScanning(true);        // Reset for next time
  };


  const handleMarkAttendance = async (user = recognizedUser, method = 'face') => {
    if (!user || !selectedEvent) return;

    try {
      setAttendanceStatus('loading');
      setShowConfirmation(true);

      // --- CRITICAL: Refresh event details to get latest scan_mode ---
      const freshEvent = await getEventSetup(selectedEvent);
      const dbScanMode = freshEvent?.scan_mode || 'check_in';
      
      // STRICT REQUIREMENT: Prioritize localStorage for persistence
      const currentMode = localStorage.getItem(`attendanceMode_${selectedEvent}`) || dbScanMode;
      const mode = currentMode === 'check_out' ? 'Check Out' : 'Check In';
      
      setAttendanceType(mode);
      
      const res = await markAttendance({
        employee_id: user.employeeId,
        event_id: selectedEvent,
        attendance_type: mode,
        method: method
      });

      setAttendanceStatus('success');
      setAttendanceMsg(res?.message || `${mode} Successful!`);
      
      // Auto close after 3 seconds and reset scanner
      setTimeout(() => {
        setShowConfirmation(false);
        setAttendanceStatus(null);
        setAttendanceMsg('');
        setRecognizedUser(null);
        setRecognitionConfidence(0);
        setCurrentDetectedName('');
        setCurrentConfidence(0);
        setIsScanning(true);
      }, 3000);

    } catch (error) {
      console.error('Attendance marking failed:', error);
      setAttendanceStatus('error');
      setAttendanceMsg(error.message || 'Failed to mark attendance.');
      
      // Auto close after 4 seconds but let the user see the error
      setTimeout(() => {
        setShowConfirmation(false);
        setAttendanceStatus(null);
        setAttendanceMsg('');
        setRecognizedUser(null);
        setRecognitionConfidence(0);
        setCurrentDetectedName('');
        setCurrentConfidence(0);
        setIsScanning(true);
      }, 4000);
    }
  };


  const handleScanDifferent = () => {
    setRecognizedUser(null);
    setIsDetecting(false);
  };

  const resetToInitialState = () => {
    stopCamera();
    setRecognizedUser(null);
    setAttendanceType('');
  };

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  useEffect(() => {
      return () => {
        if (recognitionTimer) clearTimeout(recognitionTimer);
      };
    }, [recognitionTimer]);

  // Pre-build embedding cache whenever employees list is refreshed
  useEffect(() => {
    if (!employees.length) { cachedEmbeddingsRef.current = []; return; }
    const cache = [];
    for (const emp of employees) {
      if (!emp.embedding) continue;
      let arr = emp.embedding;
      if (typeof arr === 'string') {
        try { arr = JSON.parse(arr); } catch { continue; }
      }
      if (!Array.isArray(arr) || arr.length !== 128) continue;
      const vec = new Float32Array(arr);
      // Pre-compute norm so similarity is just a dot product + one division
      let norm = 0;
      for (let i = 0; i < 128; i++) norm += vec[i] * vec[i];
      norm = Math.sqrt(norm);
      cache.push({ emp, vec, norm });
    }
    cachedEmbeddingsRef.current = cache;
    console.log(`✅ Embedding cache built: ${cache.length} employees`);
  }, [employees]);

  const selectedEventDetails = getSelectedEventDetails();

  return (
    <div className="app-container" style={{
      background: "linear-gradient(160deg, rgba(6,35,22,0.72) 0%, rgba(21,92,54,0.55) 100%), url('https://images.unsplash.com/photo-1568992687947-868a62a9f521?w=1920') center/cover fixed no-repeat",
      backgroundColor: "#0d3a22"
    }}>


   
      <div className="logo-container logo-left">
        {branding.logo ? (
          <img 
            src={branding.logo} 
            alt="Institution Logo" 
            className="logo"
          />
        ) : (
          <img 
            src={`${process.env.PUBLIC_URL}/LOGO.png`} 
            alt="Default Logo" 
            className="logo"
          />
        )}
      </div>

      <div className="logo-container logo-right">
        <img 
          src={`${process.env.PUBLIC_URL}/CCSlogo.png`} 
          alt="CCS Logo" 
          className="logo"
        />
      </div>

      <Container fluid className="main-content px-3" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <Row className="justify-content-center" style={{ flex: 1, minHeight: 0 }}>
          <Col xs={12} lg={11} xl={10} xxl={9} style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {/* Removed Institution Name Branding Header as per request */}

            {/* Date and Time Display */}
            <Card className="datetime-card shadow-lg" onClick={handleClockTap} style={{ cursor: 'default', userSelect: 'none' }}>
              <Card.Body className="text-center">
                <div className="date-display">{formatDate(currentTime)}</div>
                <div className="time-display">{formatTime(currentTime)}</div>
                <div className="flag-ceremony-info">Flag Ceremony: 7:30 AM</div>
              </Card.Body>
            </Card>

            {/* ── THREE-COLUMN SCANNER LAYOUT ── */}
            {/* Left: Camera | Top-Right: Select Event | Bottom-Right: Detected Profile */}
            <div className="scanner-three-col-layout">

              {/* ── LEFT: Camera / Input Side ── */}
              <Card className="camera-card shadow-lg scanner-left-panel scanner-left-tall" style={{ display: 'flex', flexDirection: 'column' }}>
                <Card.Body style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>

                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <h5 className="mb-0 fw-bold" style={{ color: "white" }}>
                      {manualMode ? (
                        <><i className="bi bi-keyboard me-2 text-warning"></i>Manual ID Entry</>
                      ) : qrMode ? (
                        <><i className="bi bi-qr-code-scan me-2 text-info"></i>QR Code Scan</>
                      ) : (
                        <><i className="bi bi-camera-video me-2 text-primary"></i>Face Recognition</>
                      )}
                    </h5>

                    <div className="d-flex flex-column gap-2 align-items-end">
                      <button
                        className={`camera-fallback-toggle ${manualMode ? 'toggle-active' : ''}`}
                        onClick={() => {
                          if (manualMode) {
                            handleExitManualMode();
                          } else {
                            stopCamera();
                            stopQrScanner();
                            setManualMode(true);
                          }
                        }}
                        title={manualMode ? 'Switch back to camera' : 'Camera down? Use ID instead'}
                      >
                        {manualMode
                          ? <><i className="bi bi-camera-video"></i> Use Camera</>
                          : <><i className="bi bi-keyboard"></i> Camera Down?</>}
                      </button>
                      <button
                        className={`camera-fallback-toggle ${qrMode ? 'toggle-active' : ''}`}
                        onClick={() => {
                          if (qrMode) {
                            stopQrScanner();
                          } else {
                            startQrScanner();
                          }
                        }}
                      >
                        {qrMode
                          ? <><i className="bi bi-camera-video"></i> Use Camera</>
                          : <><i className="bi bi-qr-code-scan"></i> Scan QR Code</>}
                      </button>
                    </div>
                  </div>

                  {/* ── SCAN MODE LABEL ── */}
                  {selectedEvent && (
                    <div className="text-center mb-2">
                      {(() => {
                        const savedMode = localStorage.getItem(`attendanceMode_${selectedEvent}`);
                        const effectiveMode = savedMode || selectedEventDetails?.scanMode || 'check_in';
                        const isCheckOut = effectiveMode === 'checkout' || effectiveMode === 'check_out';
                        
                        return (
                          <div className={`scan-mode-indicator ${isCheckOut ? 'mode-checkout' : 'mode-checkin'}`}>
                            <i className={`bi bi-${isCheckOut ? 'box-arrow-right' : 'box-arrow-in-right'} me-2`}></i>
                            {isCheckOut ? 'CHECK OUT MODE ACTIVE' : 'CHECK IN MODE ACTIVE'}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* ── CAMERA VIEW — always rendered, hidden when in other modes ── */}
                  <div style={{ display: (manualMode || qrMode) ? 'none' : 'flex', flexDirection: 'column', flex: 1 }}>
                    <div className="camera-video-container-small" style={{ position: 'relative', flex: 1 }}>
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          backgroundColor: '#000',
                          display: cameraActive ? 'block' : 'none',
                          borderRadius: '12px'
                        }}
                      />

                      {/* Placeholder when camera is off */}
                      {!cameraActive && (
                        <div className="camera-placeholder">
                          <i className="bi bi-camera camera-icon-large"></i>
                          <h4 className="mt-3 fw-bold">Camera Ready</h4>
                          <p className="text-muted">Click "Scan Face" to begin</p>
                        </div>
                      )}

                      {/* Live Detection Overlay Box */}
                      {cameraActive && currentDetectedName && (
                        <div style={{
                          position: 'absolute',
                          bottom: '20px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          background: 'rgba(0, 0, 0, 0.88)',
                          color: '#fff',
                          padding: '12px 20px',
                          borderRadius: '10px',
                          fontSize: '15.5px',
                          fontWeight: '600',
                          textAlign: 'center',
                          zIndex: 200,
                          minWidth: '240px',
                          boxShadow: '0 6px 20px rgba(0,0,0,0.6)',
                          border: '2px solid rgba(255,255,255,0.2)'
                        }}>
                          <div style={{ marginBottom: '4px', opacity: 0.9 }}>👤 Detecting</div>
                          <div style={{ fontSize: '17px', fontWeight: '700' }}>
                            {currentDetectedName}
                          </div>
                          <div style={{ 
                            fontSize: '13.5px', 
                            marginTop: '4px',
                            color: currentConfidence > 75 ? '#4ade80' : '#fbbf24' 
                          }}>
                            Confidence: {currentConfidence}%
                          </div>
                        </div>
                      )}

                      {/* Camera Active Indicator */}
                      {cameraActive && !currentDetectedName && (
                        <div style={{
                          position: 'absolute',
                          top: 10,
                          left: 10,
                          background: 'rgba(0,0,0,0.75)',
                          color: '#0f0',
                          padding: '5px 10px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          zIndex: 100,
                          pointerEvents: 'none'
                        }}>
                          Camera Active ✓
                        </div>
                      )}
                    </div>

                    <div className="d-grid mt-3 gap-2">
                      <Button
                        variant={cameraActive ? 'danger' : 'success'}
                        size="lg"
                        onClick={cameraActive ? stopCamera : startCamera}
                        disabled={!selectedEvent}
                      >
                        <i className={`bi bi-${cameraActive ? 'camera-video-off' : 'camera-video'} me-2`}></i>
                        {cameraActive ? 'Stop Camera' : 'Scan Face'}
                      </Button>

                      {cameraActive && recognizedUser && (
                        <Button
                          variant="outline-secondary"
                          size="lg"
                          onClick={handleScanDifferentFace}
                        >
                          <i className="bi bi-arrow-repeat me-2"></i>
                          Scan Different Face
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* ── QR CODE MODE ── */}
                  {qrMode && !recognizedUser && (
                    <div className="qr-scanner-section text-center">
                      <div id="qr-reader" style={{ width: '100%', maxWidth: '500px', margin: '0 auto', borderRadius: '12px', overflow: 'hidden' }}></div>
                      <p className="text-muted mt-3">Position employee QR code within the frame</p>
                      <Button variant="danger" className="mt-2" onClick={stopQrScanner}>
                        Stop QR Scanner
                      </Button>
                    </div>
                  )}

                  {/* ── MANUAL ID MODE ── */}
                  {manualMode && !recognizedUser && (
                    <div className="manual-id-section">
                      <div className="manual-id-display-wrapper">
                        <div className="manual-id-label">
                          <i className="bi bi-person-badge me-2"></i>Employee ID
                        </div>
                        <div className={`manual-id-display ${manualError ? 'manual-id-error' : ''}`}>
                          {manualId || <span className="manual-id-placeholder">e.g. 230000123</span>}
                        </div>
                        {manualError && (
                          <div className="manual-error-msg">
                            <i className="bi bi-exclamation-circle me-1"></i>{manualError}
                          </div>
                        )}
                      </div>

                      <div className="manual-keypad">
                        {['1','2','3','4','5','6','7','8','9','C','0','⌫'].map((key, i) => (
                          <button
                            key={i}
                            className={`manual-key ${key === 'C' ? 'manual-key-clear' : ''} ${key === '⌫' ? 'manual-key-back' : ''}`}
                            onClick={() => {
                              if (key === '⌫') handleManualBackspace();
                              else if (key === 'C') handleManualClear();
                              else handleManualIdKey(key);
                            }}
                          >
                            {key}
                          </button>
                        ))}
                      </div>

                      <div className="manual-keypad-extra">
                        <button className="manual-key manual-key-dash" onClick={() => handleManualIdKey('-')}>—</button>
                      </div>

                      <Button
                        variant="success"
                        size="lg"
                        className="w-100 mt-3 camera-control-btn"
                        onClick={handleManualSearch}
                        disabled={!selectedEvent || !manualId.trim()}
                      >
                        <i className="bi bi-search me-2"></i>
                        Find Employee
                      </Button>
                      {!selectedEvent && (
                        <small className="text-danger text-center d-block mt-2">
                          <i className="bi bi-exclamation-circle me-1"></i>
                          Please select an event first
                        </small>
                      )}
                    </div>
                  )}

                </Card.Body>
              </Card>

              {/* ── RIGHT COLUMN: Event (top) + Detected Profile (bottom) ── */}
              <div className="scanner-right-column">

                {/* ── TOP-RIGHT: Select Event ── */}
                <Card className="camera-card shadow-lg scanner-right-top-panel">
                  <Card.Body>
                    <h6 className="mb-1 fw-bold" style={{ fontSize: '13px' }}>
                      <i className="bi bi-calendar-event me-2 text-success"></i>
                      Select Event
                    </h6>

                    <Form.Group className="mb-1">
                      <Form.Select 
                        value={selectedEvent}
                        onChange={(e) => setSelectedEvent(e.target.value)}
                        className="event-selector"
                      >
                        <option value="">Choose an event...</option>
                        {availableEvents.map(event => (
                          <option key={event.id} value={event.id}>
                            {event.name} - {event.time}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>

                    {selectedEventDetails && (
                      <Card className="border event-detail-card">
                        <Card.Header 
                          className="event-header d-flex align-items-center cursor-pointer"
                          onClick={() => setEventExpanded(!eventExpanded)}
                        >
                          <Badge 
                            bg={selectedEventDetails.type === 'Flag' ? 'success' : 
                                selectedEventDetails.type === 'Meeting' ? 'primary' : 'info'} 
                            className="me-2"
                          >
                            {selectedEventDetails.type}
                          </Badge>
                          <span className="flex-grow-1 fw-semibold">{selectedEventDetails.name}</span>
                          <span className="text-muted me-2">({selectedEventDetails.time})</span>
                          <i className={`bi bi-chevron-${eventExpanded ? 'up' : 'down'}`}></i>
                        </Card.Header>
                        {eventExpanded && (
                          <Card.Body className="event-details">
                            <h6 className="text-success fw-bold mb-2">{selectedEventDetails.name}</h6>
                            <p className="mb-2">
                              <i className="bi bi-info-circle me-2"></i>
                              {selectedEventDetails.description}
                            </p>
                            <div className="d-flex gap-3 text-muted small">
                              <span>
                                <i className="bi bi-clock me-1"></i>
                                {selectedEventDetails.time}
                              </span>
                              <span>
                                <i className="bi bi-calendar-check me-1"></i>
                                {formatDate(currentTime)}
                              </span>
                            </div>
                          </Card.Body>
                        )}
                      </Card>
                    )}
                  </Card.Body>
                </Card>

                {/* ── BOTTOM-RIGHT: Detected Profile ── */}
                <Card className="camera-card shadow-lg scanner-right-panel scanner-right-bottom-panel" style={{ display: 'flex', flexDirection: 'column' }}>
                <Card.Body className="d-flex flex-column" style={{ overflow: 'hidden', minHeight: 0 }}>
                  <h5 className="mb-2 fw-bold" style={{ color: "white", fontSize: '14px' }}>
                    <i className="bi bi-person-lines-fill me-2 text-success"></i>
                    Detected Profile
                  </h5>

                  {!recognizedUser ? (
                    /* ── Awaiting Detection State ── */
                    <div className="detected-profile-awaiting flex-grow-1 d-flex flex-column align-items-center justify-content-center" style={{ minHeight: 0, overflow: 'hidden' }}>
                      <div className="awaiting-avatar-circle mb-3">
                        <i className="bi bi-person-bounding-box"></i>
                      </div>
                      <h5 className="fw-semibold text-muted mb-2">Awaiting Detection</h5>
                      <p className="text-muted text-center small px-3">
                        Start the camera and position your face in front of the scanner. The detected employee will appear here.
                      </p>
                      <div className="awaiting-dots mt-2">
                        <span></span><span></span><span></span>
                      </div>
                    </div>
                  ) : (
                    /* ── Employee Identified State ── */
                    <div className="detected-profile-found flex-grow-1 d-flex flex-column">
                      <div className="text-center mb-3">
                        <Badge bg="success" className="px-3 py-2 fs-6">
                          <i className="bi bi-check-circle me-1"></i>Employee Identified
                        </Badge>
                      </div>

                      <div className="text-center mb-4">
                        <div className="user-avatar-circle mx-auto mb-2">
                          <i className="bi bi-person-fill"></i>
                        </div>
                        <h4 className="fw-bold mb-0">{recognizedUser.name}</h4>
                      </div>

                      <div className="detected-profile-details mb-3">
                        <div className="profile-detail-row">
                          <div className="profile-detail-icon text-success">
                            <i className="bi bi-person-badge"></i>
                          </div>
                          <div>
                            <div className="profile-detail-label">EMPLOYEE NUMBER</div>
                            <div className="profile-detail-value">{recognizedUser.id}</div>
                          </div>
                        </div>

                        <div className="profile-detail-row">
                          <div className="profile-detail-icon text-success">
                            <i className="bi bi-briefcase"></i>
                          </div>
                          <div>
                            <div className="profile-detail-label">POSITION</div>
                            <div className="profile-detail-value">{recognizedUser.role || '—'}</div>
                          </div>
                        </div>

                        <div className="profile-detail-row">
                          <div className="profile-detail-icon text-success">
                            <i className="bi bi-building"></i>
                          </div>
                          <div>
                            <div className="profile-detail-label">DEPARTMENT</div>
                            <div className="profile-detail-value">{recognizedUser.department || '—'}</div>
                          </div>
                        </div>

                        <div className="profile-detail-row">
                          <div className="profile-detail-icon" style={{ color: recognitionConfidence > 70 ? '#28a745' : '#ffc107' }}>
                            <i className="bi bi-graph-up"></i>
                          </div>
                          <div>
                            <div className="profile-detail-label">MATCH CONFIDENCE</div>
                            <div className="profile-detail-value" style={{ color: recognitionConfidence > 70 ? '#28a745' : '#ffc107' }}>
                              {recognitionConfidence}%
                            </div>
                          </div>
                        </div>
                      </div>

                      {selectedEventDetails && (
                        <div className="detected-event-badge mb-3">
                          <i className="bi bi-calendar-check me-2 text-success"></i>
                          <strong>Event:</strong>&nbsp;{selectedEventDetails.name}
                        </div>
                      )}

                      <div className="mt-auto d-grid">
                        <Button
                          variant="outline-secondary"
                          size="lg"
                          onClick={() => {
                            setRecognizedUser(null);
                            setRecognitionConfidence(0);
                            setCurrentDetectedName('');
                            setCurrentConfidence(0);
                            setIsScanning(true);
                          }}
                        >
                          <i className="bi bi-arrow-repeat me-2"></i>
                          Scan Different Face
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Instructions */}
                  <div className="detected-profile-instructions mt-3 pt-3" style={{ borderTop: '1px solid #e9ecef' }}>
                    <p className="mb-1 fw-bold small">
                      <i className="bi bi-info-circle me-1 text-primary"></i>Instructions
                    </p>
                    <ol className="mb-0 ps-3" style={{ fontSize: '12px', color: '#666' }}>
                      <li>Select an event above</li>
                      <li>Click <strong>"Scan Face"</strong> to activate camera</li>
                      <li>Position your face in front of the camera</li>
                      <li>Profile will appear here automatically</li>
                    </ol>
                  </div>
                </Card.Body>
              </Card>

              </div>{/* end scanner-right-column */}
            </div>{/* end scanner-three-col-layout */}
          </Col>
        </Row>
      </Container>

      {/* Confirmation Modal */}
      <Modal 
        show={showConfirmation} 
        centered
        backdrop="static"
        className={`confirmation-modal ${attendanceStatus === 'error' ? 'error-modal' : ''}`}
      >
        <Modal.Body className="text-center py-5">
          {attendanceStatus === 'loading' && (
            <div className="py-4">
              <div className="spinner-border text-primary mb-3" style={{ width: '3rem', height: '3rem' }} role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <h3 className="fw-bold">Processing...</h3>
            </div>
          )}

          {attendanceStatus === 'success' && (
            <>
              <div className="success-icon mb-3">
                <i className="bi bi-check-circle-fill"></i>
              </div>
              <h3 className="mb-3 fw-bold">{attendanceMsg}</h3>
              <h4 className="text-success mb-2">{recognizedUser?.name}</h4>
              {selectedEventDetails && (
                <p className="text-primary mb-2 fs-5">
                  <i className="bi bi-calendar-event me-2"></i>
                  {selectedEventDetails.name}
                </p>
              )}
              <p className="text-muted fs-5 mb-0">{formatTime(new Date())}</p>
              <div className="mt-4">
                <div className="spinner-border spinner-border-sm text-success" role="status">
                  <span className="visually-hidden">Processing...</span>
                </div>
                <p className="small text-muted mt-2">Returning to camera...</p>
              </div>
            </>
          )}

          {attendanceStatus === 'error' && (
            <>
              <div className="error-icon mb-3 text-danger">
                <i className="bi bi-x-circle-fill" style={{ fontSize: '4rem' }}></i>
              </div>
              <h3 className="mb-3 fw-bold text-danger">Attendance Failed</h3>
              <p className="fs-5 text-muted mb-4">{attendanceMsg}</p>
              <Button 
                variant="outline-danger" 
                onClick={() => {
                  setShowConfirmation(false);
                  setAttendanceStatus(null);
                  setAttendanceMsg('');
                  setIsScanning(true);
                }}
              >
                Close & Try Again
              </Button>
            </>
          )}
        </Modal.Body>
      </Modal>

      <link 
        rel="stylesheet" 
        href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css"
      />

      {/* Admin Login Overlay — shown after 5 taps on the clock */}
      {showAdminLogin && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          animation: 'fadeIn 0.2s ease'
        }}>
          <style>{`@keyframes fadeIn { from { opacity:0 } to { opacity:1 } }`}</style>
          <LoginPage onBackToScanner={() => setShowAdminLogin(false)} />
        </div>
      )}
    </div>
  );
}

export default EmployeePage;