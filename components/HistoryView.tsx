import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { HistoryEntry } from '../types';
import { CalendarIcon, FlameIcon, TrashIcon } from './icons';
import { motion, AnimatePresence } from 'framer-motion';
import SyncBadge from './SyncBadge';
import { isNativePlatform } from '../services/healthSyncService';

interface HistoryViewProps {
  history: HistoryEntry[];
  onDeleteEntry: (id: number) => void;
}

const HistoryView: React.FC<HistoryViewProps> = ({ history, onDeleteEntry }) => {
  const chartData = useMemo(() => {
    const dailyTotals: { [key: string]: number } = {};
    // Initialize last 7 days with 0
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toLocaleDateString('en-CA');
        dailyTotals[dateStr] = 0;
    }

    history.forEach(entry => {
      const date = new Date(entry.date).toLocaleDateString('en-CA');
      if (dailyTotals[date] !== undefined) {
        dailyTotals[date] += entry.totalCalories;
      }
    });

    return Object.keys(dailyTotals)
      .map(date => ({
        date,
        calories: dailyTotals[date],
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-7);
  }, [history]);
  
  const dailyStreak = useMemo(() => {
    if (history.length === 0) return 0;
    const uniqueDays = [...new Set(history.map(entry => new Date(entry.date).toDateString()))];
    let streak = 0;
    let today = new Date();
    
    if (uniqueDays.includes(today.toDateString())) streak++;
    else { today.setDate(today.getDate() - 1); }
    
    while(uniqueDays.includes(today.toDateString())) {
        streak++;
        today.setDate(today.getDate() - 1);
    }
    return streak;
  }, [history]);

  if (history.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center p-12 bg-gray-800/50 backdrop-blur-md rounded-3xl shadow-xl w-full max-w-md border border-gray-700/50 flex flex-col items-center"
      >
        <div className="bg-gray-700/50 p-6 rounded-full mb-6">
            <CalendarIcon className="w-12 h-12 text-gray-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Histórico Vazio</h2>
        <p className="text-gray-400">Analise sua primeira refeição para começar a construir sua jornada de saúde!</p>
      </motion.div>
    );
  }

  return (
    <div className="w-full max-w-4xl space-y-8 pb-20">
        {/* Chart Section */}
        <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-gray-800/60 backdrop-blur-md p-6 md:p-8 rounded-3xl shadow-xl border border-gray-700/50"
        >
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                 <div>
                    <h2 className="text-xl font-bold text-white">Consumo Diário</h2>
                    <p className="text-sm text-gray-400">Últimos 7 dias</p>
                 </div>
                 <div className="flex items-center gap-3 bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20 text-orange-400 font-bold py-2 px-4 rounded-2xl">
                     <FlameIcon className="w-5 h-5"/>
                     <span>{dailyStreak} Dias Seguidos</span>
                 </div>
             </div>
            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorCalories" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                        <XAxis 
                            dataKey="date" 
                            tick={{ fill: '#9CA3AF', fontSize: 12 }} 
                            tickFormatter={(dateStr) => new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                            axisLine={false}
                            tickLine={false}
                            dy={10}
                        />
                        <YAxis 
                            tick={{ fill: '#9CA3AF', fontSize: 12 }} 
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip
                        contentStyle={{
                            backgroundColor: '#1F2937',
                            borderColor: '#374151',
                            borderRadius: '12px',
                            color: '#F3F4F6',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                        itemStyle={{ color: '#10b981' }}
                        labelStyle={{ color: '#9CA3AF', marginBottom: '0.5rem' }}
                        cursor={{ stroke: '#4B5563', strokeWidth: 1, strokeDasharray: '4 4' }}
                        formatter={(value: number) => [`${value} kcal`, 'Calorias']}
                        labelFormatter={(label) => new Date(label).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                        />
                        <Area 
                            type="monotone" 
                            dataKey="calories" 
                            stroke="#10b981" 
                            strokeWidth={3} 
                            fillOpacity={1} 
                            fill="url(#colorCalories)" 
                            activeDot={{ r: 6, strokeWidth: 0, fill: '#fff' }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </motion.div>

      {/* List Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white px-2">Refeições Recentes</h2>
        <div className="space-y-3">
          <AnimatePresence>
            {history.map((entry, index) => {
                const totalCarbs = entry.foods.reduce((sum, food) => sum + food.carbohydrates, 0);
                const totalProtein = entry.foods.reduce((sum, food) => sum + food.protein, 0);
                
                return (
                <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 p-5 rounded-2xl hover:bg-gray-800/60 transition-all group relative overflow-hidden"
                >
                    <div className="flex justify-between items-start relative z-10">
                        <div className="flex-1 pr-4">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                                  {new Date(entry.date).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })} • {new Date(entry.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                              {isNativePlatform() && localStorage.getItem('flavos_health_sync_enabled') === 'true' && (
                                <SyncBadge synced={true} compact={true} />
                              )}
                            </div>
                            <p className="text-gray-200 font-medium line-clamp-1">
                                {entry.foods.map(f => f.name).join(', ')}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-lg font-bold text-emerald-400">{entry.totalCalories} <span className="text-xs font-normal text-gray-500">kcal</span></p>
                        </div>
                    </div>
                    
                    <div className="mt-3 pt-3 border-t border-gray-700/50 flex items-center justify-between text-sm relative z-10">
                        <div className="flex gap-4 text-gray-400">
                            <span>Carb: <b className="text-gray-300">{totalCarbs.toFixed(0)}g</b></span>
                            <span>Prot: <b className="text-gray-300">{totalProtein.toFixed(0)}g</b></span>
                        </div>
                        <button 
                            onClick={() => onDeleteEntry(entry.id)}
                            className="text-gray-500 hover:text-red-400 transition-colors p-1 rounded-md hover:bg-red-500/10"
                            aria-label="Excluir"
                        >
                            <TrashIcon className="w-5 h-5" />
                        </button>
                    </div>
                </motion.div>
                );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default HistoryView;