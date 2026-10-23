import { useState, useRef, useCallback, useEffect } from 'react';
import type { AutoSaveStatus } from '@/components/common/AutoSaveStatusBadge';

export interface UseAutoSaveOptions {
  onSave: (patch: Record<string, any>) => Promise<any>;
  onSuccess?: (patch: Record<string, any>, response?: any) => void;
  onError?: (patch: Record<string, any>, error: any) => void;
}

export function areValuesEqual(valA: any, valB: any): boolean {
  if (valA === valB) return true;
  // Handle empty / null / undefined equivalence
  if ((valA === null || valA === undefined || valA === '') && (valB === null || valB === undefined || valB === '')) {
    return true;
  }
  // Number equivalence (e.g. 0 vs "0", NaN vs NaN)
  if (typeof valA === 'number' && typeof valB === 'number') {
    if (isNaN(valA) && isNaN(valB)) return true;
    return valA === valB;
  }
  // Array shallow equality (e.g. tag_names, assignee_ids)
  if (Array.isArray(valA) && Array.isArray(valB)) {
    if (valA.length !== valB.length) return false;
    const sortedA = [...valA].sort();
    const sortedB = [...valB].sort();
    return sortedA.every((v, i) => v === sortedB[i]);
  }
  // String trim comparison
  if (typeof valA === 'string' && typeof valB === 'string') {
    return valA.trim() === valB.trim();
  }
  // Object shallow equality
  if (valA && valB && typeof valA === 'object' && typeof valB === 'object') {
    return JSON.stringify(valA) === JSON.stringify(valB);
  }
  return false;
}

export function useAutoSave({ onSave, onSuccess, onError }: UseAutoSaveOptions) {
  const [status, setStatus] = useState<AutoSaveStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  // Track any failed patch for retry
  const failedPatchRef = useRef<{ patch: Record<string, any>; originalValues: Record<string, any> } | null>(null);

  // Track pending un-blurred changes so they are saved if unmounting / switching tabs
  const pendingPatchRef = useRef<Record<string, { value: any; originalValue: any }>>({});

  const saveField = useCallback(
    async (fieldName: string, value: any, originalValue: any): Promise<boolean> => {
      // Remove from pending since we are saving now
      delete pendingPatchRef.current[fieldName];

      // Prevent unnecessary duplicate API calls
      if (areValuesEqual(value, originalValue)) {
        return true;
      }

      setStatus('saving');
      setErrorMessage(null);

      const patch = { [fieldName]: value };

      try {
        const response = await onSaveRef.current(patch);
        setStatus('saved');
        setLastSaved(new Date());
        failedPatchRef.current = null;
        if (onSuccessRef.current) {
          onSuccessRef.current(patch, response);
        }
        return true;
      } catch (err: any) {
        setStatus('error');
        failedPatchRef.current = { patch, originalValues: { [fieldName]: originalValue } };
        let msg = 'Failed to save changes';
        if (typeof err?.data?.detail === 'string') {
          msg = err.data.detail;
        } else if (Array.isArray(err?.data?.detail) && err.data.detail[0]?.msg) {
          msg = err.data.detail[0].msg;
        } else if (err?.data?.message) {
          msg = err.data.message;
        } else if (err?.message) {
          msg = err.message;
        }
        setErrorMessage(msg);
        if (onErrorRef.current) {
          onErrorRef.current(patch, err);
        }
        return false;
      }
    },
    []
  );

  const saveMultiple = useCallback(
    async (patch: Record<string, any>, originalValues: Record<string, any>): Promise<boolean> => {
      const filteredPatch: Record<string, any> = {};
      let hasChanges = false;

      for (const key of Object.keys(patch)) {
        delete pendingPatchRef.current[key];
        if (!areValuesEqual(patch[key], originalValues[key])) {
          filteredPatch[key] = patch[key];
          hasChanges = true;
        }
      }

      if (!hasChanges) {
        return true;
      }

      setStatus('saving');
      setErrorMessage(null);

      try {
        const response = await onSaveRef.current(filteredPatch);
        setStatus('saved');
        setLastSaved(new Date());
        failedPatchRef.current = null;
        if (onSuccessRef.current) {
          onSuccessRef.current(filteredPatch, response);
        }
        return true;
      } catch (err: any) {
        setStatus('error');
        failedPatchRef.current = { patch: filteredPatch, originalValues };
        let msg = 'Failed to save changes';
        if (typeof err?.data?.detail === 'string') {
          msg = err.data.detail;
        } else if (Array.isArray(err?.data?.detail) && err.data.detail[0]?.msg) {
          msg = err.data.detail[0].msg;
        } else if (err?.data?.message) {
          msg = err.data.message;
        } else if (err?.message) {
          msg = err.message;
        }
        setErrorMessage(msg);
        if (onErrorRef.current) {
          onErrorRef.current(filteredPatch, err);
        }
        return false;
      }
    },
    []
  );

  const retry = useCallback(async (): Promise<boolean> => {
    if (!failedPatchRef.current) return false;
    const { patch, originalValues } = failedPatchRef.current;
    return saveMultiple(patch, originalValues);
  }, [saveMultiple]);

  const registerPendingChange = useCallback((fieldName: string, value: any, originalValue: any) => {
    if (areValuesEqual(value, originalValue)) {
      delete pendingPatchRef.current[fieldName];
    } else {
      pendingPatchRef.current[fieldName] = { value, originalValue };
    }
  }, []);

  const flushPending = useCallback(async () => {
    const pendingKeys = Object.keys(pendingPatchRef.current);
    if (pendingKeys.length === 0) return;

    const patch: Record<string, any> = {};
    const originalValues: Record<string, any> = {};

    for (const key of pendingKeys) {
      patch[key] = pendingPatchRef.current[key].value;
      originalValues[key] = pendingPatchRef.current[key].originalValue;
    }

    pendingPatchRef.current = {};
    await saveMultiple(patch, originalValues);
  }, [saveMultiple]);

  // Flush any pending un-blurred changes when the component unmounts
  useEffect(() => {
    return () => {
      const pendingKeys = Object.keys(pendingPatchRef.current);
      if (pendingKeys.length > 0) {
        const patch: Record<string, any> = {};
        for (const key of pendingKeys) {
          patch[key] = pendingPatchRef.current[key].value;
        }
        pendingPatchRef.current = {};
        // Fire asynchronously on unmount
        onSaveRef.current(patch).catch(() => {});
      }
    };
  }, []);

  return {
    status,
    setStatus,
    errorMessage,
    lastSaved,
    saveField,
    saveMultiple,
    retry,
    registerPendingChange,
    flushPending,
  };
}
