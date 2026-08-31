import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface StageFilterState {
  selectedStageKey: string | null;
  selectedStageTab: string | null;
}

const initialState: StageFilterState = {
  selectedStageKey: null,
  selectedStageTab: 'all',
};

const stageSlice = createSlice({
  name: 'stageFilter',
  initialState,
  reducers: {
    setSelectedStageKey(state, action: PayloadAction<string | null>) {
      state.selectedStageKey = action.payload;
      if (action.payload === null) {
        state.selectedStageTab = 'all';
      } else {
        state.selectedStageTab = action.payload;
      }
    },
    setSelectedStageTab(state, action: PayloadAction<string>) {
      state.selectedStageTab = action.payload;
      state.selectedStageKey = action.payload === 'all' ? null : action.payload;
    },
    clearStageFilter(state) {
      state.selectedStageKey = null;
      state.selectedStageTab = 'all';
    },
  },
});

export const {
  setSelectedStageKey,
  setSelectedStageTab,
  clearStageFilter,
} = stageSlice.actions;

export default stageSlice.reducer;