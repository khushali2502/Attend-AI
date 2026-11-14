'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import FaceRegistrationModal from '@/components/ui/FaceRegistrationModal';
import { api } from '@/utils/api';
import { Camera, CheckCircle, AlertCircle, Trash2, Search, Filter, ShieldCheck, RefreshCw, UserPlus, X } from 'lucide-react';

export default function TeacherRegistryPage() {
  // Only students with a valid biometric face embedding in PostgreSQL
  const [students, setStudents] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [stats, setStats] = useState({
    total_enrolled: 0,
    biometrics_verified: 0,
    pending_biometrics: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState('');

  // Face Registration Modal
  const [showFaceModal, setShowFaceModal] = useState(false);
  const [faceStudent, setFaceStudent] = useState<any>(null);
  const [faceMode, setFaceMode] = useState<'register' | 'update'>('register');

  // Enrolled Student Selection Modal (for registering a pending student)
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<number | ''>('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [regData, statsData, allData] = await Promise.all([
        api.getFaceRegistry(),
        api.getFaceRegistryStats(),
        api.getTeacherStudents()
      ]);
      setStudents(regData || []);
      setStats(statsData || { total_enrolled: 0, biometrics_verified: 0, pending_biometrics: 0 });
      setAllStudents(allData || []);
    } catch (err) {
      console.error('Failed to load face registry data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openFaceModal = (student: any, mode: 'register' | 'update') => {
    setFaceStudent(student);
    setFaceMode(mode);
    setShowFaceModal(true);
  };

  const handleRemoveFace = async (student: any) => {
    if (!confirm(`Are you sure you want to remove biometric face embeddings for ${student.user.name} (${student.roll_number})?`)) {
      return;
    }
    try {
      await api.removeFace(student.id);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to remove face');
    }
  };

  // Pending students available for face enrollment
  const pendingStudents = allStudents.filter(
    s => !students.some(reg => reg.id === s.id)
  );

  const filteredStudents = students.filter(s => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = !term ||
      s.user.name.toLowerCase().includes(term) ||
      s.roll_number.toLowerCase().includes(term) ||
      s.user.email.toLowerCase().includes(term);
    const matchesDept = !filterDept || (s.department && s.department.name === filterDept);
    return matchesSearch && matchesDept;
  });

  const departments = Array.from(new Set(students.map(s => s.department?.name).filter(Boolean)));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Biometric Face Registry</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Active student biometric neural profiles enrolled for AI surveillance attendance.
            </p>
          </div>
          <div className="flex items-center gap-2.5 self-start md:self-auto">
            <button
              onClick={loadData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-background/50 hover:bg-accent/40 text-sm font-semibold transition-all active:scale-95"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span>Refresh List</span>
            </button>
            <button
              onClick={() => {
                if (pendingStudents.length > 0) {
                  setSelectedStudentId(pendingStudents[0].id);
                } else {
                  setSelectedStudentId('');
                }
                setShowEnrollModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm tracking-wide shadow-md shadow-indigo-600/20 transition-all active:scale-95"
            >
              <Camera size={15} />
              <span>[ + Register Face ]</span>
            </button>
          </div>
        </div>

        {/* Dynamic Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border border-border/40 bg-gradient-to-br from-blue-500/5 to-transparent">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">TOTAL ENROLLED CLASS</p>
                <p className="text-2xl font-black mt-1">{stats.total_enrolled}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">
                Σ
              </div>
            </CardContent>
          </Card>
          <Card className="border border-border/40 bg-gradient-to-br from-emerald-500/5 to-transparent">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-emerald-500 uppercase tracking-wider">BIOMETRICS VERIFIED</p>
                <p className="text-2xl font-black text-emerald-500 mt-1">{stats.biometrics_verified}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
                <CheckCircle size={20} />
              </div>
            </CardContent>
          </Card>
          <Card className="border border-border/40 bg-gradient-to-br from-amber-500/5 to-transparent">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-amber-500 uppercase tracking-wider">PENDING BIOMETRICS</p>
                <p className="text-2xl font-black text-amber-500 mt-1">{stats.pending_biometrics}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                <AlertCircle size={20} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border border-border/40 p-4">
          <div className="flex flex-col md:flex-row gap-3 items-center">
            <div className="relative flex-1 md:max-w-xs">
              <Search size={16} className="absolute left-3 top-2.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search registered student or roll no..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-border rounded-xl bg-background/50 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
            {departments.length > 0 && (
              <select
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
                className="px-3 py-2 border border-border rounded-xl bg-background/50 text-sm outline-none"
              >
                <option value="">All Departments</option>
                {departments.map((dept: any) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            )}
          </div>
        </Card>

        {/* Registered Students Table (ONLY students with valid biometric face registrations) */}
        <Card className="border border-border/40 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border/40 bg-accent/20">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Student</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Roll Number</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Department</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Div / Year</th>
                  <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Biometric Status</th>
                  <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Registry Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      Loading registered face records...
                    </td>
                  </tr>
                ) : filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      No registered student faces found.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((s) => (
                    <tr key={s.id} className="hover:bg-accent/10 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {s.profile_image_url ? (
                            <div className="w-9 h-9 rounded-full overflow-hidden border border-emerald-500/40 bg-background shrink-0">
                              <img
                                src={s.profile_image_url.startsWith('http') ? s.profile_image_url : `http://localhost:8000${s.profile_image_url}`}
                                alt={s.user.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            </div>
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-600/30 to-blue-600/30 border border-emerald-500/30 flex items-center justify-center font-bold text-xs text-emerald-500 shrink-0">
                              {s.user.name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-foreground">{s.user.name}</p>
                            <p className="text-xs text-muted-foreground">{s.user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono font-medium text-xs text-primary">{s.roll_number}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{s.department?.name || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {s.division ? `Div ${s.division}` : ''} {s.year ? `• Yr ${s.year}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                          <CheckCircle size={13} />
                          ✓ Face Registered
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openFaceModal(s, 'update')}
                            title="Update Face Biometrics"
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-border bg-background/50 hover:bg-accent/40 text-xs font-bold transition-all text-foreground hover:text-primary"
                          >
                            <Camera size={13} className="text-primary" />
                            <span>Update Face</span>
                          </button>
                          <button
                            onClick={() => handleRemoveFace(s)}
                            title="Remove Face Biometrics"
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-destructive/30 bg-destructive/10 hover:bg-destructive/20 text-xs font-bold text-destructive transition-all"
                          >
                            <Trash2 size={13} />
                            <span className="hidden sm:inline">Remove</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Modal to pick an enrolled student for Face Registration */}
        {showEnrollModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-150">
            <div className="bg-[#0B0F19] text-foreground w-full max-w-md rounded-2xl border border-border/60 shadow-2xl p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border/40">
                <h3 className="font-bold text-lg">Enroll Student Face</h3>
                <button
                  onClick={() => setShowEnrollModal(false)}
                  className="p-1.5 rounded-xl hover:bg-accent/50 text-muted-foreground hover:text-foreground"
                >
                  <X size={16} />
                </button>
              </div>

              {pendingStudents.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  All enrolled students in the database already have registered faces!
                </p>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Select Enrolled Student
                    </label>
                    <select
                      value={selectedStudentId}
                      onChange={(e) => setSelectedStudentId(Number(e.target.value))}
                      className="w-full px-4 py-2.5 border border-border rounded-xl bg-background/50 text-sm outline-none"
                    >
                      {pendingStudents.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.user.name} ({s.roll_number}) — {s.department?.name || 'No Dept'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={() => {
                      const student = pendingStudents.find(s => s.id === Number(selectedStudentId));
                      if (student) {
                        setShowEnrollModal(false);
                        openFaceModal(student, 'register');
                      }
                    }}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm tracking-wide shadow-md transition-all active:scale-95"
                  >
                    Proceed to Face Capture / Upload
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Face Registration / Update Modal */}
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
      </div>
    </DashboardLayout>
  );
}
