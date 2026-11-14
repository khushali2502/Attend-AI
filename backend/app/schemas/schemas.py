from pydantic import BaseModel, Field
from typing import Optional, List, Any, Dict
from datetime import datetime, date

# --- Token & Authentication Schemas ---
class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    role: str
    user_name: str

class TokenPayload(BaseModel):
    sub: Optional[str] = None
    role: Optional[str] = None
    type: Optional[str] = None

class UserLogin(BaseModel):
    email: Optional[str] = None
    password: str
    identifier: Optional[str] = None

class UserCreate(BaseModel):
    email: str
    password: str
    name: str
    role: str = "student"
    roll_number: Optional[str] = None
    employee_id: Optional[str] = None
    department_id: Optional[int] = None

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    email: str
    role: str
    name: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# --- Department Schemas ---
class DepartmentCreate(BaseModel):
    name: str
    code: str

class DepartmentResponse(BaseModel):
    id: int
    name: str
    code: str

    class Config:
        from_attributes = True


# --- Classroom Schemas ---
class ClassroomCreate(BaseModel):
    name: str
    building: Optional[str] = "Main Building"
    capacity: Optional[int] = 60
    is_active: Optional[bool] = True

class ClassroomUpdate(BaseModel):
    name: Optional[str] = None
    building: Optional[str] = None
    capacity: Optional[int] = None
    is_active: Optional[bool] = None

class ClassroomResponse(BaseModel):
    id: int
    name: str
    building: str
    capacity: int
    is_active: bool

    class Config:
        from_attributes = True


# --- Student Schemas ---
class StudentResponse(BaseModel):
    id: int
    user_id: int
    roll_number: str
    department_id: Optional[int] = None
    division: Optional[str] = None
    year: Optional[int] = None
    phone: Optional[str] = None
    face_registered: bool
    profile_image_url: Optional[str] = None
    user: UserResponse
    department: Optional[DepartmentResponse] = None

    class Config:
        from_attributes = True

class AdminStudentCreate(BaseModel):
    full_name: str
    roll_number: str
    email: str
    phone: Optional[str] = None
    department_id: Optional[int] = None
    division: Optional[str] = None
    year: Optional[int] = None
    password: str
    confirm_password: str

class AdminStudentUpdate(BaseModel):
    full_name: Optional[str] = None
    roll_number: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    department_id: Optional[int] = None
    division: Optional[str] = None
    year: Optional[int] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None


# --- Face Registration & Enrollment Schemas ---
class FaceImageResponse(BaseModel):
    id: int
    file_path: str
    pose_label: Optional[str] = "frontal"
    created_at: datetime

    class Config:
        from_attributes = True

class FaceRegistrationStatusResponse(BaseModel):
    student_id: int
    face_registered: bool
    profile_image_url: Optional[str] = None
    image_count: int = 0
    images: List[FaceImageResponse] = []
    registered_at: Optional[datetime] = None


# --- Teacher Schemas ---
class TeacherResponse(BaseModel):
    id: int
    user_id: int
    employee_id: str
    department_id: Optional[int] = None
    user: UserResponse
    department: Optional[DepartmentResponse] = None

    class Config:
        from_attributes = True


# --- Subject Schemas ---
class SubjectCreate(BaseModel):
    name: str
    code: str
    department_id: int

class SubjectResponse(BaseModel):
    id: int
    name: str
    code: str
    department_id: int
    department: Optional[DepartmentResponse] = None

    class Config:
        from_attributes = True


# --- Timetable Schemas ---
class TimetableCreate(BaseModel):
    department_id: int
    subject_id: int
    teacher_id: int
    classroom_id: int
    academic_year: Optional[int] = 2026
    year_of_study: Optional[int] = 3
    division: Optional[str] = "A"
    day_of_week: int  # 0 to 6 (Monday to Sunday)
    start_time: str   # "HH:MM"
    end_time: str     # "HH:MM"
    is_active: Optional[bool] = True

class TimetableTeacherUserResponse(BaseModel):
    name: str

class TimetableTeacherResponse(BaseModel):
    id: int
    employee_id: str
    user: TimetableTeacherUserResponse

    class Config:
        from_attributes = True

class TimetableResponse(BaseModel):
    id: int
    department_id: int
    subject_id: int
    teacher_id: int
    classroom_id: int
    academic_year: int
    year_of_study: int
    division: str
    day_of_week: int
    start_time: str
    end_time: str
    is_active: bool
    subject: SubjectResponse
    teacher: TimetableTeacherResponse
    classroom: Optional[ClassroomResponse] = None
    department: Optional[DepartmentResponse] = None

    class Config:
        from_attributes = True


# --- Camera Schemas ---
class CameraCreate(BaseModel):
    name: str
    location: str
    classroom_id: Optional[int] = None
    rtsp_url: Optional[str] = None
    status: Optional[str] = "Online"

class CameraUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    classroom_id: Optional[int] = None
    rtsp_url: Optional[str] = None
    status: Optional[str] = None

class CameraResponse(BaseModel):
    id: int
    name: str
    location: str
    classroom_id: Optional[int] = None
    rtsp_url: Optional[str] = None
    status: str
    fps: float = 0.0
    inference_latency_ms: int = 0
    frame_drop_count: int = 0
    last_active: Optional[datetime] = None
    last_ping: Optional[datetime] = None
    classroom: Optional[ClassroomResponse] = None

    class Config:
        from_attributes = True


