/**
 * WeeklyReportCharts — Gráficos do Relatório Semanal
 *
 * Quatro visualizações compactas, projetadas para caber em 375px sem overflow:
 * 1. ScoreRadial — RadialBar do Score Nutricional Médio (0-100)
 * 2. Mini-stats de calorias médias e janela alimentar
 * 3. MacroBar — barras horizontais de C/P/G médios (BarChart)
 * 4. UltraprocessedBar + DiversityBar — barras de progresso nativas
 *
 * Usa apenas componentes recharts responsivos com width="100%".
 */

import React from 'react';
import {
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import type { WeeklyReport } from '../hooks/useWeeklyReports';

// ─────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────

interface WeeklyReportChartsProps {
  stats: WeeklyReport['stats'];
  /** Meta calórica diária do usuário (opcional — vem do perfil). */
  calorieGoal?: number;
}

// ─────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────

const MACRO_COLORS = {
  carbs: '#6ee7b7',
  protein: '#93c5fd',
  fat: '#fde68a',
};

const SCORE_BG_COLOR = '#1f2937';

// ─────────────────────────────────────────────────────────
// Tooltip customizado
// ─────────────────────────────────────────────────────────

const MacroTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const entry = payload[0].payload as { name: string; value: number };
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs shadow-xl">
      <span className="text-gray-400">{entry.name}: </span>
      <span className="text-white font-bold">{Math.round(entry.value)} g</span>
    </div>
  );
};

// ─────────────────────────────────────────────────────────
// Sub: Score Radial
// ─────────────────────────────────────────────────────────

const ScoreRadialChart: React.FC<{ score: number }> = ({ score }) => {
  const safe = Math.min(100, Math.max(0, score));
  const color =
    safe >= 75 ? '#10b981' :
    safe >= 50 ? '#f59e0b' :
    '#f87171';
  const label =
    safe >= 75 ? 'Excelente' :
    safe >= 60 ? 'Consistente' :
    safe >= 40 ? 'Em progresso' :
    'Em construção';
  const data = [{ value: safe, fill: color }];

  return (
    <div className="flex flex-col items-center">
      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 self-start">
        Score Nutricional
      </p>
      <div className="relative w-[88px] h-[88px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            innerRadius="68%"
            outerRadius="100%"
            data={data}
            startAngle={90}
            endAngle={-270}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
            <RadialBar
              background={{ fill: SCORE_BG_COLOR }}
              dataKey="value"
              angleAxisId={0}
              cornerRadius={8}
            />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xl font-extrabold" style={{ color }}>{safe}</span>
          <span className="text-[8px] text-gray-500 font-medium">/100</span>
        </div>
      </div>
      <span className="text-[10px] font-semibold mt-1" style={{ color }}>{label}</span>
    </div>
  );
};

// ─────────────────────────────────────────────────────────
// Sub: Macro BarChart horizontal
// ─────────────────────────────────────────────────────────

const MacroBarChart: React.FC<{ stats: WeeklyReport['stats'] }> = ({ stats }) => {
  const data = [
    { name: 'Carboidratos', value: stats.averageDailyCarbs, color: MACRO_COLORS.carbs, key: 'carbs' },
    { name: 'Proteína', value: stats.averageDailyProtein, color: MACRO_COLORS.protein, key: 'protein' },
    { name: 'Gordura', value: stats.averageDailyFat, color: MACRO_COLORS.fat, key: 'fat' },
  ];

  return (
    <div className="w-full">
      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
        Macros Médios / Dia
      </p>
      <ResponsiveContainer width="100%" height={88}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 32, left: 4, bottom: 0 }}
        >
          <XAxis type="number" hide domain={[0, 'dataMax + 20']} />
          <YAxis
            type="category"
            dataKey="name"
            width={72}
            tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 600 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<MacroTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={18}>
            {data.map((entry) => (
              <Cell key={entry.key} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex gap-3 mt-1 justify-center">
        {data.map((d) => (
          <div key={d.key} className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
            <span className="text-[9px] text-gray-400">{d.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────
// Sub: Ultraprocessados progress bar
// ─────────────────────────────────────────────────────────

const UltraProcessedBar: React.FC<{ percent: number }> = ({ percent }) => {
  const safe = Math.min(100, Math.max(0, percent));
  const color =
    safe <= 10 ? '#10b981' :
    safe <= 25 ? '#f59e0b' :
    '#f87171';

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1.5">
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
          Ultraprocessados
        </p>
        <span className="text-xs font-extrabold" style={{ color }}>{safe}%</span>
      </div>
      <div className="w-full h-2.5 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${safe}%`, background: `linear-gradient(90deg, ${color}99, ${color})` }}
        />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[9px] text-gray-600">0%</span>
        <span className="text-[9px] text-gray-600">Referência &lt;10%</span>
        <span className="text-[9px] text-gray-600">100%</span>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────

const WeeklyReportCharts: React.FC<WeeklyReportChartsProps> = ({ stats, calorieGoal }) => {
  return (
    <div className="space-y-5 pt-1">
      {/* Linha 1: Score Radial + mini-stats */}
      <div className="flex items-start gap-4">
        <ScoreRadialChart score={stats.averageDailyScore} />
        <div className="flex-1 grid grid-cols-1 gap-2 min-w-0">
          {/* Calorias médias */}
          <div className="bg-gray-900/40 border border-gray-700/30 rounded-xl p-2.5">
            <span className="text-[9px] text-gray-500 font-bold uppercase block">Média Calórica</span>
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-extrabold text-white">
                {stats.averageDailyCalories.toLocaleString('pt-BR')}
              </span>
              <span className="text-[10px] text-gray-500">kcal/dia</span>
            </div>
            {calorieGoal && calorieGoal > 0 && (
              <div className="mt-1 w-full h-1 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500/70"
                  style={{
                    width: `${Math.min(100, Math.round((stats.averageDailyCalories / calorieGoal) * 100))}%`,
                  }}
                />
              </div>
            )}
          </div>
          {/* Janela alimentar */}
          <div className="bg-gray-900/40 border border-gray-700/30 rounded-xl p-2.5">
            <span className="text-[9px] text-gray-500 font-bold uppercase block">Janela Alimentar</span>
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-extrabold text-blue-400">
                {stats.averageEatingWindowHours}
              </span>
              <span className="text-[10px] text-gray-500">horas/dia</span>
            </div>
          </div>
        </div>
      </div>

      {/* Linha 2: Macros */}
      <MacroBarChart stats={stats} />

      {/* Linha 3: Ultraprocessados */}
      <UltraProcessedBar percent={stats.ultraProcessedPercent} />

      {/* Linha 4: Diversidade de grupos */}
      <div className="w-full">
        <div className="flex justify-between items-center mb-2">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
            Diversidade Alimentar
          </p>
          <span className="text-xs font-extrabold text-emerald-400">
            {stats.uniqueGroupsCount}
            <span className="text-[9px] text-gray-500 font-normal"> / 7 grupos</span>
          </span>
        </div>
        <div className="flex gap-1">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 h-2 rounded-full transition-all duration-500"
              style={{
                background: i < stats.uniqueGroupsCount
                  ? `hsl(${150 + i * 10}, 60%, 45%)`
                  : '#1f2937',
              }}
            />
          ))}
        </div>
        {stats.missingFoodGroups.length > 0 && (
          <p className="text-[10px] text-gray-500 mt-1.5 leading-relaxed">
            Não registrados:{' '}
            <span className="text-gray-400 font-medium capitalize">
              {stats.missingFoodGroups.join(', ')}
            </span>
          </p>
        )}
      </div>
    </div>
  );
};

export default WeeklyReportCharts;
