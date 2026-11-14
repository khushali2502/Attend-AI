'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { api } from '@/utils/api';
import { Plus, BookOpen, Clock, Calendar, MapPin, Trash2, AlertTriangle, CheckCircle } from 'lucide-react';

export default function AdminAcademicPage() {
  const [departments, setDepartments] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [timetables, setTimetables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptCode, setNewDeptCode] = useState('');
  const [newSubjName, setNewSubjName] = useState('');
  const [newSubjCode, setNewSubjCode] = useState('');
  const [newSubjDeptId, setNewSubjDeptId] = useState<number>(1);

  // Classroom form
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomBuilding, setNewRoomBuilding] = useState('Block A');
  const [newRoomCapacity, setNewRoomCapacity] = useState(60);

  // Timetable form
  const [ttDeptId, setTtDeptId] = useState<number>(1);
  const [ttSubjId, setTtSubjId] = useState<number>(1);
  const [ttTeacherId, setTtTeacherId] = useState<number>(1);
  const [ttRoomId, setTtRoomId] = useState<number>(1);
  const [ttDay, setTtDay] = useState<number>(0);
  const [ttStart, setTtStart] = useState('09:00');
  const [ttEnd, setTtEnd] = useState('10:30');
  const [ttDivision, setTtDivision] = useState('A');
  const [ttConflictError, setTtConflictError] = useState('');
  const [ttSuccessMsg, setTtSuccessMsg] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const [deptData, subjData, roomData, teachData, ttData] = await Promise.all([
          api.getDepartments().catch(() => []),
          api.getSubjects().catch(() => []),
          api.getClassrooms().catch(() => []),
          api.getTeachers().catch(() => []),
          api.getTimetables().catch(() => [])
        ]);
        setDepartments(deptData);
        setSubjects(subjData);
        setClassrooms(roomData);
        setTeachers(teachData);
        setTimetables(ttData);
        if (deptData.length > 0) {
          setNewSubjDeptId(deptData[0].id);
          setTtDeptId(deptData[0].id);
        }
        if (subjData.length > 0) setTtSubjId(subjData[0].id);
        if (teachData.length > 0) setTtTeacherId(teachData[0].id);
        if (roomData.length > 0) setTtRoomId(roomData[0].id);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleAddDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName || !newDeptCode) return;
    try {
      const added = await api.createDepartment(newDeptName, newDeptCode);
      setDepartments(prev => [...prev, added]);
      setNewDeptName('');
      setNewDeptCode('');
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjName || !newSubjCode) return;
    try {
      const added = await api.createSubject(newSubjName, newSubjCode, newSubjDeptId);
      const dept = departments.find(d => d.id === newSubjDeptId);
      setSubjects(prev => [...prev, { ...added, department: { code: dept?.code || 'CSE' } }]);
      setNewSubjName('');
      setNewSubjCode('');
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleAddClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName) return;
    try {
      const res = await fetch('http://localhost:8000/api/timetables/classrooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          name: newRoomName,
          building: newRoomBuilding,
          capacity: Number(newRoomCapacity)
        })
      });
      const data = await res.json();
      if (res.ok) {
        setClassrooms(prev => [...prev, data]);
        setNewRoomName('');
      } else {
        alert(data.detail || 'Error creating classroom');
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleAddTimetable = async (e: React.FormEvent) => {
    e.preventDefault();
    setTtConflictError('');
    setTtSuccessMsg('');

    try {
      const entry = await api.createTimetableEntry({
        department_id: Number(ttDeptId),
        subject_id: Number(ttSubjId),
        teacher_id: Number(ttTeacherId),
        classroom_id: Number(ttRoomId),
        day_of_week: Number(ttDay),
        start_time: ttStart,
        end_time: ttEnd,
        division: ttDivision
      });
      setTimetables(prev => [...prev, entry]);
      setTtSuccessMsg('Timetable entry published successfully with zero conflicts.');
      setTimeout(() => setTtSuccessMsg(''), 3000);
    } catch (err: any) {
      setTtConflictError(err.message || 'Timetable scheduling conflict occurred.');
    }
  };

  const handleDeleteTimetable = async (id: number) => {
    if (!confirm('Are you sure you want to delete this scheduled lecture?')) return;
    try {
      await api.deleteTimetableEntry(id);
      setTimetables(prev => prev.filter(t => t.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="h-48 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Academic & Timetable Management</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Configure departments, course subjects, classrooms, and published lecture timetables with collision detection.
          </p>
        </div>

        {/* 1. Departments & Classrooms Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Departments */}
          <Card className="border border-border/40">
            <CardHeader>
              <CardTitle className="text-md">Departments</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddDept} className="flex gap-2 mb-4">
                <input
                  type="text"
                  placeholder="Department Name"
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  className="flex-1 px-3 py-2 border border-border rounded-xl bg-background text-xs outline-none"
                  required
                />
                <input
                  type="text"
                  placeholder="Code (CSE)"
                  value={newDeptCode}
                  onChange={(e) => setNewDeptCode(e.target.value)}
                  className="w-24 px-3 py-2 border border-border rounded-xl bg-background text-xs outline-none"
                  required
                />
                <button type="submit" className="px-3 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl flex items-center gap-1 shadow">
                  <Plus size={14} /> Add
                </button>
              </form>
              <div className="border border-border rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-accent/20 border-b border-border text-muted-foreground font-semibold">
                      <th className="p-2.5">Name</th>
                      <th className="p-2.5">Code</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {departments.map(d => (
                      <tr key={d.id} className="hover:bg-accent/10">
                        <td className="p-2.5 font-semibold text-foreground">{d.name}</td>
                        <td className="p-2.5 text-muted-foreground">{d.code}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Classrooms */}
          <Card className="border border-border/40">
            <CardHeader>
              <CardTitle className="text-md">Classrooms & Surveillance Rooms</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddClassroom} className="flex gap-2 mb-4">
                <input
                  type="text"
                  placeholder="Room (e.g. Room 302)"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  className="flex-1 px-3 py-2 border border-border rounded-xl bg-background text-xs outline-none"
                  required
                />
                <input
                  type="text"
                  placeholder="Building"
                  value={newRoomBuilding}
                  onChange={(e) => setNewRoomBuilding(e.target.value)}
                  className="w-28 px-3 py-2 border border-border rounded-xl bg-background text-xs outline-none"
                  required
                />
                <button type="submit" className="px-3 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl flex items-center gap-1 shadow">
                  <Plus size={14} /> Add
                </button>
              </form>
              <div className="border border-border rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-accent/20 border-b border-border text-muted-foreground font-semibold">
                      <th className="p-2.5">Room</th>
                      <th className="p-2.5">Building</th>
                      <th className="p-2.5">Capacity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {classrooms.map(c => (
                      <tr key={c.id} className="hover:bg-accent/10">
                        <td className="p-2.5 font-semibold text-foreground flex items-center gap-1.5">
                          <MapPin size={12} className="text-primary" /> {c.name}
                        </td>
                        <td className="p-2.5 text-muted-foreground">{c.building}</td>
                        <td className="p-2.5 text-muted-foreground">{c.capacity} seats</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 2. Subjects Row */}
        <Card className="border border-border/40">
          <CardHeader>
            <CardTitle className="text-md">Course Subjects</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddSubject} className="grid grid-cols-1 sm:grid-cols-4 gap-2 mb-4">
              <input
                type="text"
                placeholder="Subject Name"
                value={newSubjName}
                onChange={(e) => setNewSubjName(e.target.value)}
                className="px-3 py-2 border border-border rounded-xl bg-background text-xs outline-none"
                required
              />
              <input
                type="text"
                placeholder="Course Code (CS401)"
                value={newSubjCode}
                onChange={(e) => setNewSubjCode(e.target.value)}
                className="px-3 py-2 border border-border rounded-xl bg-background text-xs outline-none"
                required
              />
              <select
                value={newSubjDeptId}
                onChange={(e) => setNewSubjDeptId(Number(e.target.value))}
                className="px-3 py-2 border border-border rounded-xl bg-background text-xs outline-none"
              >
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                ))}
              </select>
              <button type="submit" className="px-3 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl flex items-center justify-center gap-1 shadow">
                <Plus size={14} /> Add Subject
              </button>
            </form>
            <div className="border border-border rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-accent/20 border-b border-border text-muted-foreground font-semibold">
                    <th className="p-2.5">Subject Name</th>
                    <th className="p-2.5">Code</th>
                    <th className="p-2.5">Department</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {subjects.map(s => (
                    <tr key={s.id} className="hover:bg-accent/10">
                      <td className="p-2.5 font-semibold text-foreground flex items-center gap-1.5">
                        <BookOpen size={13} className="text-primary" /> {s.name}
                      </td>
                      <td className="p-2.5 text-muted-foreground font-mono">{s.code}</td>
                      <td className="p-2.5 text-muted-foreground">{s.department?.name || 'CSE'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* 3. Timetable Management Builder (Conflict-Protected) */}
        <Card className="border border-border/40">
          <CardHeader>
            <CardTitle className="text-md flex items-center gap-2">
              <Calendar size={18} className="text-primary" /> Timetable Scheduler (with Conflict Detection)
            </CardTitle>
            <CardDescription>
              Assign faculty, subject, classroom, day, and time slots. The system blocks double-booking for classrooms and teachers.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {ttConflictError && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs font-semibold flex items-center gap-2">
                <AlertTriangle size={15} /> {ttConflictError}
              </div>
            )}
            {ttSuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs font-semibold flex items-center gap-2">
                <CheckCircle size={15} /> {ttSuccessMsg}
              </div>
            )}

            <form onSubmit={handleAddTimetable} className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 bg-card/60 p-4 rounded-xl border border-border">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Subject</label>
                <select
                  value={ttSubjId}
                  onChange={(e) => setTtSubjId(Number(e.target.value))}
                  className="w-full p-2 rounded-lg border border-border bg-background text-xs outline-none"
                >
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.code} - {s.name}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Faculty</label>
                <select
                  value={ttTeacherId}
                  onChange={(e) => setTtTeacherId(Number(e.target.value))}
                  className="w-full p-2 rounded-lg border border-border bg-background text-xs outline-none"
                >
                  {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Classroom</label>
                <select
                  value={ttRoomId}
                  onChange={(e) => setTtRoomId(Number(e.target.value))}
                  className="w-full p-2 rounded-lg border border-border bg-background text-xs outline-none"
                >
                  {classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Day</label>
                <select
                  value={ttDay}
                  onChange={(e) => setTtDay(Number(e.target.value))}
                  className="w-full p-2 rounded-lg border border-border bg-background text-xs outline-none"
                >
                  {days.map((d, idx) => <option key={idx} value={idx}>{d}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Start Time</label>
                <input
                  type="time"
                  value={ttStart}
                  onChange={(e) => setTtStart(e.target.value)}
                  className="w-full p-1.5 rounded-lg border border-border bg-background text-xs outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">End Time</label>
                <input
                  type="time"
                  value={ttEnd}
                  onChange={(e) => setTtEnd(e.target.value)}
                  className="w-full p-1.5 rounded-lg border border-border bg-background text-xs outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Division</label>
                <select
                  value={ttDivision}
                  onChange={(e) => setTtDivision(e.target.value)}
                  className="w-full p-2 rounded-lg border border-border bg-background text-xs outline-none"
                >
                  <option value="A">Div A</option>
                  <option value="B">Div B</option>
                  <option value="C">Div C</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full p-2 rounded-lg bg-primary text-primary-foreground font-bold text-xs shadow hover:bg-primary/90 flex items-center justify-center gap-1"
                >
                  <Plus size={14} /> Schedule
                </button>
              </div>
            </form>

            {/* Published Timetable Table */}
            <div className="border border-border rounded-xl overflow-x-auto text-xs">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-accent/20 border-b border-border text-muted-foreground font-semibold uppercase">
                    <th className="p-3">Day</th>
                    <th className="p-3">Time</th>
                    <th className="p-3">Subject</th>
                    <th className="p-3">Faculty</th>
                    <th className="p-3">Classroom</th>
                    <th className="p-3">Division</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {timetables.map(t => (
                    <tr key={t.id} className="hover:bg-accent/10">
                      <td className="p-3 font-semibold text-primary">{days[t.day_of_week]}</td>
                      <td className="p-3 text-muted-foreground font-mono flex items-center gap-1">
                        <Clock size={12} /> {t.start_time} - {t.end_time}
                      </td>
                      <td className="p-3 font-bold text-foreground">{t.subject?.name} ({t.subject?.code})</td>
                      <td className="p-3 text-muted-foreground">{t.teacher?.user?.name || 'Faculty'}</td>
                      <td className="p-3 text-muted-foreground">{t.classroom?.name || t.classroom || 'Room 302'}</td>
                      <td className="p-3 font-bold text-foreground">Div {t.division || 'A'}</td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleDeleteTimetable(t.id)}
                          className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          title="Remove Lecture"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {timetables.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-xs text-muted-foreground">
                        No published lectures scheduled yet. Use the scheduler above.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
