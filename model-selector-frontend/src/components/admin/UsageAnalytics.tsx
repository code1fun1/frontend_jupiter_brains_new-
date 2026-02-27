import { TrendingUp, TrendingDown, DollarSign, Users, MessageSquare, Zap } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart,
} from 'recharts';

// Dummy data for analytics
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
  credits: {
    label: 'Credits ($)',
    color: 'hsl(0, 0%, 30%)',
  },
  requests: {
    label: 'Requests',
    color: 'hsl(0, 0%, 60%)',
  },
  usage: {
    label: 'Usage ($)',
    color: 'hsl(0, 0%, 40%)',
  },
};

export function UsageAnalytics() {
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Credits Used</p>
                <p className="text-2xl font-bold">$7,234.50</p>
                <div className="flex items-center gap-1 text-sm text-green-500">
                  <TrendingUp className="h-3 w-3" />
                  <span>+12.5% from last month</span>
                </div>
              </div>
              <div className="p-3 bg-accent rounded-full">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Users</p>
                <p className="text-2xl font-bold">156</p>
                <div className="flex items-center gap-1 text-sm text-green-500">
                  <TrendingUp className="h-3 w-3" />
                  <span>+8 new this week</span>
                </div>
              </div>
              <div className="p-3 bg-accent rounded-full">
                <Users className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Requests</p>
                <p className="text-2xl font-bold">25,800</p>
                <div className="flex items-center gap-1 text-sm text-green-500">
                  <TrendingUp className="h-3 w-3" />
                  <span>+22.8% from last month</span>
                </div>
              </div>
              <div className="p-3 bg-accent rounded-full">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

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
                  data={modelUsageData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {modelUsageData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
            <div className="flex flex-wrap justify-center gap-4 mt-4">
              {modelUsageData.map((entry) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-sm text-muted-foreground">
                    {entry.name} ({entry.value}%)
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
