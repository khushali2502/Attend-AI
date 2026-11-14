const BASE_URL = 'http://localhost:8000/api';

let isRedirecting = false;

function handleUnauthorized() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    if (!isRedirecting && !window.location.pathname.includes('/login')) {
      isRedirecting = true;
      window.location.href = '/login?expired=1';
    }
  }
}

async function authFetch(url: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const isFormData = options.body instanceof FormData;

  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> || {}),
  };

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    handleUnauthorized();
    const errJson = await res.json().catch(() => null);
    throw new Error(errJson?.detail || 'Could not validate credentials');
  }

  if (!res.ok) {
    const errJson = await res.json().catch(() => null);
    const detail = typeof errJson?.detail === 'string'
      ? errJson.detail
      : errJson?.detail?.message || `Request failed with status ${res.status}`;
    throw new Error(detail);
  }

  return await res.json();
}

export const api = {
  // ===== Authentication =====
  login: async (identifier: string, password: string) => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: 'Login failed' }));
      throw new Error(error.detail || 'Login failed');
    }
    return await res.json();
  },

  // ===== Face Registry APIs (Teacher & Admin) =====
  getFaceRegistry: async () => {
    return await authFetch(`${BASE_URL}/face-registry`);
  },

  getFaceRegistryStats: async () => {
    return await authFetch(`${BASE_URL}/face-registry/stats`);
  },

  // ===== Student Portal APIs =====
  getStudentProfile: async () => {
    return await authFetch(`${BASE_URL}/students/me/profile`);
  },

  getStudentAttendance: async () => {
    return await authFetch(`${BASE_URL}/students/me/attendance`);
  },

  getStudentStats: async () => {
    return await authFetch(`${BASE_URL}/students/me/attendance/stats`);
  },

  getStudentTimetable: async () => {
    return await authFetch(`${BASE_URL}/students/me/timetable`);
  },

  // ===== Teacher Portal APIs =====
  getTeacherProfile: async () => {
    return await authFetch(`${BASE_URL}/teachers/me/profile`);
  },

  getTeacherStudents: async (departmentId?: number) => {
    const query = departmentId ? `?department_id=${departmentId}` : '';
    return await authFetch(`${BASE_URL}/teachers/students${query}`);
  },

  correctAttendance: async (recordId: number, status: string) => {
    return await authFetch(`${BASE_URL}/teachers/attendance/${recordId}`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
  },

  registerStudentFace: async (studentId: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return await authFetch(`${BASE_URL}/teachers/students/${studentId}/register-face`, {
      method: 'POST',
      body: formData
    });
  },

  // ===== Admin Portal APIs =====
  getAdminStats: async () => {
    return await authFetch(`${BASE_URL}/admins/stats`);
  },

  getTeachers: async () => {
    return await authFetch(`${BASE_URL}/admins/teachers`);
  },

  getDepartments: async () => {
    return await authFetch(`${BASE_URL}/admins/departments`);
  },

  createDepartment: async (name: string, code: string) => {
    return await authFetch(`${BASE_URL}/admins/departments`, {
      method: 'POST',
      body: JSON.stringify({ name, code })
    });
  },

  getSubjects: async () => {
    return await authFetch(`${BASE_URL}/admins/subjects`);
  },

  createSubject: async (name: string, code: string, department_id: number) => {
    return await authFetch(`${BASE_URL}/admins/subjects`, {
      method: 'POST',
      body: JSON.stringify({ name, code, department_id })
    });
  },

  getAuditLogs: async () => {
    return await authFetch(`${BASE_URL}/admins/audit-logs`);
  },

  // ===== Admin Student Management APIs =====
  getAdminStudents: async () => {
    return await authFetch(`${BASE_URL}/admins/students`);
  },

  createStudent: async (data: {
    full_name: string;
    roll_number: string;
    email: string;
    phone?: string;
    department_id?: number;
    division?: string;
    year?: number;
    password: string;
    confirm_password: string;
  }) => {
    return await authFetch(`${BASE_URL}/admins/students`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  getStudentDetail: async (studentId: number) => {
    return await authFetch(`${BASE_URL}/admins/students/${studentId}`);
  },

  updateStudent: async (studentId: number, data: any) => {
    return await authFetch(`${BASE_URL}/admins/students/${studentId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  deleteStudent: async (studentId: number) => {
    return await authFetch(`${BASE_URL}/admins/students/${studentId}`, {
      method: 'DELETE'
    });
  },

  // ===== Face Registration APIs =====
  registerFaceMulti: async (studentId: number, files: File[]) => {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    return await authFetch(`${BASE_URL}/students/${studentId}/face-registration`, {
      method: 'POST',
      body: formData
    });
  },

  getFaceStatus: async (studentId: number) => {
    return await authFetch(`${BASE_URL}/students/${studentId}/face`);
  },

  updateFace: async (studentId: number, files: File[]) => {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    return await authFetch(`${BASE_URL}/students/${studentId}/face`, {
      method: 'PUT',
      body: formData
    });
  },

  removeFace: async (studentId: number) => {
    return await authFetch(`${BASE_URL}/students/${studentId}/face`, {
      method: 'DELETE'
    });
  },

  // ===== Camera APIs =====
  getCameras: async () => {
    return await authFetch(`${BASE_URL}/cameras`);
  },

  createCamera: async (name: string, location: string, rtsp_url: string, status: string = 'Active') => {
    return await authFetch(`${BASE_URL}/cameras`, {
      method: 'POST',
      body: JSON.stringify({ name, location, rtsp_url, status })
    });
  },

  updateCamera: async (id: number, status: string) => {
    return await authFetch(`${BASE_URL}/cameras/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
  },

  // ===== Notifications =====
  getNotifications: async () => {
    return await authFetch(`${BASE_URL}/notifications`);
  },

  markNotificationRead: async (id: number) => {
    return await authFetch(`${BASE_URL}/notifications/${id}/read`, {
      method: 'PUT'
    });
  },

  // ===== Surveillance & Webcam APIs =====
  getCameraSources: async () => {
    return await authFetch(`${BASE_URL}/surveillance/camera-sources`);
  },

  getHardwareStatus: async () => {
    return await authFetch(`${BASE_URL}/surveillance/hardware-status`);
  },

  processWebcamFrame: async (imageBase64: string, cameraId?: number, sessionId?: number) => {
    return await authFetch(`${BASE_URL}/surveillance/process-frame`, {
      method: 'POST',
      body: JSON.stringify({ image: imageBase64, camera_id: cameraId, lecture_session_id: sessionId })
    });
  },

  startRTSPStream: async (cameraId: number, sessionId: number) => {
    return await authFetch(`${BASE_URL}/surveillance/sessions/start-rtsp`, {
      method: 'POST',
      body: JSON.stringify({ camera_id: cameraId, lecture_session_id: sessionId })
    });
  },

  stopRTSPStream: async (sessionId: number) => {
    return await authFetch(`${BASE_URL}/surveillance/sessions/${sessionId}/stop-rtsp`, {
      method: 'POST'
    });
  },

  // ===== Timetables & Lecture Sessions =====
  getTimetables: async (params?: { department_id?: number; division?: string; day_of_week?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.department_id) searchParams.append('department_id', String(params.department_id));
    if (params?.division) searchParams.append('division', params.division);
    if (params?.day_of_week !== undefined) searchParams.append('day_of_week', String(params.day_of_week));
    return await authFetch(`${BASE_URL}/timetables?${searchParams.toString()}`);
  },

  createTimetableEntry: async (data: any) => {
    return await authFetch(`${BASE_URL}/timetables`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  deleteTimetableEntry: async (id: number) => {
    return await authFetch(`${BASE_URL}/timetables/${id}`, {
      method: 'DELETE'
    });
  },

  getClassrooms: async () => {
    return await authFetch(`${BASE_URL}/timetables/classrooms`);
  },

  getTodaySessions: async () => {
    return await authFetch(`${BASE_URL}/timetables/sessions/today`);
  },

  updateSessionStatus: async (sessionId: number, status: string) => {
    return await authFetch(`${BASE_URL}/timetables/sessions/${sessionId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
  },

  // ===== Lecture Session Attendance Roster & Disputes =====
  getSessionAttendance: async (sessionId: number) => {
    return await authFetch(`${BASE_URL}/attendance/session/${sessionId}`);
  },

  manualMarkAttendance: async (sessionId: number, data: { student_id: number; status: string; correction_reason?: string }) => {
    return await authFetch(`${BASE_URL}/attendance/session/${sessionId}/mark`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  getUncertainQueue: async (sessionId?: number) => {
    const query = sessionId ? `?session_id=${sessionId}` : '';
    return await authFetch(`${BASE_URL}/attendance/uncertain/queue${query}`);
  },

  reviewUncertainDetection: async (detectionId: number, status: 'Approved' | 'Rejected', studentId?: number) => {
    return await authFetch(`${BASE_URL}/attendance/uncertain/${detectionId}/review`, {
      method: 'POST',
      body: JSON.stringify({ status, student_id: studentId })
    });
  },

  getDisputes: async () => {
    return await authFetch(`${BASE_URL}/attendance/disputes`);
  },

  reviewDispute: async (disputeId: number, status: 'Approved' | 'Rejected', notes?: string) => {
    return await authFetch(`${BASE_URL}/attendance/disputes/${disputeId}/review`, {
      method: 'POST',
      body: JSON.stringify({ status, reviewer_notes: notes })
    });
  }
};
