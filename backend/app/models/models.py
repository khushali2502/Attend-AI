from sqlalchemy import Column, Integer, String, Boolean, Float, ForeignKey, DateTime, Date, Text, JSON, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=False)  # 'student', 'teacher', 'admin'
    name = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    refresh_token = Column(String, nullable=True)

    student_profile = relationship("Student", back_populates="user", uselist=False, cascade="all, delete-orphan")
    teacher_profile = relationship("Teacher", back_populates="user", uselist=False, cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    corrected_attendances = relationship("Attendance", back_populates="corrector", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user", cascade="all, delete-orphan")
    reviewed_detections = relationship("UncertainDetection", back_populates="reviewer")
    reviewed_disputes = relationship("AttendanceDispute", back_populates="reviewer")


class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    code = Column(String, unique=True, index=True, nullable=False)  # e.g., 'CSE'

    students = relationship("Student", back_populates="department")
    teachers = relationship("Teacher", back_populates="department")
    subjects = relationship("Subject", back_populates="department", cascade="all, delete-orphan")
    timetables = relationship("Timetable", back_populates="department", cascade="all, delete-orphan")


class Classroom(Base):
    __tablename__ = "classrooms"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)  # e.g., 'Room 302', 'CSE Lab 1'
    building = Column(String, nullable=False, default="Main Building")
    capacity = Column(Integer, default=60)
    is_active = Column(Boolean, default=True)

    cameras = relationship("Camera", back_populates="classroom", cascade="all, delete-orphan")
    timetables = relationship("Timetable", back_populates="classroom", cascade="all, delete-orphan")
    lecture_sessions = relationship("LectureSession", back_populates="classroom", cascade="all, delete-orphan")


class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    roll_number = Column(String, unique=True, index=True, nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)
    division = Column(String, nullable=True)  # 'A', 'B'
    year = Column(Integer, nullable=True)      # 1, 2, 3, 4
    phone = Column(String, nullable=True)
    face_registered = Column(Boolean, default=False)
    profile_image_url = Column(String, nullable=True)
    face_embedding = Column(JSON, nullable=True)

    user = relationship("User", back_populates="student_profile")
    department = relationship("Department", back_populates="students")
    attendances = relationship("Attendance", back_populates="student", cascade="all, delete-orphan")
    face_images = relationship("FaceImage", back_populates="student", cascade="all, delete-orphan")
    face_embeddings_list = relationship("FaceEmbedding", back_populates="student", cascade="all, delete-orphan")
    recognition_events = relationship("RecognitionEvent", back_populates="student", cascade="all, delete-orphan")
    uncertain_detections = relationship("UncertainDetection", back_populates="student", cascade="all, delete-orphan")
    attendance_disputes = relationship("AttendanceDispute", back_populates="student", cascade="all, delete-orphan")


class Teacher(Base):
    __tablename__ = "teachers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    employee_id = Column(String, unique=True, index=True, nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)

    user = relationship("User", back_populates="teacher_profile")
    department = relationship("Department", back_populates="teachers")
    timetables = relationship("Timetable", back_populates="teacher", cascade="all, delete-orphan")
    lecture_sessions = relationship("LectureSession", back_populates="teacher", cascade="all, delete-orphan")


class Subject(Base):
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    code = Column(String, unique=True, index=True, nullable=False)  # e.g., 'CS401'
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="CASCADE"), nullable=False)

    department = relationship("Department", back_populates="subjects")
    timetables = relationship("Timetable", back_populates="subject", cascade="all, delete-orphan")
    lecture_sessions = relationship("LectureSession", back_populates="subject", cascade="all, delete-orphan")


