'use client';

import React from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { FileDown, CalendarDays } from 'lucide-react';

export default function StudentReportPage() {
  const downloadReport = () => {
    window.open('http://localhost:8000/api/reports/pdf', '_blank');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-xl mx-auto">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Attendance Reports</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Generate and download formatted PDF or Excel summaries for your semester log.
          </p>
        </div>

        <Card className="border border-border/40 text-center p-8 space-y-5">
          <div className="mx-auto w-12 h-12 bg-primary/10 text-primary border border-primary/20 rounded-full flex items-center justify-center">
            <CalendarDays size={20} />
          </div>
          <div>
            <CardTitle>Attendance Report Summary</CardTitle>
            <CardDescription className="mt-1">
              Select date ranges and download formatted records suitable for university submissions.
            </CardDescription>
          </div>

          <div className="space-y-3 max-w-sm mx-auto pt-2">
            <div className="flex gap-2">
              <input type="date" defaultValue="2026-07-01" className="w-full px-3 py-2 border border-border bg-background/50 rounded-xl text-xs outline-none" />
              <input type="date" defaultValue="2026-07-31" className="w-full px-3 py-2 border border-border bg-background/50 rounded-xl text-xs outline-none" />
            </div>
            <button
              onClick={downloadReport}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs tracking-wide shadow-md transition-all active:scale-95"
            >
              <FileDown size={14} /> Download PDF Attendance sheet
            </button>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
