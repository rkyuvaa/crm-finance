import { useState, useCallback } from 'react';

export type SortDirection = 'asc' | 'desc' | null;

export interface SortState<K = string> {
  key: K | null;
  direction: SortDirection;
}

export interface UseTableSortOptions<T> {
  initialKey?: keyof T | string | null;
  initialDirection?: SortDirection;
  /** Custom value extraction function per column key */
  getValue?: Partial<Record<string, (item: T) => any>>;
}

/**
 * Normalizes values for comparison (Numbers, Currency, Dates, Alphanumeric IDs, Strings).
 */
function normalizeComparableValue(val: any): { type: 'number' | 'date' | 'string' | 'null'; value: any } {
  if (val === null || val === undefined || val === '') {
    return { type: 'null', value: null };
  }

  // Already a Date object
  if (val instanceof Date) {
    return { type: 'date', value: val.getTime() };
  }

  // Number
  if (typeof val === 'number') {
    return { type: 'number', value: val };
  }

  // String parsing
  if (typeof val === 'string') {
    const trimmed = val.trim();

    // Check Currency (e.g. ₹1.1L, ₹2.5Cr, ₹1,50,000, $500, 1.1L)
    const lakhMatch = trimmed.match(/^₹?\s*([\d.]+)\s*L(?:akhs?)?$/i);
    if (lakhMatch) {
      return { type: 'number', value: parseFloat(lakhMatch[1]) * 100000 };
    }

    const croreMatch = trimmed.match(/^₹?\s*([\d.]+)\s*Cr(?:ores?)?$/i);
    if (croreMatch) {
      return { type: 'number', value: parseFloat(croreMatch[1]) * 10000000 };
    }

    const kMatch = trimmed.match(/^₹?\s*([\d.]+)\s*k$/i);
    if (kMatch) {
      return { type: 'number', value: parseFloat(kMatch[1]) * 1000 };
    }

    // Cleaned numeric string (e.g. ₹1,50,000 or $500.00)
    const cleanedNumStr = trimmed.replace(/^[₹$€£\s]+/, '').replace(/,/g, '');
    if (cleanedNumStr !== '' && !isNaN(Number(cleanedNumStr))) {
      return { type: 'number', value: Number(cleanedNumStr) };
    }

    // Aging format e.g. "7d", "14d", "1m"
    const agingMatch = trimmed.match(/^(\d+)\s*d$/i);
    if (agingMatch) {
      return { type: 'number', value: parseInt(agingMatch[1], 10) };
    }

    // Standard ISO or valid date string (e.g. "2026-09-10T14:00:00Z" or "2026-09-10")
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      const parsedTime = Date.parse(trimmed);
      if (!isNaN(parsedTime)) {
        return { type: 'date', value: parsedTime };
      }
    }

    return { type: 'string', value: trimmed.toLowerCase() };
  }

  // Boolean
  if (typeof val === 'boolean') {
    return { type: 'number', value: val ? 1 : 0 };
  }

  return { type: 'string', value: String(val).toLowerCase() };
}

/**
 * Natural comparison function that handles numbers, text, dates, currency, and IDs.
 */
function compareValues(a: any, b: any): number {
  const normA = normalizeComparableValue(a);
  const normB = normalizeComparableValue(b);

  // Missing / null values always sorted to bottom regardless of order
  if (normA.type === 'null' && normB.type === 'null') return 0;
  if (normA.type === 'null') return 1;
  if (normB.type === 'null') return -1;

  // Numeric & Currency comparison
  if (normA.type === 'number' && normB.type === 'number') {
    return normA.value - normB.value;
  }

  // Date comparison
  if (normA.type === 'date' && normB.type === 'date') {
    return normA.value - normB.value;
  }

  // String comparison with natural alphanumeric sorting (e.g. APP-2 before APP-10)
  return String(normA.value).localeCompare(String(normB.value), undefined, {
    numeric: true,
    sensitivity: 'base',
  });
}

export function useTableSort<T>(options: UseTableSortOptions<T> = {}) {
  const { initialKey = null, initialDirection = null, getValue } = options;

  const [sortState, setSortState] = useState<SortState<any>>({
    key: initialKey,
    direction: initialDirection,
  });

  /**
   * 3-state toggle: null -> 'asc' -> 'desc' -> null
   */
  const handleSort = useCallback((key: string) => {
    setSortState((prev) => {
      if (prev.key !== key) {
        return { key, direction: 'asc' };
      }
      if (prev.direction === 'asc') {
        return { key, direction: 'desc' };
      }
      if (prev.direction === 'desc') {
        return { key: null, direction: null };
      }
      return { key, direction: 'asc' };
    });
  }, []);

  /**
   * Sorts the provided dataset based on current sortState
   */
  const sortData = useCallback(
    (data: T[]): T[] => {
      if (!sortState.key || !sortState.direction || !data || data.length === 0) {
        return data;
      }

      const key = sortState.key;
      const isAsc = sortState.direction === 'asc';
      const customExtractor = getValue?.[key as string];

      return [...data].sort((itemA, itemB) => {
        let valA = customExtractor ? customExtractor(itemA) : (itemA as any)?.[key];
        let valB = customExtractor ? customExtractor(itemB) : (itemB as any)?.[key];

        const diff = compareValues(valA, valB);
        return isAsc ? diff : -diff;
      });
    },
    [sortState, getValue]
  );

  return {
    sortState,
    setSortState,
    handleSort,
    sortData,
  };
}
