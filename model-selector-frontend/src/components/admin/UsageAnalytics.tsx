import { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, Users, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
} from 'recharts';
import { API_ENDPOINTS, getStoredBearerToken } from '@/utils/config';

// Dummy data for charts (kept for now — only stat cards become live)
const usageOverTimeData = [
  { month: 'Jan', credits: 4200, requests: 15000 },
  { month: 'Feb', credits: 5100, requests: 18500 },
  { month: 'Mar', credits: 4800, requests: 17200 },
  { month: 'Apr', credits: 6200, requests: 22000 },
  { month: 'May', credits: 5900, requests: 21000 },
  { month: 'Jun', credits: 7234, requests: 25800 },
];

const modelUsageData = [
  { name: 'JupiterBrains', value: 35, color: 'hsl(0, 0%, 20%)' },
  { name: 'ChatGPT', value: 28, color: 'hsl(0, 0%, 40%)' },
  { name: 'Claude', value: 22, color: 'hsl(0, 0%, 60%)' },
  { name: 'Gemini', value: 15, color: 'hsl(0, 0%, 80%)' },
];

const requestTypeData = [
  { type: 'Text Generation', count: 12500, percentage: 48 },
  { type: 'Strategy Creation', count: 5200, percentage: 20 },
  { type: 'Code Assistance', count: 4100, percentage: 16 },
  { type: 'Image Generation', count: 2600, percentage: 10 },
  { type: 'Video Generation', count: 1560, percentage: 6 },
];

const dailyUsageData = [
  { day: 'Mon', usage: 1200 },
  { day: 'Tue', usage: 1450 },
  { day: 'Wed', usage: 1100 },
  { day: 'Thu', usage: 1680 },
  { day: 'Fri', usage: 1520 },
  { day: 'Sat', usage: 680 },
  { day: 'Sun', usage: 450 },
];

const chartConfig = {
  credits: { label: 'Credits ($)', color: 'hsl(0, 0%, 30%)' },
  requests: { label: 'Requests', color: 'hsl(0, 0%, 60%)' },
  usage: { label: 'Usage ($)', color: 'hsl(0, 0%, 40%)' },
};

interface OverviewStats {
  total_tokens: number;
  total_requests: number;
  input_tokens: number;
  output_tokens: number;
  avg_tokens_per_request: number;
  total_unique_users?: number;
}

