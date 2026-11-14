'use client';

import React from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';

export default function AdminAnalyticsPage() {
  const systemMetrics = [
    { name: '09:00', CPU: 42, Memory: 60, Network: 120 },
    { name: '10:00', CPU: 78, Memory: 62, Network: 340 },
    { name: '11:00', CPU: 52, Memory: 65, Network: 280 },
    { name: '12:00', CPU: 38, Memory: 61, Network: 190 },
    { name: '13:00', CPU: 89, Memory: 75, Network: 410 },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">System & AI Network Analytics</h1>
          <p className="text-muted-foreground text-sm mt-1">Real-time performance monitoring of local face detection servers.</p>
        </div>

        <Card className="border border-border/40">
          <CardHeader>
            <CardTitle>Hardware Load Statistics</CardTitle>
            <CardDescription>Visualizing CPU, Memory, and RTSP stream pipeline volumes.</CardDescription>
          </CardHeader>
          <CardContent className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={systemMetrics}>
                <defs>
                  <linearGradient id="colorCPU" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" stroke="#64748B" fontSize={11} />
                <YAxis stroke="#64748B" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(15, 23, 42, 0.95)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
                <Area type="monotone" dataKey="CPU" stroke="#3B82F6" fillOpacity={1} fill="url(#colorCPU)" strokeWidth={2} name="CPU Load (%)" />
                <Area type="monotone" dataKey="Network" stroke="#8B5CF6" fillOpacity={1} fill="url(#colorNet)" strokeWidth={2} name="Network (Kbps)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
