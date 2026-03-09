// ============================================================
// ORIGINAL CODE — DO NOT EDIT (kept for reference)
// ============================================================

// import { useState } from 'react';
// import { Search, ArrowUpDown, TrendingUp, TrendingDown, User } from 'lucide-react';
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// import { Input } from '@/components/ui/input';
// import { Button } from '@/components/ui/button';
// import { Badge } from '@/components/ui/badge';
// import {
//   ChartContainer,
//   ChartTooltip,
//   ChartTooltipContent,
// } from '@/components/ui/chart';
// import {
//   BarChart,
//   Bar,
//   XAxis,
//   YAxis,
//   CartesianGrid,
// } from 'recharts';

// // Dummy user data
// const userData = [
//   { id: 1, name: 'John Smith', email: 'john.smith@company.com', credits: 856.40, requests: 2840, topModel: 'ChatGPT', overrides: 3, status: 'active' },
//   { id: 2, name: 'Sarah Johnson', email: 'sarah.j@company.com', credits: 724.20, requests: 2150, topModel: 'JupiterBrains', overrides: 0, status: 'active' },
//   { id: 3, name: 'Michael Brown', email: 'm.brown@company.com', credits: 645.80, requests: 1980, topModel: 'Claude', overrides: 5, status: 'warning' },
//   { id: 4, name: 'Emily Davis', email: 'emily.d@company.com', credits: 523.60, requests: 1650, topModel: 'ChatGPT', overrides: 1, status: 'active' },
//   { id: 5, name: 'David Wilson', email: 'd.wilson@company.com', credits: 489.30, requests: 1420, topModel: 'Gemini', overrides: 8, status: 'warning' },
//   { id: 6, name: 'Lisa Anderson', email: 'lisa.a@company.com', credits: 456.70, requests: 1380, topModel: 'JupiterBrains', overrides: 0, status: 'active' },
//   { id: 7, name: 'James Taylor', email: 'james.t@company.com', credits: 398.20, requests: 1200, topModel: 'Claude', overrides: 2, status: 'active' },
//   { id: 8, name: 'Jennifer Martinez', email: 'j.martinez@company.com', credits: 367.90, requests: 1100, topModel: 'ChatGPT', overrides: 0, status: 'active' },
// ];

// const topUsersChartData = userData.slice(0, 5).map(user => ({
//   name: user.name.split(' ')[0],
//   credits: user.credits,
// }));

// const chartConfig = {
//   credits: {
//     label: 'Credits ($)',
//     color: 'hsl(0, 0%, 40%)',
//   },
// };

// export function UserBreakdown() {
//   const [searchQuery, setSearchQuery] = useState('');
//   const [sortField, setSortField] = useState<'credits' | 'requests' | 'overrides'>('credits');
//   const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

//   const filteredUsers = userData
//     .filter(user =>
//       user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
//       user.email.toLowerCase().includes(searchQuery.toLowerCase())
//     )
//     .sort((a, b) => {
//       const multiplier = sortDirection === 'asc' ? 1 : -1;
//       return (a[sortField] - b[sortField]) * multiplier;
//     });

//   const handleSort = (field: 'credits' | 'requests' | 'overrides') => {
//     if (sortField === field) {
//       setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
//     } else {
//       setSortField(field);
//       setSortDirection('desc');
//     }
//   };

//   const totalCredits = userData.reduce((sum, user) => sum + user.credits, 0);
//   const avgCreditsPerUser = totalCredits / userData.length;
//   const totalOverrides = userData.reduce((sum, user) => sum + user.overrides, 0);

//   return (
//     <div className="space-y-6">
//       {/* Summary Cards */}
//       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//         <Card className="bg-card border-border">
//           <CardContent className="pt-6">
//             <div className="flex items-center justify-between">
//               <div>
//                 <p className="text-sm text-muted-foreground">Total Users</p>
//                 <p className="text-2xl font-bold">{userData.length}</p>
//               </div>
//               <User className="h-8 w-8 text-muted-foreground" />
//             </div>
//           </CardContent>
//         </Card>
//         <Card className="bg-card border-border">
//           <CardContent className="pt-6">
//             <div>
//               <p className="text-sm text-muted-foreground">Avg. Credits/User</p>
//               <p className="text-2xl font-bold">${avgCreditsPerUser.toFixed(2)}</p>
//             </div>
//           </CardContent>
//         </Card>
//         <Card className="bg-card border-border">
//           <CardContent className="pt-6">
//             <div>
//               <p className="text-sm text-muted-foreground">Total IP Overrides</p>
//               <p className="text-2xl font-bold">{totalOverrides}</p>
//             </div>
//           </CardContent>
//         </Card>
//       </div>

