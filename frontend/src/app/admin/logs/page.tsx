'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { api } from '@/utils/api';

export default function AdminLogsPage() {
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAuditLogs().then(setAuditLogs).finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Security Audit Logs</h1>
          <p className="text-muted-foreground text-sm mt-1">Immutability ledger tracking override actions and security events.</p>
        </div>

        {loading ? (
          <div className="h-48 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : (
          <Card className="border border-border/40">
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-accent/20 border-b border-border text-muted-foreground font-semibold">
                    <th className="p-4">Action Type</th>
                    <th className="p-4">Details</th>
                    <th className="p-4">IP Address</th>
                    <th className="p-4">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {auditLogs.map(log => (
                    <tr key={log.id} className="hover:bg-accent/10 font-mono">
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          {log.action}
                        </span>
                      </td>
                      <td className="p-4 text-muted-foreground font-sans font-semibold">{log.details}</td>
                      <td className="p-4 text-muted-foreground">{log.ip_address}</td>
                      <td className="p-4 text-muted-foreground">{new Date(log.timestamp).toLocaleString()}</td>
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