export function UsageAnalytics() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [modelData, setModelData] = useState<Array<{ name: string, value: number, color: string, percentage?: number }>>(modelUsageData);
  const [reqTypeData, setReqTypeData] = useState<Array<{ type: string, count: number, percentage?: number }>>(requestTypeData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOverview = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = getStoredBearerToken();
        const payload = {
          queries: [
            { query_type: 'overview', filters: {} },
            { query_type: 'pivot', group_by: ['model_id'], order_by: 'total_requests', order_direction: 'desc', pivot_limit: 5, filters: {} },
            { query_type: 'pivot', group_by: ['request_type'], order_by: 'total_requests', order_direction: 'desc', pivot_limit: 5, filters: {} },
            { query_type: 'pivot', group_by: ['user_id'], filters: { limit: 10 } }
          ]
        };

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
        if (!res.ok) throw new Error(`Server error ${res.status}`);
        const json = await res.json();

        const resultsArray = json?.results || [];

        // 0: Overview & 3: User Pivot (for unique user count)
        const overviewData = resultsArray[0]?.data?.results?.[0];
        setStats({
          total_tokens: Number(overviewData?.total_tokens) || 0,
          total_requests: Number(overviewData?.total_requests) || 0,
          input_tokens: Number(overviewData?.input_tokens) || 0,
          output_tokens: Number(overviewData?.output_tokens) || 0,
          avg_tokens_per_request: Number(overviewData?.avg_tokens_per_request) || 0,
          total_unique_users: Number(resultsArray[3]?.data?.total_records) || 0,
        });

        // 1: Model Usage
        let newModelData = modelUsageData;
        const modelRows = resultsArray[1]?.data?.results || [];
        if (modelRows.length > 0) {
          const COLORS = ['hsl(0, 0%, 20%)', 'hsl(0, 0%, 40%)', 'hsl(0, 0%, 60%)', 'hsl(0, 0%, 80%)', 'hsl(0, 0%, 50%)'];
          newModelData = modelRows.slice(0, 5).map((r: any, i: number) => ({
            name: String(r.model_id),
            value: Number(r.total_requests) || 0,
            color: COLORS[i % COLORS.length]
          }));
        }

        // 2: Request Type Breakdown
        let newReqTypeData = requestTypeData;
        const reqTypeRows = resultsArray[2]?.data?.results || [];
        if (reqTypeRows.length > 0) {
          newReqTypeData = reqTypeRows.slice(0, 5).map((r: any) => {
            const rawType = String(r.request_type || 'unknown');
            const formattedType = rawType.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            return {
              type: formattedType,
              count: Number(r.total_requests) || 0
            };
          });
        }

        const totalModelReqs = newModelData.reduce((acc, curr) => acc + curr.value, 0);
        setModelData(newModelData.map(m => ({
          ...m,
          percentage: totalModelReqs > 0 ? Math.round((m.value / totalModelReqs) * 100) : 0
        })));

        const totalReqs = newReqTypeData.reduce((acc, curr) => acc + curr.count, 0);
        setReqTypeData(newReqTypeData.map(r => ({
          ...r,
          percentage: totalReqs > 0 ? Math.round((r.count / totalReqs) * 100) : 0
        })));
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load overview');
      } finally {
        setLoading(false);
      }
    };

    fetchOverview();
  }, []);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Tokens — from API */}
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Tokens</p>
                <p className="text-2xl font-bold">
                  {loading ? '—' : (stats?.total_tokens ?? 0).toLocaleString()}
                </p>
                {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
                {!loading && !error && (
                  <div className="flex items-center gap-1 text-sm text-green-500">
                    <TrendingUp className="h-3 w-3" />
                    <span>Live data</span>
                  </div>
                )}
              </div>
              <div className="p-3 bg-accent rounded-full">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Users — from API */}
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Users</p>
                <p className="text-2xl font-bold">
                  {loading ? '—' : (stats?.total_unique_users ?? 0).toLocaleString()}
                </p>
                {!loading && !error && (
                  <div className="flex items-center gap-1 text-sm text-green-500">
                    <TrendingUp className="h-3 w-3" />
                    <span>Live data</span>
                  </div>
                )}
              </div>
              <div className="p-3 bg-accent rounded-full">
                <Users className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Requests — from API */}
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Requests</p>
                <p className="text-2xl font-bold">
                  {loading ? '—' : (stats?.total_requests ?? 0).toLocaleString()}
                </p>
                {!loading && !error && (
                  <div className="flex items-center gap-1 text-sm text-green-500">
                    <TrendingUp className="h-3 w-3" />
                    <span>Live data</span>
                  </div>
                )}
              </div>
              <div className="p-3 bg-accent rounded-full">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* IP Overrides — commented out
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">IP Overrides</p>
                <p className="text-2xl font-bold">47</p>
                <div className="flex items-center gap-1 text-sm text-red-500">
                  <TrendingDown className="h-3 w-3" />
                  <span>-15% from last month</span>
                </div>
              </div>
              <div className="p-3 bg-accent rounded-full">
                <Zap className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        */}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Credit Usage Over Time */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg">Credit Usage Over Time</CardTitle>
            <CardDescription>Monthly credit consumption in dollars</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px]">
              <AreaChart data={usageOverTimeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0, 0%, 20%)" />
                <XAxis dataKey="month" stroke="hsl(0, 0%, 50%)" />
                <YAxis stroke="hsl(0, 0%, 50%)" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="credits"
                  stroke="hsl(0, 0%, 60%)"
                  fill="hsl(0, 0%, 30%)"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Model Usage Distribution */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg">Model Usage Distribution</CardTitle>
            <CardDescription>Percentage of requests by model</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px]">
              <PieChart>
                <Pie
                  data={modelData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {modelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
            <div className="flex flex-wrap justify-center gap-4 mt-4">
              {modelData.map((entry) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-sm text-muted-foreground">
                    {entry.name} ({entry.percentage ?? entry.value}%)
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Request Type Breakdown */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg">Request Type Breakdown</CardTitle>
            <CardDescription>Distribution of request categories</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px]">
              <BarChart data={requestTypeData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0, 0%, 20%)" />
                <XAxis type="number" stroke="hsl(0, 0%, 50%)" />
                <YAxis dataKey="type" type="category" stroke="hsl(0, 0%, 50%)" width={100} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="hsl(0, 0%, 40%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Daily Usage Pattern */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg">Daily Usage Pattern</CardTitle>
            <CardDescription>Usage distribution by day of week</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px]">
              <BarChart data={dailyUsageData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0, 0%, 20%)" />
                <XAxis dataKey="day" stroke="hsl(0, 0%, 50%)" />
                <YAxis stroke="hsl(0, 0%, 50%)" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="usage" fill="hsl(0, 0%, 50%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
