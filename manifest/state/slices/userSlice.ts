import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { RootState } from "../store";
import { CurrentUser } from "@/types/user";
import { isNotNil } from "@/utils/jsUtils";

const initialState: CurrentUser = { emailVerified: false };

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setUser: (_, action: PayloadAction<CurrentUser>) => ({
      ...action.payload,
    }),
    setUsername: (state, action: PayloadAction<string>) => {
      state.username = action.payload;
    },
    clearUser: () => initialState,
  },
});

export const selectCurrentUserId = (state: RootState) => state.user.id;

export const selectIsUserSignedIn = (state: RootState): boolean =>
  !!state.user.id;

export const selectIsUserRegistered = (state: RootState): boolean =>
  isNotNil(state.user.id) && isNotNil(state.user.username);

export const selectIsUserVerified = (state: RootState): boolean =>
  !!state.user.emailVerified;

export const { setUsername, setUser, clearUser } = userSlice.actions;

export default userSlice.reducer;