# --- Lecture Session Schemas ---
class LectureSessionCreate(BaseModel):
    timetable_id: Optional[int] = None
    subject_id: int
    teacher_id: int
    classroom_id: int
    camera_id: Optional[int] = None
    date: Optional[date] = None
    scheduled_start: str
    scheduled_end: str
    interval_duration_sec: Optional[int] = 300
    min_presence_ratio: Optional[float] = 0.50
    grace_period_mins: Optional[int] = 15

class LectureSessionUpdate(BaseModel):
    status: Optional[str] = None  # 'Active', 'Paused', 'Completed', 'Cancelled'
    camera_id: Optional[int] = None

class LectureSessionResponse(BaseModel):
    id: int
    timetable_id: Optional[int] = None
    subject_id: int
    teacher_id: int
    classroom_id: int
    camera_id: Optional[int] = None
    date: date
    scheduled_start: str
    scheduled_end: str
    actual_start: Optional[datetime] = None
    actual_end: Optional[datetime] = None
    status: str
    interval_duration_sec: int
    total_eligible_intervals: int
    min_presence_ratio: float
    grace_period_mins: int
    subject: SubjectResponse
    teacher: TimetableTeacherResponse
    classroom: ClassroomResponse
    camera: Optional[CameraResponse] = None

    class Config:
        from_attributes = True


# --- Recognition Event Schemas ---
class RecognitionEventResponse(BaseModel):
    id: int
    lecture_session_id: int
    student_id: Optional[int] = None
    camera_id: Optional[int] = None
    timestamp: datetime
    interval_index: int
    confidence_score: float
    liveness_score: float
    is_liveness_verified: bool
    is_uncertain: bool
    bbox: Optional[List[int]] = None

    class Config:
        from_attributes = True


# --- Uncertain Detection Schemas ---
class UncertainDetectionResponse(BaseModel):
    id: int
    lecture_session_id: int
    predicted_student_id: Optional[int] = None
    confidence_score: float
    crop_image_path: str
    timestamp: datetime
    status: str
    student: Optional[StudentResponse] = None

    class Config:
        from_attributes = True

class UncertainDetectionReview(BaseModel):
    status: str  # 'Approved' or 'Rejected'
    student_id: Optional[int] = None  # in case teacher assigns correct student


# --- Attendance Schemas ---
class AttendanceCreate(BaseModel):
    lecture_session_id: int
    student_id: int
    status: str = "Present"
    confidence_score: Optional[float] = 1.0
    verification_method: Optional[str] = "Manual_Teacher"
    correction_reason: Optional[str] = None

class AttendanceUpdate(BaseModel):
    status: str  # 'Present', 'Late', 'Absent'
    correction_reason: str

class AttendanceResponse(BaseModel):
    id: int
    lecture_session_id: int
    student_id: int
    status: str
    intervals_observed: int
    total_eligible_intervals: int
    presence_ratio: float
    first_seen_at: Optional[datetime] = None
    last_seen_at: Optional[datetime] = None
    confidence_score: float
    verification_method: str
    corrected_by: Optional[int] = None
    correction_reason: Optional[str] = None
    corrected_at: Optional[datetime] = None
    created_at: datetime
    student: StudentResponse

    class Config:
        from_attributes = True


# --- Attendance Dispute Schemas ---
class AttendanceDisputeCreate(BaseModel):
    attendance_id: int
    reason: str
    proof_document_url: Optional[str] = None

class AttendanceDisputeReview(BaseModel):
    status: str  # 'Approved', 'Rejected'
    reviewer_notes: Optional[str] = None

class AttendanceDisputeResponse(BaseModel):
    id: int
    attendance_id: int
    student_id: int
    reason: str
    proof_document_url: Optional[str] = None
    status: str
    reviewed_by: Optional[int] = None
    reviewer_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    student: StudentResponse

    class Config:
        from_attributes = True


# --- Notification Schemas ---
class NotificationResponse(BaseModel):
    id: int
    user_id: int
    title: str
    message: str
    is_read: bool
    type: str
    created_at: datetime

    class Config:
        from_attributes = True


# --- AuditLog Schemas ---
class AuditLogResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    action: str
    ip_address: Optional[str] = None
    timestamp: datetime
    details: str

    class Config:
        from_attributes = True


# --- System Hardware & Settings Schemas ---
class HardwareStatusResponse(BaseModel):
    selected_provider: str
    device_type: str  # 'NPU', 'GPU', 'CPU'
    available_providers: List[str]
    npu_detected: bool
    gpu_detected: bool
    details: Dict[str, Any] = {}

class SystemSettingResponse(BaseModel):
    key: str
    value: str
    description: Optional[str] = None
    updated_at: datetime

    class Config:
        from_attributes = True

class SystemSettingUpdate(BaseModel):
    value: str


# --- Admin Stats & Analytics Schemas ---
class AdminStats(BaseModel):
    students: int
    teachers: int
    cameras: int
    departments: int
    subjects: int
    classrooms: int
    face_registered: int
    active_cameras: int
    active_sessions: int
