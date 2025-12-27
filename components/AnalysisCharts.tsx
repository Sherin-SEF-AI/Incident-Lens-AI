
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import { FaultAllocation, RiskVector } from '../types';

interface FaultChartProps {
  allocations: FaultAllocation[];
}

interface RiskRadarChartProps {
  data: RiskVector[];
}

// Professional Palette: Indigo, Violet, Emerald, Amber, Rose
const COLORS = ['#4f46e5', '#8b5cf6', '#10b981', '#f59e0b', '#f43f5e'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-sm border border-slate-200 p-3 rounded-lg shadow-xl z-50">
        <p className="text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider font-sans">{label || payload[0].name}</p>
        <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: payload[0].payload.fill || payload[0].color }}></span>
            <p className="text-xs text-slate-900 font-mono font-bold">
            {payload[0].value}%
            </p>
        </div>
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

  return (
    <div style={{ width: '100%', height: '100%', minHeight: '200px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            fill="#4f46e5"
            paddingAngle={4}
            dataKey="value"
            stroke="none"
            cornerRadius={4}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} cursor={{fill: 'transparent'}} />
          <Legend 
             verticalAlign="middle" 
             align="right"
             layout="vertical"
             iconType="circle"
             iconSize={8}
             wrapperStyle={{ fontSize: '11px', fontFamily: 'Inter', color: '#64748b' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export const RiskRadarChart: React.FC<RiskRadarChartProps> = ({ data }) => {
  return (
    <div style={{ width: '100%', height: '100%', minHeight: '220px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke="#e2e8f0" strokeDasharray="4 4" />
          <PolarAngleAxis 
            dataKey="subject" 
            tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600, fontFamily: 'Inter' }} 
          />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
          <Radar
            name="Driver Risk"
            dataKey="A"
            stroke="#4f46e5"
            strokeWidth={3}
            fill="#4f46e5"
            fillOpacity={0.2}
          />
          <Tooltip content={<CustomTooltip />} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};