//       {/* Top Users Chart */}
//       <Card className="bg-card border-border">
//         <CardHeader>
//           <CardTitle className="text-lg">Top Users by Credit Usage</CardTitle>
//           <CardDescription>Top 5 users consuming the most credits</CardDescription>
//         </CardHeader>
//         <CardContent>
//           <ChartContainer config={chartConfig} className="h-[200px]">
//             <BarChart data={topUsersChartData}>
//               <CartesianGrid strokeDasharray="3 3" stroke="hsl(0, 0%, 20%)" />
//               <XAxis dataKey="name" stroke="hsl(0, 0%, 50%)" />
//               <YAxis stroke="hsl(0, 0%, 50%)" />
//               <ChartTooltip content={<ChartTooltipContent />} />
//               <Bar dataKey="credits" fill="hsl(0, 0%, 45%)" radius={[4, 4, 0, 0]} />
//             </BarChart>
//           </ChartContainer>
//         </CardContent>
//       </Card>

//       {/* User Table */}
//       <Card className="bg-card border-border">
//         <CardHeader>
//           <CardTitle className="text-lg">User Details</CardTitle>
//           <CardDescription>Complete breakdown of user activity</CardDescription>
//         </CardHeader>
//         <CardContent>
//           {/* Search */}
//           <div className="relative mb-4">
//             <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
//             <Input
//               placeholder="Search users..."
//               value={searchQuery}
//               onChange={(e) => setSearchQuery(e.target.value)}
//               className="pl-9 bg-background"
//             />
//           </div>

//           {/* Table */}
//           <div className="overflow-x-auto">
//             <table className="w-full">
//               <thead>
//                 <tr className="border-b border-border">
//                   <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">User</th>
//                   <th className="text-left py-3 px-2">
//                     <Button
//                       variant="ghost"
//                       size="sm"
//                       className="h-auto p-0 text-sm font-medium text-muted-foreground hover:text-foreground"
//                       onClick={() => handleSort('credits')}
//                     >
//                       Credits
//                       <ArrowUpDown className="ml-1 h-3 w-3" />
//                     </Button>
//                   </th>
//                   <th className="text-left py-3 px-2">
//                     <Button
//                       variant="ghost"
//                       size="sm"
//                       className="h-auto p-0 text-sm font-medium text-muted-foreground hover:text-foreground"
//                       onClick={() => handleSort('requests')}
//                     >
//                       Requests
//                       <ArrowUpDown className="ml-1 h-3 w-3" />
//                     </Button>
//                   </th>
//                   <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Top Model</th>
//                   <th className="text-left py-3 px-2">
//                     <Button
//                       variant="ghost"
//                       size="sm"
//                       className="h-auto p-0 text-sm font-medium text-muted-foreground hover:text-foreground"
//                       onClick={() => handleSort('overrides')}
//                     >
//                       Overrides
//                       <ArrowUpDown className="ml-1 h-3 w-3" />
//                     </Button>
//                   </th>
//                   <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Status</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {filteredUsers.map((user) => (
//                   <tr key={user.id} className="border-b border-border/50 hover:bg-accent/30">
//                     <td className="py-3 px-2">
//                       <div>
//                         <div className="font-medium">{user.name}</div>
//                         <div className="text-xs text-muted-foreground">{user.email}</div>
//                       </div>
//                     </td>
//                     <td className="py-3 px-2 font-medium">${user.credits.toFixed(2)}</td>
//                     <td className="py-3 px-2">{user.requests.toLocaleString()}</td>
//                     <td className="py-3 px-2">
//                       <Badge variant="secondary">{user.topModel}</Badge>
//                     </td>
//                     <td className="py-3 px-2">
//                       <span className={user.overrides > 3 ? 'text-red-500 font-medium' : ''}>
//                         {user.overrides}
//                       </span>
//                     </td>
//                     <td className="py-3 px-2">
//                       <Badge variant={user.status === 'warning' ? 'destructive' : 'default'}>
//                         {user.status}
//                       </Badge>
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         </CardContent>
//       </Card>
//     </div>
//   );
// }

// ============================================================
// DUPLICATE — EDIT THIS COPY
// ============================================================