class Timetable(Base):
    __tablename__ = "timetables"

    id = Column(Integer, primary_key=True, index=True)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="CASCADE"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False)
    teacher_id = Column(Integer, ForeignKey("teachers.id", ondelete="CASCADE"), nullable=False)
    classroom_id = Column(Integer, ForeignKey("classrooms.id", ondelete="CASCADE"), nullable=False)
    academic_year = Column(Integer, default=2026)
    year_of_study = Column(Integer, default=3)  # 1 to 4
    division = Column(String, default="A")      # 'A', 'B'
    day_of_week = Column(Integer, nullable=False)  # 0 to 6 (Monday to Sunday)
    start_time = Column(String, nullable=False)    # "HH:MM" e.g., "09:00"
    end_time = Column(String, nullable=False)      # "HH:MM" e.g., "10:30"
    is_active = Column(Boolean, default=True)

    department = relationship("Department", back_populates="timetables")
    subject = relationship("Subject", back_populates="timetables")
    teacher = relationship("Teacher", back_populates="timetables")
    classroom = relationship("Classroom", back_populates="timetables")
    lecture_sessions = relationship("LectureSession", back_populates="timetable", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint('classroom_id', 'day_of_week', 'start_time', name='uq_classroom_schedule'),
    )


class Camera(Base):
    __tablename__ = "cameras"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    classroom_id = Column(Integer, ForeignKey("classrooms.id", ondelete="SET NULL"), nullable=True)
    location = Column(String, nullable=False)
    rtsp_url = Column(String, nullable=True)  # Null for laptop webcam mode
    status = Column(String, default="Online")  # 'Online', 'Reconnecting', 'Degraded', 'Offline'
    fps = Column(Float, default=0.0)
    inference_latency_ms = Column(Integer, default=0)
    frame_drop_count = Column(Integer, default=0)
    last_active = Column(DateTime(timezone=True), nullable=True)
    last_ping = Column(DateTime(timezone=True), nullable=True)

    classroom = relationship("Classroom", back_populates="cameras")
    lecture_sessions = relationship("LectureSession", back_populates="camera")
    recognition_events = relationship("RecognitionEvent", back_populates="camera")


class LectureSession(Base):
    __tablename__ = "lecture_sessions"

    id = Column(Integer, primary_key=True, index=True)
    timetable_id = Column(Integer, ForeignKey("timetables.id", ondelete="SET NULL"), nullable=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False)
    teacher_id = Column(Integer, ForeignKey("teachers.id", ondelete="CASCADE"), nullable=False)
    classroom_id = Column(Integer, ForeignKey("classrooms.id", ondelete="CASCADE"), nullable=False)
    camera_id = Column(Integer, ForeignKey("cameras.id", ondelete="SET NULL"), nullable=True)
    date = Column(Date, nullable=False, server_default=func.current_date())
    scheduled_start = Column(String, nullable=False)  # "HH:MM"
    scheduled_end = Column(String, nullable=False)    # "HH:MM"
    actual_start = Column(DateTime(timezone=True), nullable=True)
    actual_end = Column(DateTime(timezone=True), nullable=True)
    status = Column(String, default="Scheduled")      # 'Scheduled', 'Active', 'Paused', 'Completed', 'Cancelled'
    interval_duration_sec = Column(Integer, default=300) # 5 minutes per check interval
    total_eligible_intervals = Column(Integer, default=10) # default across 50 min lecture
    min_presence_ratio = Column(Float, default=0.50)  # 50% presence required to be Present
    grace_period_mins = Column(Integer, default=15)   # 15 mins before marked Late

    timetable = relationship("Timetable", back_populates="lecture_sessions")
    subject = relationship("Subject", back_populates="lecture_sessions")
    teacher = relationship("Teacher", back_populates="lecture_sessions")
    classroom = relationship("Classroom", back_populates="lecture_sessions")
    camera = relationship("Camera", back_populates="lecture_sessions")
    attendances = relationship("Attendance", back_populates="lecture_session", cascade="all, delete-orphan")
    recognition_events = relationship("RecognitionEvent", back_populates="lecture_session", cascade="all, delete-orphan")
    uncertain_detections = relationship("UncertainDetection", back_populates="lecture_session", cascade="all, delete-orphan")


