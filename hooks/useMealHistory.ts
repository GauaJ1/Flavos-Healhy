import { useState, useEffect, useCallback } from 'react';
import type { HistoryEntry } from '../types';

const STORAGE_KEY = 'nutrisnap_history';

export const useMealHistory = () => {
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem(STORAGE_KEY);
      if (storedHistory) {
        const parsedHistory: HistoryEntry[] = JSON.parse(storedHistory);
        setHistory(parsedHistory);
      }
    } catch (error) {
      console.error("Falha ao carregar o histórico do armazenamento local", error);
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const addHistoryEntry = useCallback((newEntry: HistoryEntry) => {
    setHistory(prevHistory => {
      const updatedHistory = [newEntry, ...prevHistory];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
      } catch (error) {
        console.error("Falha ao salvar o histórico no armazenamento local", error);
      }
      return updatedHistory;
    });
  }, []);

  const updateHistoryEntry = useCallback((updatedEntry: HistoryEntry) => {
    setHistory(prevHistory => {
      const updatedHistory = prevHistory.map(entry => entry.id === updatedEntry.id ? updatedEntry : entry);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
      } catch (error) {
        console.error("Falha ao atualizar o histórico no armazenamento local", error);
      }
      return updatedHistory;
    });
  }, []);

  const removeHistoryEntry = useCallback((id: number) => {
    setHistory(prevHistory => {
      const updatedHistory = prevHistory.filter(entry => entry.id !== id);
       try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
      } catch (error) {
        console.error("Falha ao atualizar o histórico no armazenamento local", error);
      }
      return updatedHistory;
    });
  }, []);

  return { history, addHistoryEntry, removeHistoryEntry, updateHistoryEntry };
};