/**
 * Hook para calcular streak de dias consecutivos com refeições registradas.
 */
import { useMemo } from 'react';
import type { HistoryEntry } from '../types';

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function diffDays(a: Date, b: Date): number {
  return Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / 86400000);
}

export function useStreaks(history: HistoryEntry[]) {
  const streak = useMemo(() => {
    if (history.length === 0) return 0;

    // Unique days with at least one entry (sorted descending)
    const days = [
      ...new Set(
        history.map((e) => {
          const d = new Date(e.date);
          return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        }),
      ),
    ].sort().reverse();

    if (days.length === 0) return 0;

    const today = new Date();
    const firstDay = new Date(history.find((e) => {
      const d = new Date(e.date);
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}` === days[0];
    })!.date);

    // If last day isn't today or yesterday, streak is broken
    const dayDiff = diffDays(today, firstDay);
    if (dayDiff > 1) return 0;

    let count = 1;
    for (let i = 1; i < days.length; i++) {
      const prev = new Date(
        history.find((e) => {
          const d = new Date(e.date);
          return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}` === days[i - 1];
        })!.date,
      );
      const curr = new Date(
        history.find((e) => {
          const d = new Date(e.date);
          return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}` === days[i];
        })!.date,
      );
      if (diffDays(prev, curr) === 1) {
        count++;
      } else {
        break;
      }
    }

    return count;
  }, [history]);

  return streak;
}
