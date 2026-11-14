'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { api } from '@/utils/api';
import { CheckCircle, AlertTriangle, Clock } from 'lucide-react';

export default function StudentAttendancePage() {
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getStudentAttendance().then(setAttendance).finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">My Attendance History</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Detailed log of all classroom check-ins recorded by surveillance cameras.
          </p>
        </div>

        {loading ? (
          <div className="h-48 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : (
          <Card className="border border-border/40">
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-border bg-accent/20 text-muted-foreground text-xs uppercase font-semibold tracking-wider">
                    <th className="p-4">Date & Time</th>
                    <th className="p-4">Subject</th>
                    <th className="p-4">Verification Location</th>
                    <th className="p-4">Confidence</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {attendance.map((a) => (
                    <tr key={a.id} className="hover:bg-accent/10 transition-all">
                      <td className="p-4 font-semibold">{new Date(a.timestamp).toLocaleString()}</td>
                      <td className="p-4 font-bold">{a.subject.name} ({a.subject.code})</td>
                      <td className="p-4 text-muted-foreground">{a.camera?.name || 'Manual Override'} ({a.camera?.location || 'Faculty Room'})</td>
                      <td className="p-4 font-mono font-semibold text-muted-foreground">
                        {a.status !== 'Absent' ? `${Math.round(a.confidence_score * 100)}%` : '—'}
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          a.status === 'Present'
                            ? 'bg-success/10 text-success'
                            : a.status === 'Late'
                            ? 'bg-warning/10 text-warning'
                            : 'bg-destructive/10 text-destructive'
                        }`}>
                          {a.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {attendance.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-muted-foreground">No attendance records found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
