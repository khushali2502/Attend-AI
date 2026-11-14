import requests
import os
import sys

sys.path.insert(0, os.path.abspath('backend'))

BASE_URL = 'http://127.0.0.1:8000'

def main():
    # 1. Admin Login
    print('=== 1. Admin Login ===')
    res = requests.post(f'{BASE_URL}/api/auth/login', json={'identifier': 'admin@attendai.com', 'password': 'adminpassword123'})
    if res.status_code != 200:
        res = requests.post(f'{BASE_URL}/api/auth/login', json={'identifier': 'admin@attendai.com', 'password': 'admin123'})
    print('Admin Login status:', res.status_code)
    assert res.status_code == 200, f"Failed Admin Login: {res.text}"
    admin_token = res.json().get('access_token')
    headers = {'Authorization': f'Bearer {admin_token}'}

    # 2. Check current students
    print('\n=== 2. Fetch Students as Admin ===')
    res = requests.get(f'{BASE_URL}/api/admins/students', headers=headers)
    assert res.status_code == 200
    student_list = res.json()
    print('Current Students in DB:')
    for s in student_list:
        name = s.get('user', {}).get('name') or s.get('name')
        print(f"  ID: {s['id']}, Name: {name}, Roll: {s['roll_number']}, Registered: {s['face_registered']}")

    # 3. Create student Sneha Patil (STU104) if not already created
    print('\n=== 3. Admin: Create Student Sneha Patil (STU104) ===')
    existing_sneha = next((s for s in student_list if s['roll_number'] == 'STU104'), None)
    if not existing_sneha:
        create_payload = {
            'full_name': 'Sneha Patil',
            'roll_number': 'STU104',
            'email': 'sneha.patil@attendai.com',
            'phone': '+91 9876543210',
            'department_id': 1,
            'division': 'A',
            'year': 3,
            'password': 'studentpassword123',
            'confirm_password': 'studentpassword123'
        }
        res = requests.post(f'{BASE_URL}/api/admins/students', json=create_payload, headers=headers)
        print('Create student status:', res.status_code)
        assert res.status_code == 201, f"Failed to create student: {res.text}"
        sneha_student = res.json()
    else:
        print('Student STU104 already exists in DB.')
        sneha_student = existing_sneha

    # 4. Teacher Login & View Registry
    print('\n=== 4. Teacher Login & View Face Registry ===')
    res = requests.post(f'{BASE_URL}/api/auth/login', json={'identifier': 'teacher@attendai.com', 'password': 'teacherpassword123'})
    if res.status_code != 200:
        res = requests.post(f'{BASE_URL}/api/auth/login', json={'identifier': 'teacher@attendai.com', 'password': 'teacher123'})
    print('Teacher login status:', res.status_code)
    teacher_token = res.json().get('access_token')
    teacher_headers = {'Authorization': f'Bearer {teacher_token}'}

    res = requests.get(f'{BASE_URL}/api/teachers/students', headers=teacher_headers)
    students = res.json()
    print(f'Teacher sees {len(students)} students in registry.')
    sneha = next((s for s in students if s['roll_number'] == 'STU104'), None)
    assert sneha is not None, "Sneha Patil not found in teacher registry!"
    sneha_name = sneha.get('user', {}).get('name') or sneha.get('name')
    print('Sneha found in Teacher Registry:', sneha_name, sneha['roll_number'], 'Face registered:', sneha['face_registered'])

    # 5. Teacher: Register Face for Sneha Patil using real image
    print('\n=== 5. Register Face for Sneha Patil with InsightFace ===')
    if sneha.get('face_registered'):
        del_res = requests.delete(f'{BASE_URL}/api/students/{sneha["id"]}/face', headers=teacher_headers)
        print('Reset existing face for Sneha (status):', del_res.status_code)

    img_path = os.path.abspath(os.path.join(os.path.dirname(__file__), 'test_single_face.jpg'))
    with open(img_path, 'rb') as f:
        files = [('files', ('face_01.png', f, 'image/png'))]
        reg_res = requests.post(f'{BASE_URL}/api/students/{sneha["id"]}/face-registration', headers=teacher_headers, files=files)
    print('Face Registration Status:', reg_res.status_code)
    print('Face Registration Response:', reg_res.json())
    assert reg_res.status_code == 200, f"Registration failed: {reg_res.text}"

    # 6. Verify Persistence and Stat Counters
    print('\n=== 6. Verify Database Persistence & Dynamic Status ===')
    res = requests.get(f'{BASE_URL}/api/teachers/students', headers=teacher_headers)
    students = res.json()
    verified_count = sum(1 for s in students if s['face_registered'])
    pending_count = sum(1 for s in students if not s['face_registered'])
    sneha_after = next((s for s in students if s['roll_number'] == 'STU104'), None)
    print(f'BIOMETRICS VERIFIED: {verified_count}')
    print(f'PENDING BIOMETRICS: {pending_count}')
    print(f'Sneha face_registered: {sneha_after["face_registered"]}')
    print(f'Profile Image URL: {sneha_after.get("profile_image_url")}')
    assert sneha_after['face_registered'] is True

    # 7. Student Login with Roll Number + Password
    print('\n=== 7. Student Login with Roll Number (STU104) + Password ===')
    stu_res = requests.post(f'{BASE_URL}/api/auth/login', json={'identifier': 'STU104', 'password': 'studentpassword123'})
    print('Student Login Status:', stu_res.status_code)
    assert stu_res.status_code == 200, f"Student Login failed: {stu_res.text}"
    student_token = stu_res.json().get('access_token')
    stu_headers = {'Authorization': f'Bearer {student_token}'}

    # 8. Student Profile & Dashboard check
    print('\n=== 8. Student Dashboard & Profile Info ===')
    prof_res = requests.get(f'{BASE_URL}/api/students/me/profile', headers=stu_headers)
    assert prof_res.status_code == 200, f"Failed to get student profile: {prof_res.text}"
    profile_data = prof_res.json()
    print('Student Profile ID:', profile_data.get('id'))
    print('Student Name:', profile_data.get('user', {}).get('name'))
    print('Student Roll:', profile_data.get('roll_number'))
    print('Student Face Registered:', profile_data.get('face_registered'))
    print('Student Profile Image:', profile_data.get('profile_image_url'))
    assert profile_data.get('roll_number') == 'STU104'
    assert profile_data.get('face_registered') is True
    assert profile_data.get('profile_image_url') is not None

    # 9. Surveillance Matching Test
    print('\n=== 9. Classroom Camera Surveillance Simulation ===')
    import cv2
    from app.services.ai_service import match_face_against_database, _face_app
    from app.db.session import SessionLocal
    from app.models.models import Student
    
    app = _face_app
    test_img = cv2.imread(img_path)
    faces = app.get(test_img)
    embedding = faces[0].embedding
    
    db = SessionLocal()
    registered_students = db.query(Student).filter(Student.face_registered == True).all()
    matched_student, conf = match_face_against_database(embedding, registered_students, threshold=0.4)
    student_name = matched_student.user.name if matched_student and matched_student.user else "Unknown"
    print(f'Classroom Camera Recognized -> Student ID: {matched_student.id if matched_student else None}, Name: {student_name}, Confidence: {conf:.4f}')
    assert matched_student is not None, "Surveillance failed to recognize registered face!"
    assert matched_student.id == sneha['id'], f"Matched ID {matched_student.id} != expected {sneha['id']}"
    db.close()

    print('\n======================================================')
    print('ALL VERIFICATION STEPS PASSED WITH REAL DB & INSIGHTFACE!')
    print('======================================================')

if __name__ == '__main__':
    main()
