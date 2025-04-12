import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../../utils/axios';

// Async thunks
export const fetchKanbanBoard = createAsyncThunk(
  'kanban/fetchBoard',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get('/kanban/board');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch Kanban board');
    }
  }
);

export const moveKanbanCard = createAsyncThunk(
  'kanban/moveCard',
  async ({ caseId, newStatus }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.patch(`/kanban/move/${caseId}`, { newStatus });
      return { caseId, newStatus, response: response.data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to move card');
    }
  }
);

// Initial state
const initialState = {
  lanes: [],
  loading: false,
  error: null,
  movingCard: false
};

// Slice
const kanbanSlice = createSlice({
  name: 'kanban',
  initialState,
  reducers: {
    clearKanbanError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // fetchKanbanBoard
      .addCase(fetchKanbanBoard.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchKanbanBoard.fulfilled, (state, action) => {
        state.loading = false;
        state.lanes = action.payload;
      })
      .addCase(fetchKanbanBoard.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch Kanban board';
      })
      
      // moveKanbanCard
      .addCase(moveKanbanCard.pending, (state) => {
        state.movingCard = true;
        state.error = null;
      })
      .addCase(moveKanbanCard.fulfilled, (state, action) => {
        state.movingCard = false;
        
        // Find the case in the current lane and move it to the new lane
        const { caseId, newStatus } = action.payload;
        
        // Find and remove the case from its current lane
        let caseToMove;
        state.lanes = state.lanes.map(lane => {
          const caseIndex = lane.cases.findIndex(c => c.id === caseId);
          if (caseIndex !== -1) {
            caseToMove = lane.cases[caseIndex];
            return {
              ...lane,
              cases: lane.cases.filter(c => c.id !== caseId)
            };
          }
          return lane;
        });
        
        // Add the case to the new lane
        if (caseToMove) {
          state.lanes = state.lanes.map(lane => {
            if (lane.id === newStatus) {
              return {
                ...lane,
                cases: [caseToMove, ...lane.cases]
              };
            }
            return lane;
          });
        }
      })
      .addCase(moveKanbanCard.rejected, (state, action) => {
        state.movingCard = false;
        state.error = action.payload || 'Failed to move card';
      });
  }
});

export const { clearKanbanError } = kanbanSlice.actions;

// Selectors
export const selectKanbanLanes = (state) => state.kanban.lanes;
export const selectKanbanLoading = (state) => state.kanban.loading;
export const selectKanbanError = (state) => state.kanban.error;
export const selectMovingCard = (state) => state.kanban.movingCard;

export default kanbanSlice.reducer;
