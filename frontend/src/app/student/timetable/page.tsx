'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { api } from '@/utils/api';
import { Clock, MapPin, User } from 'lucide-react';

export default function StudentTimetablePage() {
  const [timetable, setTimetable] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getStudentTimetable().then(setTimetable).finally(() => setLoading(false));
  }, []);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Academic Timetable</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Weekly class sessions schedule and classroom locations.
          </p>
        </div>

        {loading ? (
          <div className="h-48 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {days.map((dayName, dayIdx) => {
              const classesForDay = timetable.filter(t => t.day_of_week === dayIdx);
              return (
                <Card key={dayName} className="border border-border/40">
                  <CardHeader className="border-b border-border/60 pb-3 mb-3 bg-accent/10 rounded-t-2xl">
                    <CardTitle className="text-md font-bold">{dayName}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-1">
                    {classesForDay.map((c, idx) => (
                      <div key={idx} className="p-3 rounded-xl border border-border bg-background/20 space-y-2">
                        <div className="font-bold text-sm text-foreground">{c.subject.name}</div>
                        <div className="text-xs text-muted-foreground font-semibold">{c.subject.code}</div>
                        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1.5"><Clock size={12} /> {c.start_time} - {c.end_time}</span>
                          <span className="flex items-center gap-1.5"><MapPin size={12} /> {c.classroom}</span>
                          <span className="flex items-center gap-1.5"><User size={12} /> {c.teacher.user.name}</span>
                        </div>
                      </div>
                    ))}
                    {classesForDay.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-6">No classes scheduled.</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