import { useState, useRef, useEffect } from 'react';
import { Search, ArrowUpDown, TrendingUp, TrendingDown, User, SlidersHorizontal, ChevronDown, Check, Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { API_ENDPOINTS, getStoredBearerToken } from '@/utils/config';

// Dummy user data
const userData = [
  { id: 1, name: 'John Smith', email: 'john.smith@company.com', credits: 856.40, tokenUsage: 142500, modelUsage: 38, topModel: 'ChatGPT', overrides: 3, status: 'active' },
  { id: 2, name: 'Sarah Johnson', email: 'sarah.j@company.com', credits: 724.20, tokenUsage: 118200, modelUsage: 29, topModel: 'JupiterBrains', overrides: 0, status: 'active' },
  { id: 3, name: 'Michael Brown', email: 'm.brown@company.com', credits: 645.80, tokenUsage: 99000, modelUsage: 45, topModel: 'Claude', overrides: 5, status: 'warning' },
  { id: 4, name: 'Emily Davis', email: 'emily.d@company.com', credits: 523.60, tokenUsage: 82500, modelUsage: 21, topModel: 'ChatGPT', overrides: 1, status: 'active' },
  { id: 5, name: 'David Wilson', email: 'd.wilson@company.com', credits: 489.30, tokenUsage: 71000, modelUsage: 52, topModel: 'Gemini', overrides: 8, status: 'warning' },
  { id: 6, name: 'Lisa Anderson', email: 'lisa.a@company.com', credits: 456.70, tokenUsage: 69000, modelUsage: 17, topModel: 'JupiterBrains', overrides: 0, status: 'active' },
  { id: 7, name: 'James Taylor', email: 'james.t@company.com', credits: 398.20, tokenUsage: 60000, modelUsage: 24, topModel: 'Claude', overrides: 2, status: 'active' },
  { id: 8, name: 'Jennifer Martinez', email: 'j.martinez@company.com', credits: 367.90, tokenUsage: 55000, modelUsage: 13, topModel: 'ChatGPT', overrides: 0, status: 'active' },
];

const topUsersChartData = userData.slice(0, 5).map(user => ({
  name: user.name.split(' ')[0],
  credits: user.credits,
}));

const chartConfig = {
  credits: {
    label: 'Credits ($)',
    color: 'hsl(0, 0%, 40%)',
  },
};

type FilterOption = {
  id: string;
  label: string;
  icon: string;
};

const filterOptions: FilterOption[] = [
  { id: 'all', label: 'All Users', icon: '👥' },
  { id: 'overview', label: 'Overview', icon: '🗂️' },
  { id: 'modelShare', label: 'Models Overview', icon: '🥧' },
  { id: 'requestTypes', label: 'Request Types', icon: '🗂️' },
  { id: 'dailyTimeline', label: 'Daily Usage', icon: '�' },
];


// Filters that hit the real backend (add more IDs here as APIs are built)
const API_BACKED_FILTERS = new Set(['overview', 'all', 'modelShare', 'requestTypes', 'dailyTimeline']);

// Preset limit options for the All Users filter
const LIMIT_OPTIONS = [5, 10, 25, 50];

/** snake_case / camelCase → Title Case with spaces */
function formatColumnHeader(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, c => c.toUpperCase());
}

/** Detect if a number looks like a Unix timestamp (seconds, year 2000–2100) */
function isUnixTimestamp(v: number): boolean {
  return v > 946684800 && v < 4102444800;
}

/** Render a cell value nicely */
function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'number') {
    if (isUnixTimestamp(value)) {
      return new Date(value * 1000).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    }
    return value.toLocaleString();
  }
  return String(value);
}

