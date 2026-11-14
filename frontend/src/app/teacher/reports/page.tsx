'use client';

import React from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { FileDown, Users } from 'lucide-react';

export default function TeacherReportsPage() {
  const exportPDF = () => { window.open('http://localhost:8000/api/reports/pdf', '_blank'); };
  const exportExcel = () => { window.open('http://localhost:8000/api/reports/excel', '_blank'); };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-xl mx-auto">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Academic Reports</h1>
          <p className="text-muted-foreground text-sm mt-1">Generate and export class attendance logs for reviews.</p>
        </div>

        <Card className="border border-border/40 text-center p-8 space-y-4">
          <div className="mx-auto w-12 h-12 bg-primary/10 text-primary border border-primary/20 rounded-full flex items-center justify-center">
            <Users size={20} />
          </div>
          <div>
            <CardTitle>Attendance Log Exports</CardTitle>
            <CardDescription className="mt-1">
              Select date ranges and download formatted records suitable for administrative verification.
            </CardDescription>
          </div>

          <div className="space-y-3 max-w-sm mx-auto pt-2">
            <div className="flex gap-2">
              <input type="date" defaultValue="2026-07-01" className="w-full px-3 py-2 border border-border bg-background/50 rounded-xl text-xs outline-none" />
              <input type="date" defaultValue="2026-07-31" className="w-full px-3 py-2 border border-border bg-background/50 rounded-xl text-xs outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={exportPDF}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-border bg-background/20 hover:bg-accent text-xs font-bold transition-all active:scale-95"
              >
                <FileDown size={14} /> PDF Report
              </button>
              <button
                onClick={exportExcel}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-border bg-background/20 hover:bg-accent text-xs font-bold transition-all active:scale-95"
              >
                <FileDown size={14} /> Excel Sheet
              </button>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
