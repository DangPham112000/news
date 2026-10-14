import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface UiState {
  /** Topic slug, or null for all topics. */
  topic: string | null;
  /** Text typed in the search box. */
  query: string;
}

const initialState: UiState = { topic: null, query: '' };

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setTopic(state, action: PayloadAction<string | null>) {
      state.topic = action.payload;
    },
    setQuery(state, action: PayloadAction<string>) {
      state.query = action.payload;
    },
  },
});

export const { setTopic, setQuery } = uiSlice.actions;
export default uiSlice.reducer;