class RecognitionEvent(Base):
    __tablename__ = "recognition_events"

    id = Column(Integer, primary_key=True, index=True)
    lecture_session_id = Column(Integer, ForeignKey("lecture_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="SET NULL"), nullable=True, index=True)
    camera_id = Column(Integer, ForeignKey("cameras.id", ondelete="SET NULL"), nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    interval_index = Column(Integer, default=0)
    confidence_score = Column(Float, default=0.0)
    liveness_score = Column(Float, default=1.0)
    is_liveness_verified = Column(Boolean, default=True)
    is_uncertain = Column(Boolean, default=False)
    bbox = Column(JSON, nullable=True)  # [x, y, w, h]
    frame_snapshot_path = Column(String, nullable=True)

    lecture_session = relationship("LectureSession", back_populates="recognition_events")
    student = relationship("Student", back_populates="recognition_events")
    camera = relationship("Camera", back_populates="recognition_events")


class Attendance(Base):
    __tablename__ = "attendances"

    id = Column(Integer, primary_key=True, index=True)
    lecture_session_id = Column(Integer, ForeignKey("lecture_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String, nullable=False, default="Absent")  # 'Present', 'Late', 'Absent'
    intervals_observed = Column(Integer, default=0)
    total_eligible_intervals = Column(Integer, default=10)
    presence_ratio = Column(Float, default=0.0)
    first_seen_at = Column(DateTime(timezone=True), nullable=True)
    last_seen_at = Column(DateTime(timezone=True), nullable=True)
    confidence_score = Column(Float, default=1.0)
    verification_method = Column(String, default="AI_Auto")  # 'AI_Auto', 'AI_Verified', 'Manual_Teacher', 'Manual_Admin'
    corrected_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    correction_reason = Column(Text, nullable=True)
    corrected_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    lecture_session = relationship("LectureSession", back_populates="attendances")
    student = relationship("Student", back_populates="attendances")
    corrector = relationship("User", back_populates="corrected_attendances")
    disputes = relationship("AttendanceDispute", back_populates="attendance", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint('lecture_session_id', 'student_id', name='uq_lecture_student_attendance'),
    )


class UncertainDetection(Base):
    __tablename__ = "uncertain_detections"

    id = Column(Integer, primary_key=True, index=True)
    lecture_session_id = Column(Integer, ForeignKey("lecture_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    predicted_student_id = Column(Integer, ForeignKey("students.id", ondelete="SET NULL"), nullable=True, index=True)
    confidence_score = Column(Float, nullable=False)
    crop_image_path = Column(String, nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(String, default="Pending")  # 'Pending', 'Approved', 'Rejected'
    reviewed_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)

    lecture_session = relationship("LectureSession", back_populates="uncertain_detections")
    student = relationship("Student", back_populates="uncertain_detections")
    reviewer = relationship("User", back_populates="reviewed_detections")


class AttendanceDispute(Base):
    __tablename__ = "attendance_disputes"

    id = Column(Integer, primary_key=True, index=True)
    attendance_id = Column(Integer, ForeignKey("attendances.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    reason = Column(Text, nullable=False)
    proof_document_url = Column(String, nullable=True)
    status = Column(String, default="Pending")  # 'Pending', 'Approved', 'Rejected'
    reviewed_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewer_notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    attendance = relationship("Attendance", back_populates="disputes")
    student = relationship("Student", back_populates="attendance_disputes")
    reviewer = relationship("User", back_populates="reviewed_disputes")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    type = Column(String, default="system")  # 'system', 'attendance', 'dispute', 'timetable'
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="notifications")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action = Column(String, nullable=False)
    ip_address = Column(String, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    details = Column(String, nullable=False)

    user = relationship("User", back_populates="audit_logs")


class FaceImage(Base):
    __tablename__ = "face_images"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    file_path = Column(String, nullable=False)
    pose_label = Column(String, default="frontal")  # 'frontal', 'left_15', 'right_15', 'tilt_up', 'lighting'
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    student = relationship("Student", back_populates="face_images")


class FaceEmbedding(Base):
    __tablename__ = "face_embeddings"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    embedding = Column(JSON, nullable=False)
    image_path = Column(String, nullable=True)
    model_name = Column(String, default="insightface_scrfd_arcface")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    student = relationship("Student", back_populates="face_embeddings_list")


class SystemSetting(Base):
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, index=True, nullable=False)
    value = Column(String, nullable=False)
    description = Column(String, nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
