import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { Download, FileText, Search, ShieldAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { getAuditLog } from "../hooks/useEmailAuth";
import type { AuditLogEntry } from "../hooks/useEmailAuth";

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-amber-100 text-amber-800",
  doctor: "bg-blue-100 text-blue-800",
  staff: "bg-purple-100 text-purple-800",
  patient: "bg-teal-100 text-teal-800",
};

export default function AuditLog() {
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const allLogs = useMemo(() => {
    const logs = getAuditLog();
    return [...logs].reverse(); // newest first
  }, []);

  const filtered = useMemo(() => {
    return allLogs.filter((log) => {
      if (search) {
        const q = search.toLowerCase();
        if (
          !log.userName.toLowerCase().includes(q) &&
          !log.action.toLowerCase().includes(q) &&
          !log.target.toLowerCase().includes(q)
        )
          return false;
      }
      if (fromDate) {
        if (new Date(log.timestamp) < new Date(fromDate)) return false;
      }
      if (toDate) {
        if (new Date(log.timestamp) > new Date(`${toDate}T23:59:59`))
          return false;
      }
      return true;
    });
  }, [allLogs, search, fromDate, toDate]);

  const exportCSV = () => {
    const header = "Timestamp,User,Role,Action,Target";
    const rows = filtered.map(
      (log) =>
        `"${log.timestamp}","${log.userName}","${log.userRole}","${log.action}","${log.target}"`,
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="max-w-6xl mx-auto p-4 sm:p-6 space-y-5"
      data-ocid="audit_log.page"
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
          <ShieldAlert className="w-5 h-5 text-amber-700" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Audit Log</h1>
          <p className="text-sm text-muted-foreground">
            {allLogs.length} total entries
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-48 space-y-1">
          <label
            htmlFor="audit-search"
            className="text-xs font-medium text-muted-foreground"
          >
            Search
          </label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input
              id="audit-search"
              placeholder="User, action, or target..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-ocid="audit_log.search_input"
            />
          </div>
        </div>
        <div className="space-y-1">
          <label
            htmlFor="audit-from"
            className="text-xs font-medium text-muted-foreground"
          >
            From Date
          </label>
          <Input
            id="audit-from"
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-40"
          />
        </div>
        <div className="space-y-1">
          <label
            htmlFor="audit-to"
            className="text-xs font-medium text-muted-foreground"
          >
            To Date
          </label>
          <Input
            id="audit-to"
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-40"
          />
        </div>
        <Button
          variant="outline"
          onClick={exportCSV}
          className="gap-2"
          data-ocid="audit_log.button"
        >
          <Download className="w-4 h-4" /> Export CSV
        </Button>
      </div>

      {/* Table */}
      <div
        className="bg-card border border-border rounded-xl overflow-hidden"
        data-ocid="audit_log.table"
      >
        {filtered.length === 0 ? (
          <div className="text-center py-16" data-ocid="audit_log.empty_state">
            <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No log entries found</p>
          </div>
        ) : (
          <ScrollArea className="h-[60vh]">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="font-semibold">Timestamp</TableHead>
                  <TableHead className="font-semibold">User</TableHead>
                  <TableHead className="font-semibold">Role</TableHead>
                  <TableHead className="font-semibold">Action</TableHead>
                  <TableHead className="font-semibold">Target</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((log, idx) => (
                  <TableRow
                    key={log.id}
                    data-ocid={`audit_log.item.${idx + 1}`}
                  >
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(log.timestamp), "MMM d, yyyy HH:mm:ss")}
                    </TableCell>
                    <TableCell className="font-medium text-sm">
                      {log.userName}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`text-xs border-0 ${ROLE_COLORS[log.userRole] ?? "bg-gray-100 text-gray-700"}`}
                      >
                        {log.userRole}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{log.action}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {log.target}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
