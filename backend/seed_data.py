"""
AttendAI - Complete Database Seeder
Populates departments, classrooms, subjects, timetables, teachers, 20+ students,
cameras, and realistic historical attendance records for defense demonstrations.
"""
import random
from datetime import datetime, date, timedelta
from app.db.session import SessionLocal, engine, Base
from app.models.models import (
    User, Student, Teacher, Department, Subject, Timetable, Classroom,
    Camera, Attendance, Notification, LectureSession, SystemSetting, AuditLog
)
from app.core.security import get_password_hash

def seed_all():
    print("Creating all database tables...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        print("Cleaning old demonstration data...")
        db.query(Attendance).delete()
        db.query(LectureSession).delete()
        db.query(Timetable).delete()
        db.query(Camera).delete()
        db.query(Classroom).delete()
        db.query(Subject).delete()
        db.query(Teacher).delete()
        db.query(Student).delete()
        db.query(User).delete()
        db.query(Department).delete()
        db.query(SystemSetting).delete()
        db.commit()

        print("1. Seeding System Settings...")
        settings = [
            SystemSetting(key="threshold_confident", value="0.55", description="Confident match threshold for auto-presence"),
            SystemSetting(key="threshold_review", value="0.40", description="Threshold for teacher review queue"),
            SystemSetting(key="threshold_liveness", value="0.60", description="Minimum liveness score to prevent spoofing"),
            SystemSetting(key="min_presence_ratio", value="0.50", description="Minimum presence ratio to be marked Present"),
            SystemSetting(key="interval_duration_sec", value="300", description="Interval duration in seconds")
        ]
        db.add_all(settings)
        db.commit()

        print("2. Seeding Departments...")
        cse = Department(name="Computer Science & Engineering", code="CSE")
        it = Department(name="Information Technology", code="IT")
        aids = Department(name="Artificial Intelligence & Data Science", code="AIDS")
        db.add_all([cse, it, aids])
        db.commit()
        db.refresh(cse)
        db.refresh(it)
        db.refresh(aids)

        print("3. Seeding Classrooms...")
        cr301 = Classroom(name="Room 301", building="CS Block A", capacity=60)
        cr302 = Classroom(name="Room 302", building="CS Block A", capacity=60)
        lab1 = Classroom(name="AI & Vision Lab", building="Tech Annex", capacity=40)
        db.add_all([cr301, cr302, lab1])
        db.commit()
        db.refresh(cr301)
        db.refresh(cr302)
        db.refresh(lab1)

        print("4. Seeding Cameras...")
        cam_webcam = Camera(name="Laptop Webcam (Demo)", location="Local Testing Feed", classroom_id=cr302.id, rtsp_url=None, status="Online")
        cam_cctv1 = Camera(name="Room 302 High-Angle CCTV", location="Room 302 Front Wall", classroom_id=cr302.id, rtsp_url="rtsp://192.168.1.120:554/live/ch0", status="Online")
        cam_cctv2 = Camera(name="Vision Lab Corner Camera", location="AI Lab Ceiling", classroom_id=lab1.id, rtsp_url="rtsp://192.168.1.121:554/live/ch0", status="Online")
        db.add_all([cam_webcam, cam_cctv1, cam_cctv2])
        db.commit()
        db.refresh(cam_webcam)
        db.refresh(cam_cctv1)

        print("5. Seeding Admin & Teachers...")
        admin = User(name="Academic Dean", email="admin@attendai.com", hashed_password=get_password_hash("admin123"), role="admin")
        teacher1_u = User(name="Dr. Ramesh Kumar", email="ramesh@attendai.com", hashed_password=get_password_hash("teacher123"), role="teacher")
        teacher2_u = User(name="Prof. Anita Desai", email="anita@attendai.com", hashed_password=get_password_hash("teacher123"), role="teacher")
        db.add_all([admin, teacher1_u, teacher2_u])
        db.commit()
        db.refresh(teacher1_u)
        db.refresh(teacher2_u)

        t1 = Teacher(user_id=teacher1_u.id, employee_id="EMP101", department_id=cse.id)
        t2 = Teacher(user_id=teacher2_u.id, employee_id="EMP102", department_id=cse.id)
        db.add_all([t1, t2])
        db.commit()
        db.refresh(t1)
        db.refresh(t2)

        print("6. Seeding Subjects...")
        s_ai = Subject(name="Artificial Intelligence", code="CS401", department_id=cse.id)
        s_cv = Subject(name="Computer Vision & Robotics", code="CS402", department_id=cse.id)
        s_db = Subject(name="Database Systems", code="CS301", department_id=cse.id)
        s_os = Subject(name="Operating Systems", code="CS302", department_id=cse.id)
        db.add_all([s_ai, s_cv, s_db, s_os])
        db.commit()
        db.refresh(s_ai)
        db.refresh(s_cv)
        db.refresh(s_db)
        db.refresh(s_os)

        print("7. Seeding Weekly Timetable...")
        timetables = [
            # Monday
            Timetable(department_id=cse.id, subject_id=s_ai.id, teacher_id=t1.id, classroom_id=cr302.id, division="A", day_of_week=0, start_time="09:00", end_time="10:30"),
            Timetable(department_id=cse.id, subject_id=s_cv.id, teacher_id=t2.id, classroom_id=lab1.id, division="A", day_of_week=0, start_time="11:00", end_time="12:30"),
            # Tuesday
            Timetable(department_id=cse.id, subject_id=s_db.id, teacher_id=t1.id, classroom_id=cr301.id, division="A", day_of_week=1, start_time="10:00", end_time="11:30"),
            # Wednesday
            Timetable(department_id=cse.id, subject_id=s_ai.id, teacher_id=t1.id, classroom_id=cr302.id, division="A", day_of_week=2, start_time="09:00", end_time="10:30"),
            # Thursday
            Timetable(department_id=cse.id, subject_id=s_os.id, teacher_id=t2.id, classroom_id=cr302.id, division="A", day_of_week=3, start_time="13:30", end_time="15:00"),
            # Friday
            Timetable(department_id=cse.id, subject_id=s_cv.id, teacher_id=t2.id, classroom_id=lab1.id, division="A", day_of_week=4, start_time="10:00", end_time="12:00"),
        ]
        db.add_all(timetables)
        db.commit()

        print("8. Seeding 20 Registered Students...")
        student_names = [
            ("Arjun Sharma", "arjun@attendai.com"),
            ("Priya Patel", "priya@attendai.com"),
            ("Rohit Verma", "rohit@attendai.com"),
            ("Sneha Joshi", "sneha@attendai.com"),
            ("Vikram Singh", "vikram@attendai.com"),
            ("Ananya Rao", "ananya@attendai.com"),
            ("Aditya Kulkarni", "aditya@attendai.com"),
            ("Neha Gupta", "neha@attendai.com"),
            ("Karan Mehta", "karan@attendai.com"),
            ("Pooja Nair", "pooja@attendai.com"),
            ("Rahul Deshmukh", "rahul@attendai.com"),
            ("Riya Shah", "riya@attendai.com"),
            ("Siddharth Roy", "sid@attendai.com"),
            ("Tanvi More", "tanvi@attendai.com"),
            ("Varun Iyer", "varun@attendai.com"),
            ("Aarav Chawla", "aarav@attendai.com"),
            ("Ishita Banerjee", "ishita@attendai.com"),
            ("Manish Tiwari", "manish@attendai.com"),
            ("Divya Menon", "divya@attendai.com"),
            ("Gaurav Pandey", "gaurav@attendai.com")
        ]

        students = []
        random.seed(1337)
        for i, (name, email) in enumerate(student_names):
            u = User(
                name=name,
                email=email,
                hashed_password=get_password_hash("student123"),
                role="student"
            )
            db.add(u)
            db.commit()
            db.refresh(u)

            # Generate normalized 512-d ArcFace vector
            vec = [random.gauss(0.0, 0.1) for _ in range(512)]
            norm = sum(x*x for x in vec) ** 0.5
            vec = [x/norm for x in vec]

            s = Student(
                user_id=u.id,
                roll_number=f"STU{101 + i}",
                department_id=cse.id,
                division="A" if i < 15 else "B",
                year=3,
                face_registered=True,
                face_embedding=vec
            )
            db.add(s)
            students.append(s)

        db.commit()
        for s in students:
            db.refresh(s)

        print("9. Seeding Today's Active Lecture Session & Historical Attendance...")
        today = date.today()
        # Today's active session
        active_sess = LectureSession(
            subject_id=s_ai.id,
            teacher_id=t1.id,
            classroom_id=cr302.id,
            camera_id=cam_webcam.id,
            date=today,
            scheduled_start="09:00",
            scheduled_end="10:30",
            actual_start=datetime.utcnow() - timedelta(minutes=40),
            status="Active",
            interval_duration_sec=300,
            total_eligible_intervals=10,
            min_presence_ratio=0.50
        )
        db.add(active_sess)
        db.commit()
        db.refresh(active_sess)

        # Populate attendance for active session
        for i, s in enumerate(students[:15]):  # Division A
            # 85% present, 10% late, 5% absent
            rand_val = random.random()
            if rand_val > 0.15:
                status = "Present"
                intervals = random.randint(5, 9)
            elif rand_val > 0.05:
                status = "Late"
                intervals = random.randint(5, 8)
            else:
                status = "Absent"
                intervals = random.randint(0, 3)

            att = Attendance(
                lecture_session_id=active_sess.id,
                student_id=s.id,
                status=status,
                intervals_observed=intervals,
                total_eligible_intervals=10,
                presence_ratio=round(intervals / 10.0, 2),
                first_seen_at=datetime.utcnow() - timedelta(minutes=35),
                last_seen_at=datetime.utcnow() - timedelta(minutes=5),
                confidence_score=round(random.uniform(0.72, 0.98), 3),
                verification_method="AI_Auto"
            )
            db.add(att)

        # Generate 5 historical past sessions with attendance
        for day_offset in range(1, 6):
            past_date = today - timedelta(days=day_offset)
            past_sess = LectureSession(
                subject_id=random.choice([s_ai, s_cv, s_db, s_os]).id,
                teacher_id=random.choice([t1, t2]).id,
                classroom_id=random.choice([cr301, cr302, lab1]).id,
                camera_id=cam_cctv1.id,
                date=past_date,
                scheduled_start="10:00",
                scheduled_end="11:30",
                actual_start=datetime.combine(past_date, datetime.min.time()) + timedelta(hours=10),
                actual_end=datetime.combine(past_date, datetime.min.time()) + timedelta(hours=11, minutes=30),
                status="Completed",
                interval_duration_sec=300,
                total_eligible_intervals=10,
                min_presence_ratio=0.50
            )
            db.add(past_sess)
            db.commit()
            db.refresh(past_sess)

            for s in students[:15]:
                is_p = random.random() > 0.20
                att_past = Attendance(
                    lecture_session_id=past_sess.id,
                    student_id=s.id,
                    status="Present" if is_p else "Absent",
                    intervals_observed=8 if is_p else 1,
                    total_eligible_intervals=10,
                    presence_ratio=0.8 if is_p else 0.1,
                    confidence_score=0.91 if is_p else 0.0,
                    verification_method="AI_Auto",
                    created_at=datetime.combine(past_date, datetime.min.time()) + timedelta(hours=10, minutes=15)
                )
                db.add(att_past)

        db.commit()
        print("AttendAI Complete Database Seeding Successfully Finished!")
        print("Demo Accounts:")
        print("  - Admin  : admin@attendai.com   / admin123")
        print("  - Teacher: ramesh@attendai.com  / teacher123")
        print("  - Student: arjun@attendai.com   / student123")
        print("  - Student: priya@attendai.com   / student123")
    finally:
        db.close()

if __name__ == "__main__":
    seed_all()
