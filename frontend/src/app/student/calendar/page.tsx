'use client';

import React from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { CalendarDays } from 'lucide-react';

export default function StudentCalendarPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Attendance Calendar</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Visual calendar tracker highlighting present (green) and absent (red) days.
          </p>
        </div>

        <Card className="border border-border/40">
          <CardHeader>
            <CardTitle>July 2026</CardTitle>
            <CardDescription>Biometric Check-in Overview</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center p-6 space-y-6">
            <div className="grid grid-cols-7 gap-2 w-full max-w-lg text-center text-xs font-semibold">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="text-muted-foreground py-1">{d}</div>
              ))}
              {/* Padding for first days */}
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={`pad-${i}`} className="py-3"></div>
              ))}
              {/* Days of July 2026 */}
              {Array.from({ length: 31 }).map((_, i) => {
                const day = i + 1;
                // Mock present/absent states
                const isPresent = [1, 2, 6, 8, 9, 13, 15, 16, 20, 22, 23, 27].includes(day);
                const isAbsent = [7, 14, 21].includes(day);
                const isWeekend = [4, 5, 11, 12, 18, 19, 25, 26].includes(day);
                
                let bgClass = 'bg-background/20 hover:bg-accent/40 border border-border';
                let textClass = 'text-foreground';
                if (isPresent) {
                  bgClass = 'bg-success/15 border-success/35 text-success font-bold';
                } else if (isAbsent) {
                  bgClass = 'bg-destructive/15 border-destructive/35 text-destructive font-bold';
                } else if (isWeekend) {
                  textClass = 'text-muted-foreground';
                  bgClass = 'bg-accent/10 border-transparent';
                }

                return (
                  <div
                    key={day}
                    className={`py-3 rounded-lg flex items-center justify-center transition-all ${bgClass} ${textClass}`}
                  >
                    {day}
                  </div>
                );
              })}
            </div>

            <div className="flex gap-6 text-xs text-muted-foreground font-semibold pt-4 border-t border-border w-full max-w-lg justify-around">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-success/20 border border-success/40"></span> Present</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-destructive/20 border border-destructive/40"></span> Absent</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-accent/10"></span> Scheduled Class</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
