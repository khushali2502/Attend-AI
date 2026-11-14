'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { api } from '@/utils/api';
import { Search, Filter, CheckCircle } from 'lucide-react';

export default function TeacherVerifyPage() {
  const [attendance, setAttendance] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:8000/api/attendance', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    }).then(r => r.json())
      .then(setAttendance)
      .catch(async () => {
        // Fallback
        const students = await api.getTeacherStudents();
        setAttendance([
          { id: 1, student: students[0], subject: { name: 'Artificial Intelligence', code: 'CS401' }, timestamp: new Date().toISOString(), status: 'Present', confidence_score: 0.98, verification_method: 'AI' },
          { id: 2, student: students[1], subject: { name: 'Artificial Intelligence', code: 'CS401' }, timestamp: new Date().toISOString(), status: 'Present', confidence_score: 0.95, verification_method: 'AI' },
          { id: 3, student: students[2], subject: { name: 'Artificial Intelligence', code: 'CS401' }, timestamp: new Date().toISOString(), status: 'Absent', confidence_score: 0.0, verification_method: 'Manual' },
        ]);
      })
      .finally(() => setLoading(false));
  }, []);

  const toggleAttendanceStatus = async (recordId: number, currentStatus: string) => {
    const nextStatus = currentStatus === 'Present' ? 'Absent' : currentStatus === 'Absent' ? 'Late' : 'Present';
    try {
      await api.correctAttendance(recordId, nextStatus);
      setAttendance(prev => prev.map(a => a.id === recordId ? { ...a, status: nextStatus, verification_method: 'Manual' } : a));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Manual Verification & Override</h1>
          <p className="text-muted-foreground text-sm mt-1">Review live check-in logs and toggle/override student status.</p>
        </div>

        <Card className="border border-border/40 p-4">
          <div className="flex gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search size={16} className="absolute left-3 top-2.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search roll or student..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-border rounded-xl bg-background/50 text-sm outline-none"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-border rounded-xl bg-background/50 text-sm outline-none text-muted-foreground"
            >
              <option value="All">All Statuses</option>
              <option value="Present">Present</option>
              <option value="Absent">Absent</option>
              <option value="Late">Late</option>
            </select>
          </div>
        </Card>

        {loading ? (
          <div className="h-48 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : (
          <Card className="border border-border/40">
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-border bg-accent/20 text-muted-foreground text-xs uppercase font-semibold">
                    <th className="p-4">Roll Number</th>
                    <th className="p-4">Student Name</th>
                    <th className="p-4">Time Logged</th>
                    <th className="p-4">Confidence</th>
                    <th className="p-4">Method</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {attendance
                    .filter(a => {
                      const matchSearch = a.student.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        a.student.roll_number.toLowerCase().includes(searchTerm.toLowerCase());
                      const matchStatus = statusFilter === 'All' || a.status === statusFilter;
                      return matchSearch && matchStatus;
                    })
                    .map(a => (
                      <tr key={a.id} className="hover:bg-accent/10">
                        <td className="p-4 font-mono font-semibold text-xs text-muted-foreground">{a.student.roll_number}</td>
                        <td className="p-4 font-bold">{a.student.user.name}</td>
                        <td className="p-4 text-xs text-muted-foreground">{new Date(a.timestamp).toLocaleString()}</td>
                        <td className="p-4 text-xs font-semibold">{a.status !== 'Absent' ? `${Math.round(a.confidence_score * 100)}%` : '—'}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${a.verification_method === 'AI' ? 'bg-blue-500/10 border-blue-500/20 text-blue-500' : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500'}`}>
                            {a.verification_method}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${a.status === 'Present' ? 'bg-success/15 text-success' : a.status === 'Late' ? 'bg-warning/15 text-warning' : 'bg-destructive/15 text-destructive'}`}>
                            {a.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => toggleAttendanceStatus(a.id, a.status)}
                            className="px-3 py-1 bg-background/50 hover:bg-accent border border-border rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground"
                          >
                            Toggle Override
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
