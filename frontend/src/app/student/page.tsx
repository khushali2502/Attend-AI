'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { api } from '@/utils/api';
import { motion } from 'framer-motion';
import {
  BookOpen,
  CalendarDays,
  CheckCircle,
  FileDown,
  Percent,
  AlertTriangle,
  Clock,
  Send,
  X
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

export default function StudentDashboard() {
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [timetable, setTimetable] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Dispute Modal State
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [selectedAttId, setSelectedAttId] = useState<number | null>(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);
  const [disputeSuccess, setDisputeSuccess] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        const [profData, statsData, attData, ttData] = await Promise.all([
          api.getStudentProfile(),
          api.getStudentStats(),
          api.getStudentAttendance(),
          api.getStudentTimetable()
        ]);
        setProfile(profData);
        setStats(statsData);
        setAttendance(attData);
        setTimetable(ttData);
      } catch (err) {
        console.error("Error loading student portal data", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const downloadReport = (format: 'pdf' | 'excel') => {
    const token = localStorage.getItem('token');
    const url = `http://localhost:8000/api/reports/${format}`;
    window.open(url, '_blank');
  };

  const handleRaiseDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAttId || !disputeReason.trim()) return;

    setDisputeSubmitting(true);
    try {
      const res = await fetch('http://localhost:8000/api/attendance/disputes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          attendance_id: selectedAttId,
          reason: disputeReason
        })
      });
      if (res.ok) {
        setDisputeSuccess('Dispute submitted successfully to course faculty.');
        setDisputeReason('');
        setTimeout(() => {
          setDisputeOpen(false);
          setDisputeSuccess('');
        }, 2000);
      } else {
        alert('Failed to submit dispute.');
      }
    } catch (err) {
      console.error(err);
      alert('Error submitting dispute.');
    } finally {
      setDisputeSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="h-96 flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  // Chart data
  const chartData = [
    { name: 'Attended', value: (stats?.present_count || 0) + (stats?.late_count || 0) },
    { name: 'Absent', value: stats?.absent_count || 0 }
  ];
  const COLORS = ['#6366F1', '#EF4444'];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {profile?.profile_image_url ? (
              <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-primary/30 shadow-md bg-background shrink-0">
                <img
                  src={profile.profile_image_url.startsWith('http') ? profile.profile_image_url : `http://localhost:8000${profile.profile_image_url}`}
                  alt={profile?.user?.name || 'Student Photo'}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600/30 to-purple-600/30 border border-primary/30 flex items-center justify-center font-bold text-primary text-xl shadow-md shrink-0">
                {profile?.user?.name?.charAt(0) || 'S'}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-extrabold tracking-tight">Student Dashboard</h1>
                {profile?.face_registered ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    <CheckCircle size={12} /> Biometrics Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                    <AlertTriangle size={12} /> Biometrics Pending
                  </span>
                )}
              </div>
              <p className="text-muted-foreground text-sm mt-1">
                Welcome back, <span className="text-foreground font-semibold">{profile?.user?.name}</span> (Roll: {profile?.roll_number} • {profile?.department?.code || 'CSE'} Div {profile?.division || 'A'})
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => downloadReport('pdf')}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs shadow transition-all active:scale-95"
            >
              <FileDown size={14} /> PDF Report
            </button>
            <button
              onClick={() => downloadReport('excel')}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-accent hover:bg-accent/80 text-foreground font-semibold text-xs border border-border shadow transition-all active:scale-95"
            >
              <FileDown size={14} /> Excel Export
            </button>
          </div>
        </div>

        {/* Low Attendance Alert Banner */}
        {stats?.is_low_attendance && (
          <div className="p-4 rounded-xl border border-destructive/40 bg-destructive/10 text-destructive flex items-start gap-3 shadow-sm animate-pulse">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm">Low Attendance Warning ({stats.attendance_rate}%)</h4>
              <p className="text-xs mt-0.5">
                Your attendance has fallen below the mandatory institutional requirement of 75%. You must attend at least{' '}
                <span className="font-extrabold underline">{stats.lectures_needed_for_75} consecutive lectures</span> to recover to good standing.
              </p>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border border-border/40">
            <CardHeader className="flex flex-row items-center justify-between pb-2 mb-0">
              <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Attendance Rate
              </CardDescription>
              <Percent size={18} className="text-primary" />
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-extrabold ${stats?.is_low_attendance ? 'text-destructive' : 'text-foreground'}`}>
                {stats?.attendance_rate}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">Required: 75% minimum</p>
            </CardContent>
          </Card>

          <Card className="border border-border/40">
            <CardHeader className="flex flex-row items-center justify-between pb-2 mb-0">
              <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Classes Present
              </CardDescription>
              <CheckCircle size={18} className="text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold text-emerald-500">{stats?.present_count}</div>
              <p className="text-xs text-muted-foreground mt-1">Confirmed by AI surveillance</p>
            </CardContent>
          </Card>

          <Card className="border border-border/40">
            <CardHeader className="flex flex-row items-center justify-between pb-2 mb-0">
              <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Absences Logged
              </CardDescription>
              <AlertTriangle size={18} className="text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold text-destructive">{stats?.absent_count}</div>
              <p className="text-xs text-muted-foreground mt-1">Dispute request available below</p>
            </CardContent>
          </Card>

          <Card className="border border-border/40">
            <CardHeader className="flex flex-row items-center justify-between pb-2 mb-0">
              <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Total Classes
              </CardDescription>
              <BookOpen size={18} className="text-indigo-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold">{stats?.total_classes}</div>
              <p className="text-xs text-muted-foreground mt-1">Current semester curriculum</p>
            </CardContent>
          </Card>
        </div>

        {/* Dashboard Visual Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Attendance Chart */}
          <Card className="lg:col-span-1 border border-border/40 flex flex-col justify-between">
            <CardHeader>
              <CardTitle>Attendance Distribution</CardTitle>
              <CardDescription>Visual comparison of present vs absent ratios</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(15, 23, 42, 0.95)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
            <div className="pb-6 px-6 flex justify-around text-sm">
              <span className="flex items-center gap-1.5 font-medium"><span className="w-3 h-3 rounded bg-indigo-500"></span> Attended</span>
              <span className="flex items-center gap-1.5 font-medium"><span className="w-3 h-3 rounded bg-red-500"></span> Absent</span>
            </div>
          </Card>

          {/* Real Subject Attendance Breakdown */}
          <Card className="lg:col-span-2 border border-border/40">
            <CardHeader>
              <CardTitle>Subject-wise Attendance Breakdown</CardTitle>
              <CardDescription>Live attendance percentages calculated from database</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {(stats?.subject_wise || []).map((subj: any) => (
                <div key={subj.subject_id} className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <BookOpen size={16} className="text-primary" /> {subj.name} ({subj.code})
                    </span>
                    <span className={`font-bold ${subj.percentage < 75 ? 'text-destructive' : 'text-emerald-500'}`}>
                      {subj.percentage}% ({subj.present + subj.late}/{subj.total})
                    </span>
                  </div>
                  <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden border border-border/50">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(subj.percentage, 100)}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className={`h-full rounded-full ${subj.percentage >= 75 ? 'bg-indigo-500' : 'bg-red-500'}`}
                    />
                  </div>
                </div>
              ))}
              {(!stats?.subject_wise || stats.subject_wise.length === 0) && (
                <p className="text-xs text-muted-foreground text-center py-8">No subject attendance recorded yet.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Timetable and Recent Logs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Today's Timetable */}
          <Card className="lg:col-span-2 border border-border/40">
            <CardHeader>
              <CardTitle>Academic Weekly Timetable</CardTitle>
              <CardDescription>Your assigned classroom schedule from the timetable system</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wider font-semibold">
                    <th className="pb-3">Day</th>
                    <th className="pb-3">Subject</th>
                    <th className="pb-3">Classroom</th>
                    <th className="pb-3">Time</th>
                    <th className="pb-3">Faculty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {timetable.map((t, idx) => {
                    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
                    return (
                      <tr key={idx} className="hover:bg-accent/20 transition-all">
                        <td className="py-3 font-semibold text-primary">{days[t.day_of_week] || 'Weekly'}</td>
                        <td className="py-3 font-bold text-foreground">{t.subject?.name} ({t.subject?.code})</td>
                        <td className="py-3 text-muted-foreground">{t.classroom?.name || t.classroom || 'Main Hall'}</td>
                        <td className="py-3 text-muted-foreground flex items-center gap-1.5">
                          <Clock size={13} /> {t.start_time} - {t.end_time}
                        </td>
                        <td className="py-3 text-muted-foreground">{t.teacher?.user?.name || 'Faculty'}</td>
                      </tr>
                    );
                  })}
                  {timetable.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-xs text-muted-foreground">
                        No published timetable entries found for your division.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Lecture Attendance History with Dispute Trigger */}
          <Card className="lg:col-span-1 border border-border/40">
            <CardHeader>
              <CardTitle>Attendance History</CardTitle>
              <CardDescription>Recent lecture logs & dispute resolution</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {attendance.slice(0, 5).map((a, idx) => (
                <div key={idx} className="flex flex-col gap-1.5 p-3 rounded-xl border border-border bg-background/40">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-foreground">
                      {a.lecture_session?.subject?.code || a.subject?.code || 'CS401'}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      a.status === 'Present' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                      a.status === 'Late' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                      'bg-red-500/10 text-red-500 border border-red-500/20'
                    }`}>
                      {a.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Observed: {a.intervals_observed || 0}/{a.total_eligible_intervals || 10} intervals ({Math.round((a.presence_ratio || 0)*100)}%)
                  </p>
                  {a.status === 'Absent' && (
                    <button
                      onClick={() => {
                        setSelectedAttId(a.id);
                        setDisputeOpen(true);
                      }}
                      className="self-start text-[10px] text-primary hover:underline font-semibold mt-1"
                    >
                      Raise Dispute / Correction Request
                    </button>
                  )}
                </div>
              ))}
              {attendance.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">No lecture logs found.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dispute Modal */}
      {disputeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setDisputeOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X size={18} />
            </button>
            <h3 className="text-lg font-bold text-foreground">Raise Attendance Dispute</h3>
            <p className="text-xs text-muted-foreground">
              Submit an official attendance correction request to the subject faculty. Please provide a clear justification.
            </p>

            {disputeSuccess ? (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-lg text-xs font-semibold">
                {disputeSuccess}
              </div>
            ) : (
              <form onSubmit={handleRaiseDispute} className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Reason for Absence Dispute</label>
                  <textarea
                    required
                    rows={3}
                    value={disputeReason}
                    onChange={(e) => setDisputeReason(e.target.value)}
                    placeholder="e.g., I was present in the back row during interval 2-4, or medical leave document attached."
                    className="w-full text-xs p-2.5 rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setDisputeOpen(false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:bg-accent"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={disputeSubmitting}
                    className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 shadow"
                  >
                    <Send size={12} /> {disputeSubmitting ? 'Submitting...' : 'Submit Dispute'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
