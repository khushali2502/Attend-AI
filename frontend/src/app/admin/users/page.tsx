'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import FaceRegistrationModal from '@/components/ui/FaceRegistrationModal';
import { api } from '@/utils/api';
import {
  Users,
  UserCheck,
  UserPlus,
  Search,
  X,
  CheckCircle,
  AlertCircle,
  Trash2,
  Eye,
  Pencil,
  Camera,
  RefreshCw,
  GraduationCap,
  Briefcase
} from 'lucide-react';

export default function AdminUsersPage() {
  const [activeTab, setActiveTab] = useState<'students' | 'teachers'>('students');
  const [students, setStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterFace, setFilterFace] = useState('');

  // Add Student Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    full_name: '',
    roll_number: '',
    email: '',
    phone: '',
    department_id: 0,
    division: '',
    year: 0,
    password: '',
    confirm_password: ''
  });
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  // Edit Student Modal
  const [editStudent, setEditStudent] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    full_name: '',
    roll_number: '',
    email: '',
    phone: '',
    department_id: 0,
    division: '',
    year: 0,
    is_active: true
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');

  // Face Registration Modal
  const [showFaceModal, setShowFaceModal] = useState(false);
  const [faceStudent, setFaceStudent] = useState<any>(null);
  const [faceMode, setFaceMode] = useState<'register' | 'update'>('register');

  // Student Detail View
  const [viewStudent, setViewStudent] = useState<any>(null);

  // Delete Safety Confirmation Modal
  const [deleteConfirmStudent, setDeleteConfirmStudent] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [studentsData, deptData, teachersData] = await Promise.all([
        api.getAdminStudents(),
        api.getDepartments(),
        api.getTeachers()
      ]);
      setStudents(studentsData || []);
      setDepartments(deptData || []);
      setTeachers(teachersData || []);
    } catch (err) {
      console.error('Failed to load user management data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');
    setAddSuccess('');

    if (addForm.password !== addForm.confirm_password) {
      setAddError('Passwords do not match.');
      return;
    }
    if (!addForm.full_name || !addForm.roll_number || !addForm.email || !addForm.password) {
      setAddError('Please fill in all required fields.');
      return;
    }

    setAddLoading(true);
    try {
      await api.createStudent({
        ...addForm,
        department_id: addForm.department_id ? Number(addForm.department_id) : undefined,
        year: addForm.year ? Number(addForm.year) : undefined,
      });
      setAddSuccess(`Student ${addForm.full_name} (${addForm.roll_number}) created successfully!`);
      setTimeout(() => {
        setShowAddModal(false);
        setAddSuccess('');
        setAddForm({
          full_name: '',
          roll_number: '',
          email: '',
          phone: '',
          department_id: 0,
          division: '',
          year: 0,
          password: '',
          confirm_password: ''
        });
        loadData();
      }, 900);
    } catch (err: any) {
      setAddError(err.message || 'Failed to create student.');
    } finally {
      setAddLoading(false);
    }
  };

  const openEditModal = (s: any) => {
    setEditStudent(s);
    setEditError('');
    setEditSuccess('');
    setEditForm({
      full_name: s.user?.name || '',
      roll_number: s.roll_number || '',
      email: s.user?.email || '',
      phone: s.phone || '',
      department_id: s.department?.id || s.department_id || 0,
      division: s.division || '',
      year: s.year || 0,
      is_active: s.user?.is_active !== false
    });
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError('');
    setEditSuccess('');

    if (!editForm.full_name || !editForm.roll_number || !editForm.email) {
      setEditError('Please fill in all required fields.');
      return;
    }

    setEditLoading(true);
    try {
      await api.updateStudent(editStudent.id, {
        full_name: editForm.full_name,
        roll_number: editForm.roll_number,
        email: editForm.email,
        phone: editForm.phone || null,
        department_id: Number(editForm.department_id) || undefined,
        division: editForm.division || null,
        year: Number(editForm.year) || undefined,
        is_active: editForm.is_active
      });
      setEditSuccess('Student updated successfully in PostgreSQL!');
      setTimeout(() => {
        setEditStudent(null);
        setEditSuccess('');
        loadData();
      }, 700);
    } catch (err: any) {
      setEditError(err.message || 'Failed to update student.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleRemoveFace = async (student: any) => {
    if (!confirm(`Remove biometric face embeddings for ${student.user?.name} (${student.roll_number})?`)) return;
    try {
      await api.removeFace(student.id);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to remove face.');
    }
  };

  const openFaceModal = (student: any, mode: 'register' | 'update') => {
    setFaceStudent(student);
    setFaceMode(mode);
    setShowFaceModal(true);
  };

  const filteredStudents = students.filter(s => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = !term ||
      s.user?.name?.toLowerCase().includes(term) ||
      s.roll_number?.toLowerCase().includes(term) ||
      s.user?.email?.toLowerCase().includes(term);
    const matchesDept = !filterDept || (s.department && String(s.department.id) === filterDept);
    const matchesFace = !filterFace || (filterFace === 'registered' ? s.face_registered : !s.face_registered);
    return matchesSearch && matchesDept && matchesFace;
  });

  const filteredTeachers = teachers.filter(t => {
    const term = searchTerm.toLowerCase();
    return !term ||
      t.name?.toLowerCase().includes(term) ||
      t.email?.toLowerCase().includes(term) ||
      t.employee_id?.toLowerCase().includes(term);
  });

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-full min-w-0">
        {/* Header with Title and Add Student Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight truncate">User Management</h1>
            <p className="text-muted-foreground text-xs sm:text-sm mt-1">
              Manage student registry, accounts, academic profiles, and biometric face registration.
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={loadData}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl border border-border bg-background/50 hover:bg-accent text-xs sm:text-sm font-semibold transition-all active:scale-95 whitespace-nowrap"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={() => {
                setShowAddModal(true);
                setAddError('');
                setAddSuccess('');
              }}
              className="flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm tracking-wide shadow-md shadow-indigo-600/20 transition-all active:scale-95 whitespace-nowrap"
            >
              <UserPlus size={15} />
              <span>[ + Add Student ]</span>
            </button>
          </div>
        </div>

        {/* Tab Switcher: Students vs Teachers */}
        <div className="flex items-center gap-2 border-b border-border/60 pb-3">
          <button
            onClick={() => setActiveTab('students')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'students'
                ? 'bg-primary text-white shadow-md shadow-primary/20'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/40'
            }`}
          >
            <GraduationCap size={16} />
            <span>Students</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-mono ${activeTab === 'students' ? 'bg-white/20' : 'bg-accent'}`}>
              {students.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('teachers')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'teachers'
                ? 'bg-primary text-white shadow-md shadow-primary/20'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/40'
            }`}
          >
            <Briefcase size={16} />
            <span>Teachers</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-mono ${activeTab === 'teachers' ? 'bg-white/20' : 'bg-accent'}`}>
              {teachers.length}
            </span>
          </button>
        </div>

        {/* Filters */}
        <Card className="border border-border/40 p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <div className="relative flex-1 w-full sm:max-w-xs">
              <Search size={16} className="absolute left-3 top-2.5 text-muted-foreground" />
              <input
                type="text"
                placeholder={activeTab === 'students' ? "Search name, roll no, email..." : "Search teacher name, employee id..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-border rounded-xl bg-background/50 text-sm outline-none focus:border-primary"
              />
            </div>
            {activeTab === 'students' && (
              <div className="flex gap-2 w-full sm:w-auto flex-wrap">
                <select
                  value={filterDept}
                  onChange={(e) => setFilterDept(e.target.value)}
                  className="px-3 py-2 border border-border rounded-xl bg-background/50 text-xs sm:text-sm outline-none text-muted-foreground flex-1 sm:flex-none"
                >
                  <option value="">All Departments</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                  ))}
                </select>
                <select
                  value={filterFace}
                  onChange={(e) => setFilterFace(e.target.value)}
                  className="px-3 py-2 border border-border rounded-xl bg-background/50 text-xs sm:text-sm outline-none text-muted-foreground flex-1 sm:flex-none"
                >
                  <option value="">All Face Status</option>
                  <option value="registered">✓ Face Registered</option>
                  <option value="not_registered">○ Face Not Registered</option>
                </select>
              </div>
            )}
          </div>
        </Card>

        {/* Data Tables */}
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mb-3"></div>
            <p className="text-muted-foreground text-sm">Loading user directory...</p>
          </div>
        ) : activeTab === 'students' ? (
          /* Students Table */
          <Card className="border border-border/40 overflow-hidden w-full !p-0">
            <CardHeader className="flex flex-row items-center justify-between p-5 pb-4 border-b border-border/60">
              <div>
                <CardTitle className="text-md font-bold">Student Registry ({filteredStudents.length})</CardTitle>
                <CardDescription>Live database student roster with academic info and biometric status</CardDescription>
              </div>
              <GraduationCap size={18} className="text-primary" />
            </CardHeader>
            <div className="overflow-x-auto w-full">
              <table className="w-full text-xs sm:text-sm text-left whitespace-nowrap">
                <thead>
                  <tr className="border-b border-border bg-accent/20 text-muted-foreground text-[11px] uppercase font-semibold">
                    <th className="px-5 py-3">Student</th>
                    <th className="px-3 py-3">ID</th>
                    <th className="px-3 py-3">Roll Number</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-3 py-3">Department</th>
                    <th className="px-3 py-3">Div / Yr</th>
                    <th className="px-3 py-3 text-center">Face Status</th>
                    <th className="px-3 py-3 text-center">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredStudents.map(s => (
                    <tr key={s.id} className="hover:bg-accent/10 transition-all">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {s.profile_image_url ? (
                            <div className="w-8 h-8 rounded-full overflow-hidden border border-primary/30 shrink-0">
                              <img
                                src={s.profile_image_url.startsWith('http') ? s.profile_image_url : `http://localhost:8000${s.profile_image_url}`}
                                alt={s.user?.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600/30 to-purple-600/30 border border-primary/30 flex items-center justify-center font-bold text-xs text-primary shrink-0">
                              {s.user?.name?.charAt(0) || 'S'}
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-foreground">{s.user?.name}</p>
                            {s.phone && <p className="text-[11px] text-muted-foreground">{s.phone}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 font-mono text-xs text-muted-foreground font-semibold">{s.id}</td>
                      <td className="px-3 py-3 font-mono font-bold text-xs text-primary">{s.roll_number}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{s.user?.email}</td>
                      <td className="px-3 py-3 text-xs font-semibold">{s.department?.name || '—'}</td>
                      <td className="px-3 py-3 text-xs text-muted-foreground">
                        {s.division ? `Div ${s.division}` : '—'} {s.year ? `• Yr ${s.year}` : ''}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          s.face_registered ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                        }`}>
                          {s.face_registered ? (
                            <>
                              <CheckCircle size={12} />
                              ✓ Registered
                            </>
                          ) : (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full border-2 border-amber-500" />
                              ○ Not Registered
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${
                          s.user?.is_active !== false ? 'bg-emerald-500/15 text-emerald-500' : 'bg-destructive/15 text-destructive'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${s.user?.is_active !== false ? 'bg-emerald-500' : 'bg-destructive'}`} />
                          {s.user?.is_active !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5 pr-2">
                          {/* View details button */}
                          <button
                            onClick={() => setViewStudent(s)}
                            className="p-1.5 rounded-lg border border-border hover:bg-accent text-muted-foreground hover:text-foreground transition-all"
                            title="View Student Details"
                          >
                            <Eye size={14} />
                          </button>

                          {/* Edit / Update Student button */}
                          <button
                            onClick={() => openEditModal(s)}
                            className="p-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-all"
                            title="Edit Student Information"
                          >
                            <Pencil size={14} />
                          </button>

                          {/* Face action button */}
                          {!s.face_registered ? (
                            <button
                              onClick={() => openFaceModal(s, 'register')}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-xs active:scale-95 transition-all"
                              title="Register Student Face"
                            >
                              <Camera size={13} />
                              <span>Register Face</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => openFaceModal(s, 'update')}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border hover:bg-accent text-xs font-bold text-primary transition-all"
                              title="Update Face Biometrics"
                            >
                              <Camera size={13} />
                              <span>Update Face</span>
                            </button>
                          )}

                          {/* Delete student button */}
                          <button
                            onClick={() => {
                              setDeleteConfirmStudent(s);
                              setDeleteError('');
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-destructive/30 bg-destructive/10 hover:bg-destructive/20 text-xs font-bold text-destructive transition-all"
                            title="Delete Student"
                          >
                            <Trash2 size={13} />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredStudents.length === 0 && (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-muted-foreground text-sm">
                        No students found in PostgreSQL. Click "[ + Add Student ]" to create an account.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        ) : (
          /* Teachers Table */
          <Card className="border border-border/40 overflow-hidden w-full !p-0">
            <CardHeader className="flex flex-row items-center justify-between p-5 pb-4 border-b border-border/60">
              <div>
                <CardTitle className="text-md font-bold">Faculty / Teachers ({filteredTeachers.length})</CardTitle>
                <CardDescription>Academic faculty roster with employee ID and departments</CardDescription>
              </div>
              <Briefcase size={18} className="text-primary" />
            </CardHeader>
            <div className="overflow-x-auto w-full">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead>
                  <tr className="border-b border-border bg-accent/20 text-muted-foreground text-xs uppercase font-semibold">
                    <th className="p-4">Faculty Member</th>
                    <th className="p-4">Employee ID</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Department</th>
                    <th className="p-4 text-center">Account Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredTeachers.map(t => (
                    <tr key={t.id} className="hover:bg-accent/10 transition-all">
                      <td className="p-4 font-bold text-foreground flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">
                          {t.name?.charAt(0) || 'T'}
                        </div>
                        {t.name}
                      </td>
                      <td className="p-4 font-mono font-bold text-xs text-primary">{t.employee_id}</td>
                      <td className="p-4 text-xs text-muted-foreground">{t.email}</td>
                      <td className="p-4 text-xs font-semibold">{t.department}</td>
                      <td className="p-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-emerald-500/15 text-emerald-500">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Active
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredTeachers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-muted-foreground text-sm">
                        No faculty records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-[#0B0F19] text-foreground w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border/60 shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-border/40">
              <h3 className="font-extrabold text-xl">Register New Student Account</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-xl hover:bg-accent/50 text-muted-foreground hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddStudent} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={addForm.full_name}
                    onChange={(e) => setAddForm({ ...addForm, full_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background/50 text-sm outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Roll Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 24101B2015"
                    value={addForm.roll_number}
                    onChange={(e) => setAddForm({ ...addForm, roll_number: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background/50 text-sm font-mono outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="student@university.edu"
                    value={addForm.email}
                    onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background/50 text-sm outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="+91 9876543210"
                    value={addForm.phone}
                    onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background/50 text-sm outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Department
                  </label>
                  <select
                    value={addForm.department_id}
                    onChange={(e) => setAddForm({ ...addForm, department_id: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-background/50 text-sm outline-none"
                  >
                    <option value={0}>Select Dept</option>
                    {departments.map((d: any) => (
                      <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Division
                  </label>
                  <input
                    type="text"
                    placeholder="A"
                    value={addForm.division}
                    onChange={(e) => setAddForm({ ...addForm, division: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-background/50 text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Year
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    placeholder="3"
                    value={addForm.year || ''}
                    onChange={(e) => setAddForm({ ...addForm, year: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-background/50 text-sm outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Password *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={addForm.password}
                    onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background/50 text-sm outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={addForm.confirm_password}
                    onChange={(e) => setAddForm({ ...addForm, confirm_password: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background/50 text-sm outline-none focus:border-primary"
                  />
                </div>
              </div>

              {addError && (
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold">
                  {addError}
                </div>
              )}
              {addSuccess && (
                <div className="p-3 rounded-xl bg-success/10 border border-success/20 text-success text-xs font-semibold">
                  {addSuccess}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-border/40">
                <button
                  type="button"
                  disabled={addLoading}
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-border hover:bg-accent text-sm font-semibold text-muted-foreground hover:text-foreground transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-bold shadow-md active:scale-95 transition-all disabled:opacity-50"
                >
                  {addLoading ? 'Creating Student...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {editStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-[#0B0F19] text-foreground w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border/60 shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-border/40">
              <div>
                <h3 className="font-extrabold text-xl">Edit Student Details</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Update profile, roll number, department, and account status in PostgreSQL
                </p>
              </div>
              <button
                onClick={() => setEditStudent(null)}
                className="p-1.5 rounded-xl hover:bg-accent/50 text-muted-foreground hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateStudent} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.full_name}
                    onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background/50 text-sm outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Roll Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.roll_number}
                    onChange={(e) => setEditForm({ ...editForm, roll_number: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background/50 text-sm font-mono outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background/50 text-sm outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    placeholder="+91 9876543210"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background/50 text-sm outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Department
                  </label>
                  <select
                    value={editForm.department_id}
                    onChange={(e) => setEditForm({ ...editForm, department_id: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-background/50 text-sm outline-none"
                  >
                    <option value={0}>Select Dept</option>
                    {departments.map((d: any) => (
                      <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Division
                  </label>
                  <input
                    type="text"
                    value={editForm.division}
                    onChange={(e) => setEditForm({ ...editForm, division: e.target.value })}
                    placeholder="e.g. A"
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-background/50 text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Year
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={editForm.year || ''}
                    onChange={(e) => setEditForm({ ...editForm, year: Number(e.target.value) })}
                    placeholder="e.g. 3"
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-background/50 text-sm outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Account Status
                </label>
                <select
                  value={editForm.is_active ? 'active' : 'inactive'}
                  onChange={(e) => setEditForm({ ...editForm, is_active: e.target.value === 'active' })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background/50 text-sm outline-none"
                >
                  <option value="active">Active (Can log in)</option>
                  <option value="inactive">Inactive (Disabled)</option>
                </select>
              </div>

              {editError && (
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold">
                  {editError}
                </div>
              )}
              {editSuccess && (
                <div className="p-3 rounded-xl bg-success/10 border border-success/20 text-success text-xs font-semibold">
                  {editSuccess}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-border/40">
                <button
                  type="button"
                  disabled={editLoading}
                  onClick={() => setEditStudent(null)}
                  className="px-4 py-2.5 rounded-xl border border-border hover:bg-accent text-sm font-semibold text-muted-foreground hover:text-foreground transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-bold shadow-md active:scale-95 transition-all disabled:opacity-50"
                >
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student Details View Modal */}
      {viewStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-[#0B0F19] text-foreground w-full max-w-md rounded-2xl border border-border/60 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/40">
              <h3 className="font-extrabold text-lg">Student Profile Information</h3>
              <button
                onClick={() => setViewStudent(null)}
                className="p-1.5 rounded-xl hover:bg-accent/50 text-muted-foreground hover:text-foreground"
              >
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-1 border-b border-border/30">
                <span className="text-muted-foreground">Permanent Student ID:</span>
                <span className="font-mono font-bold">{viewStudent.id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/30">
                <span className="text-muted-foreground">Roll Number:</span>
                <span className="font-mono font-bold text-primary">{viewStudent.roll_number}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/30">
                <span className="text-muted-foreground">Full Name:</span>
                <span className="font-bold">{viewStudent.user?.name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/30">
                <span className="text-muted-foreground">Email Address:</span>
                <span>{viewStudent.user?.email}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/30">
                <span className="text-muted-foreground">Department:</span>
                <span>{viewStudent.department?.name || '—'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/30">
                <span className="text-muted-foreground">Division & Year:</span>
                <span>Div {viewStudent.division || '—'} • Year {viewStudent.year || '—'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/30">
                <span className="text-muted-foreground">Biometric Status:</span>
                <span className={viewStudent.face_registered ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                  {viewStudent.face_registered ? '✓ Face Registered' : '○ Face Not Registered'}
                </span>
              </div>
            </div>
            <div className="pt-2 flex justify-end gap-2.5">
              <button
                onClick={() => {
                  const target = viewStudent;
                  setViewStudent(null);
                  openEditModal(target);
                }}
                className="px-4 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 text-xs font-bold flex items-center gap-1.5 transition-all"
              >
                <Pencil size={13} />
                <span>Edit Student</span>
              </button>
              <button
                onClick={() => setViewStudent(null)}
                className="px-4 py-2 rounded-xl bg-accent hover:bg-accent/80 text-xs font-semibold text-foreground transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Face Registration Modal */}
      {faceStudent && (
        <FaceRegistrationModal
          isOpen={showFaceModal}
          onClose={() => {
            setShowFaceModal(false);
            setFaceStudent(null);
          }}
          student={faceStudent}
          mode={faceMode}
          onSuccess={() => {
            loadData();
          }}
        />
      )}

      {/* Delete Confirmation Safety Modal */}
      {deleteConfirmStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="bg-[#0B0F19] text-foreground w-full max-w-md rounded-2xl border border-destructive/40 shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-destructive">
              <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center font-bold">
                <AlertCircle size={22} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-foreground">Confirm Student Deletion</h3>
                <p className="text-xs text-muted-foreground">Permanent database and account removal</p>
              </div>
            </div>

            <p className="text-sm text-foreground font-semibold">
              Are you sure you want to delete this student?
            </p>

            <div className="p-3.5 rounded-xl border border-border bg-background/50 space-y-1.5 text-xs font-mono">
              <div>
                <span className="text-muted-foreground">Student name: </span>
                <span className="font-bold text-foreground">{deleteConfirmStudent.user?.name}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Roll No: </span>
                <span className="font-bold text-primary">{deleteConfirmStudent.roll_number}</span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              This action will permanently delete the student profile, associated face biometric records, and user login account from PostgreSQL.
            </p>

            {deleteError && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs">
                {deleteError}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  setDeleteConfirmStudent(null);
                  setDeleteError('');
                }}
                className="px-4 py-2 rounded-xl border border-border hover:bg-accent text-xs font-bold transition-all text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  setIsDeleting(true);
                  setDeleteError('');
                  try {
                    await api.deleteStudent(deleteConfirmStudent.id);
                    setDeleteConfirmStudent(null);
                    loadData();
                  } catch (err: any) {
                    setDeleteError(err.message || 'Failed to delete student');
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-destructive hover:bg-destructive/90 text-white text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete Student'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
