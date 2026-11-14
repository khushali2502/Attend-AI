'use client';

import React from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Lock, Bell } from 'lucide-react';

export default function TeacherSettingsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl mx-auto">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Faculty Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">Configure your teacher preferences and camera alert thresholds.</p>
        </div>

        <Card className="border border-border/40">
          <CardHeader>
            <CardTitle>System & Account Preferences</CardTitle>
            <CardDescription>Configure portal metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <h4 className="text-sm font-bold flex items-center gap-2 text-foreground"><Lock size={16} /> Security</h4>
              <div className="space-y-3">
                <input type="password" placeholder="Current Password" className="w-full px-4 py-2.5 glass-input text-xs" />
                <input type="password" placeholder="New Password" className="w-full px-4 py-2.5 glass-input text-xs" />
                <button className="px-4 py-2 text-xs font-bold text-white bg-primary rounded-xl hover:bg-primary/95 transition-all shadow-md">
                  Update Security Credentials
                </button>
              </div>
            </div>

            <hr className="border-border/60" />

            <div className="space-y-3">
              <h4 className="text-sm font-bold flex items-center gap-2 text-foreground"><Bell size={16} /> Surveillance Alerts</h4>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Alert me immediately on unknown persons</span>
                <input type="checkbox" defaultChecked className="w-4 h-4 rounded text-primary focus:ring-primary" />
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Confidence Threshold (Alert below 70%)</span>
                <input type="range" min="50" max="95" defaultValue="70" className="w-24 accent-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