export function UserBreakdown() {
  // Mock-data table state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'credits' | 'tokenUsage' | 'modelUsage' | 'overrides'>('credits');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Filter dropdown
  const [activeFilter, setActiveFilter] = useState('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  // Limit states
  const [userStatsLimit, setUserStatsLimit] = useState(10);
  const [limitInput, setLimitInput] = useState('10');

  // API state
  const [apiRows, setApiRows] = useState<Record<string, unknown>[]>([]);
  const [apiColumns, setApiColumns] = useState<string[]>([]);
  const [apiTotalRecords, setApiTotalRecords] = useState(0);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Fetch from API whenever active filter or limit changes
  useEffect(() => {
    if (!API_BACKED_FILTERS.has(activeFilter)) {
      setApiRows([]);
      setApiColumns([]);
      setApiError(null);
      return;
    }

    const fetchFilterData = async () => {
      setApiLoading(true);
      setApiError(null);
      setApiRows([]);
      setApiColumns([]);
      try {
        const token = getStoredBearerToken();

        // Build payload — each filter can have its own query_type + filters shape
        let query: { query_type: string; filters: Record<string, unknown>;[key: string]: unknown };
        if (activeFilter === 'all') {
          query = { query_type: 'user_stats', filters: { limit: userStatsLimit } };
        } else if (activeFilter === 'modelShare' || activeFilter === 'requestTypes') {
          query = {
            query_type: 'pivot',
            group_by: [activeFilter === 'modelShare' ? 'model_id' : 'request_type'],
            order_by: 'total_requests',
            order_direction: 'desc',
            pivot_limit: 10,
            filters: {}
          };
        } else if (activeFilter === 'dailyTimeline') {
          query = {
            query_type: 'pivot',
            group_by: ['date'],
            order_by: 'total_requests',
            order_direction: 'desc',
            pivot_limit: 30,
            filters: { days: 30 }
          };
        } else {
          query = { query_type: activeFilter, filters: {} };
        }

        const payload = { queries: [query] };

        // Artificial delay for UI polish (1 second)
        await new Promise(resolve => setTimeout(resolve, 1000));

        const res = await fetch(API_ENDPOINTS.admin.dashboardDetails(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            ...(token ? { Authorization: token } : {}),
          },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`Server responded with ${res.status} ${res.statusText}`);
        const json = await res.json();
        const data = json?.results?.[0]?.data;
        const rows: Record<string, unknown>[] = data?.results ?? [];
        setApiTotalRecords(data?.total_records ?? 0);

        if (rows.length > 0) {
          let finalRows = rows;

          if (activeFilter === 'all') {
            finalRows = rows.map((r: any) => {
              let displayName = '';
              if (r.user_name) {
                displayName = String(r.user_name);
              } else if (r.user_email) {
                displayName = String(r.user_email).split('@')[0];
              } else {
                const rawId = String(r.user_id || 'Unknown');
                if (rawId.startsWith('user_')) {
                  const parts = rawId.split('_');
                  displayName = parts.length > 2
                    ? parts[1].charAt(0).toUpperCase() + parts[1].slice(1)
                    : rawId;
                } else {
                  displayName = rawId;
                }
              }

              const { user_id, user_name, user_email, ...rest } = r;
              return { User: displayName, ...rest };
            });
          }

          setApiColumns(Object.keys(finalRows[0]));
          setApiRows(finalRows);
        } else {
          setApiRows([]);
          setApiColumns([]);
        }
      } catch (err: unknown) {
        setApiError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setApiLoading(false);
      }
    };

    fetchFilterData();
  }, [activeFilter, userStatsLimit]);

  // Mock-data derived values
  const filteredUsers = userData
    .filter(user =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      const multiplier = sortDirection === 'asc' ? 1 : -1;
      return (a[sortField] - b[sortField]) * multiplier;
    });

  const handleSort = (field: 'credits' | 'tokenUsage' | 'modelUsage' | 'overrides') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const totalCredits = userData.reduce((sum, user) => sum + user.credits, 0);
  const avgCreditsPerUser = totalCredits / userData.length;
  const totalOverrides = userData.reduce((sum, user) => sum + user.overrides, 0);
  const isApiBacked = API_BACKED_FILTERS.has(activeFilter);

  // Dynamic Chart Logic
  let xAxisKey = 'name';
  let yAxisKey = 'credits';
  let chartTitle = 'Top Users by Credit Usage';
  let chartDesc = 'Top 5 users consuming the most credits';
  let currentChartData: Record<string, string | number>[] = topUsersChartData;
  let currentChartConfig: Record<string, { label: string; color: string }> = chartConfig;

  if (isApiBacked && apiRows.length > 0) {
    yAxisKey = 'total_tokens';
    currentChartConfig = {
      total_tokens: { label: 'Tokens', color: 'hsl(0, 0%, 45%)' }
    };

    if (activeFilter === 'all') {
      xAxisKey = 'User';
      chartTitle = 'Top Users by Tokens';
      chartDesc = 'Top 5 users consuming the most tokens';
      currentChartData = apiRows.slice(0, 5).map(row => {
        let label = String(row.User || 'Unknown');

        // Compact visual labels for the chart specifically
        if (label.includes('@')) {
          label = label.split('@')[0];
        } else if (label.startsWith('user_')) {
          const parts = label.split('_');
          label = parts.length > 1 ? parts[1] : label;
        }

        return {
          [xAxisKey]: label,
          [yAxisKey]: Number(row.total_tokens) || 0,
        };
      });
    } else if (activeFilter === 'modelShare') {
      xAxisKey = 'model_id';
      chartTitle = 'Top Models by Tokens';
      chartDesc = 'Top 5 models by token usage';
      currentChartData = apiRows.slice(0, 5).map(row => ({
        [xAxisKey]: String(row.model_id || 'Unknown'),
        [yAxisKey]: Number(row.total_tokens) || 0,
      }));
    } else if (activeFilter === 'requestTypes') {
      xAxisKey = 'request_type';
      chartTitle = 'Top Request Types by Tokens';
      chartDesc = 'Top 5 request types by token usage';
      currentChartData = apiRows.slice(0, 5).map(row => {
        const rawType = String(row.request_type || 'Unknown');
        const label = rawType.split('_')[0]; // simple human-readable start
        return {
          [xAxisKey]: label,
          [yAxisKey]: Number(row.total_tokens) || 0,
        }
      });
    } else if (activeFilter === 'dailyTimeline') {
      xAxisKey = 'date';
      chartTitle = 'Daily Token Usage';
      chartDesc = 'Token usage over the last 7 active days';
      // timeline might not be strictly chronological if ordered by tokens. Re-sort by date asc.
      currentChartData = [...apiRows].sort((a, b) => Number(a.date) - Number(b.date)).slice(-7).map(row => {
        const rawDate = Number(row.date);
        const label = isUnixTimestamp(rawDate)
          ? new Date(rawDate * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
          : String(rawDate || 'Unknown');
        return {
          [xAxisKey]: label,
          [yAxisKey]: Number(row.total_tokens) || 0,
        }
      });
    }
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{isApiBacked && activeFilter !== 'all' ? 'Total Records' : 'Total Users'}</p>
                <p className="text-2xl font-bold">{isApiBacked ? apiTotalRecords : userData.length}</p>
              </div>
              <User className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-muted-foreground">{isApiBacked ? 'Total Requests (in view)' : 'Avg. Credits/User'}</p>
              <p className="text-2xl font-bold">
                {isApiBacked
                  ? apiRows.reduce((sum, row) => sum + (Number(row.total_requests) || 0), 0).toLocaleString()
                  : `$${avgCreditsPerUser.toFixed(2)}`}
              </p>
            </div>
          </CardContent>
        </Card>
        {/*
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-muted-foreground">Total IP Overrides</p>
              <p className="text-2xl font-bold">{totalOverrides}</p>
            </div>
          </CardContent>
        </Card>
        */}
      </div>

      {/* Top Chart */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">{chartTitle}</CardTitle>
          <CardDescription>{chartDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={currentChartConfig} className="h-[200px]">
            <BarChart data={currentChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0, 0%, 20%)" />
              <XAxis dataKey={xAxisKey} stroke="hsl(0, 0%, 50%)" />
              <YAxis stroke="hsl(0, 0%, 50%)" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey={yAxisKey} fill="hsl(0, 0%, 45%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* User Table */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">User Details</CardTitle>
          <CardDescription>
            {isApiBacked
              ? activeFilter === 'all'
                ? `Live data — All Users (top ${userStatsLimit})`
                : (activeFilter === 'modelShare' || activeFilter === 'requestTypes')
                  ? `Live data — ${filterOptions.find(f => f.id === activeFilter)?.label} (top 10)`
                  : `Live data — ${filterOptions.find(f => f.id === activeFilter)?.label}`
              : 'Complete breakdown of user activity'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search + Filter row */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <div className="relative flex-1 min-w-[160px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-background"
                disabled={isApiBacked}
              />
            </div>

            {/* Limit selector — only shown for All Users */}
            {activeFilter === 'all' && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Limit:</span>
                <Input
                  type="number"
                  min="1"
                  className="w-20 h-8 text-sm bg-background"
                  value={limitInput}
                  onChange={(e) => setLimitInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const val = parseInt(limitInput, 10);
                      if (!isNaN(val) && val > 0) setUserStatsLimit(val);
                    }
                  }}
                />
                <Button
                  size="sm"
                  className="h-8"
                  onClick={() => {
                    const val = parseInt(limitInput, 10);
                    if (!isNaN(val) && val > 0) setUserStatsLimit(val);
                  }}
                  disabled={!limitInput || parseInt(limitInput, 10) <= 0}
                >
                  Set
                </Button>
              </div>
            )}

            {/* Filter dropdown */}
            <div className="relative" ref={filterRef}>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2 border-border bg-background hover:bg-accent"
                onClick={() => setFilterOpen(prev => !prev)}
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {filterOptions.find(f => f.id === activeFilter)?.icon}{' '}
                  {filterOptions.find(f => f.id === activeFilter)?.label}
                </span>
                <ChevronDown className={`h-3 w-3 transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
              </Button>

              {filterOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-md border border-border bg-card shadow-lg z-50 py-1">
                  {filterOptions.map(option => (
                    <button
                      key={option.id}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent/50 transition-colors text-left ${activeFilter === option.id ? 'text-foreground font-medium' : 'text-muted-foreground'
                        }`}
                      onClick={() => {
                        setActiveFilter(option.id);
                        if (option.id === 'all') setLimitInput(String(userStatsLimit));
                        setFilterOpen(false);
                      }}
                    >
                      <span>{option.icon}</span>
                      <span className="flex-1">{option.label}</span>
                      {activeFilter === option.id && <Check className="h-3 w-3 ml-auto" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── API-backed dynamic table ─────────────────────────── */}
          {isApiBacked ? (
            <div className="overflow-x-auto">
              {apiLoading && (
                <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm">Loading data…</span>
                </div>
              )}
              {!apiLoading && apiError && (
                <div className="flex items-center gap-2 py-8 justify-center text-red-400 text-sm">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{apiError}</span>
                </div>
              )}
              {!apiLoading && !apiError && apiRows.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No data returned for this filter.
                </div>
              )}
              {!apiLoading && !apiError && apiRows.length > 0 && (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      {apiColumns.map(col => (
                        <th
                          key={col}
                          className="text-left py-3 px-2 text-sm font-medium text-muted-foreground whitespace-nowrap"
                        >
                          {formatColumnHeader(col)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {apiRows.map((row, rowIdx) => (
                      <tr key={rowIdx} className="border-b border-border/50 hover:bg-accent/30">
                        {apiColumns.map(col => (
                          <td key={col} className="py-3 px-2 text-sm">
                            {formatCellValue(row[col])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ) : (
            /* ── Mock-data static table ───────────────────────────── */
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">User</th>
                    <th className="text-left py-3 px-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 text-sm font-medium text-muted-foreground hover:text-foreground"
                        onClick={() => handleSort('credits')}
                      >
                        Credits
                        <ArrowUpDown className="ml-1 h-3 w-3" />
                      </Button>
                    </th>
                    <th className="text-left py-3 px-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 text-sm font-medium text-muted-foreground hover:text-foreground"
                        onClick={() => handleSort('tokenUsage')}
                      >
                        Token Usage
                        <ArrowUpDown className="ml-1 h-3 w-3" />
                      </Button>
                    </th>
                    <th className="text-left py-3 px-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 text-sm font-medium text-muted-foreground hover:text-foreground"
                        onClick={() => handleSort('modelUsage')}
                      >
                        Model Usage
                        <ArrowUpDown className="ml-1 h-3 w-3" />
                      </Button>
                    </th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Top Model</th>
                    <th className="text-left py-3 px-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 text-sm font-medium text-muted-foreground hover:text-foreground"
                        onClick={() => handleSort('overrides')}
                      >
                        Overrides
                        <ArrowUpDown className="ml-1 h-3 w-3" />
                      </Button>
                    </th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b border-border/50 hover:bg-accent/30">
                      <td className="py-3 px-2">
                        <div>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-xs text-muted-foreground">{user.email}</div>
                        </div>
                      </td>
                      <td className="py-3 px-2 font-medium">${user.credits.toFixed(2)}</td>
                      <td className="py-3 px-2">{user.tokenUsage.toLocaleString()} <span className="text-xs text-muted-foreground">tokens</span></td>
                      <td className="py-3 px-2">{user.modelUsage.toLocaleString()} <span className="text-xs text-muted-foreground">calls</span></td>
                      <td className="py-3 px-2">
                        <Badge variant="secondary">{user.topModel}</Badge>
                      </td>
                      <td className="py-3 px-2">
                        <span className={user.overrides > 3 ? 'text-red-500 font-medium' : ''}>
                          {user.overrides}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        <Badge variant={user.status === 'warning' ? 'destructive' : 'default'}>
                          {user.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
