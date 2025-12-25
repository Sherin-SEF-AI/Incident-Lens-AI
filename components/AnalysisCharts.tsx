import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import { FaultAllocation, RiskVector } from '../types';

interface FaultChartProps {
  allocations: FaultAllocation[];
}

interface RiskRadarChartProps {
  data: RiskVector[];
}

// Forensic Palette: Indigo, Violet, Emerald, Amber, Rose
const COLORS = ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#f43f5e'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#18181b] border border-white/10 p-2 rounded shadow-xl z-50">
        <p className="text-[10px] font-bold text-white mb-1">{label || payload[0].name}</p>
        <p className="text-[10px] text-primary font-mono">
          {payload[0].value}%
        </p>
      </div>
    );
  }
  return null;
};

export const FaultChart: React.FC<FaultChartProps> = ({ allocations }) => {
  const data = allocations.map(a => ({
    name: a.party,
    value: a.percentage
  }));

  // Recharts ResponsiveContainer requires a container with non-zero dimensions.
  // We use a fixed aspect ratio or ensure the parent has explicit dimensions.
  return (
    <div style={{ width: '100%', height: '100%', minHeight: 160 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={40}
            outerRadius={55}
            fill="#6366f1"
            paddingAngle={4}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend 
             verticalAlign="middle" 
             align="right"
             layout="vertical"
             iconType="circle"
             iconSize={6}
             wrapperStyle={{ fontSize: '10px', fontFamily: 'Inter', color: '#a1a1aa' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export const RiskRadarChart: React.FC<RiskRadarChartProps> = ({ data }) => {
  return (
    <div style={{ width: '100%', height: '100%', minHeight: 200 }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke="#3f3f46" strokeDasharray="2 2" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: '#71717a', fontSize: 9, fontWeight: 600 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
          <Radar
            name="Driver Risk"
            dataKey="A"
            stroke="#6366f1"
            strokeWidth={2}
            fill="#6366f1"
            fillOpacity={0.2}
          />
          <Tooltip content={<CustomTooltip />} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};