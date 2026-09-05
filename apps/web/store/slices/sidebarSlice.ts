import { createSlice } from "@reduxjs/toolkit";

export type SidebarPanel = "settings" | "share" | null;

export interface SidebarState {
  openPanel: SidebarPanel;
  mobileNavOpen: boolean;
  collapsed: boolean;
  darkUI: boolean;
}

const initialState: SidebarState = {
  openPanel: null,
  mobileNavOpen: false,
  collapsed: false,
  darkUI: false,
};

export const sidebarSlice = createSlice({
  name: "sidebar",
  initialState,
  reducers: {
    openSidebarPanel(state, action: { payload: SidebarPanel }) {
      state.openPanel = action.payload;
    },
    closeSidebarPanel(state) {
      state.openPanel = null;
    },
    toggleSidebarPanel(state, action: { payload: SidebarPanel }) {
      state.openPanel =
        state.openPanel === action.payload ? null : action.payload;
    },
    openMobileNav(state) {
      state.mobileNavOpen = true;
    },
    closeMobileNav(state) {
      state.mobileNavOpen = false;
    },
    toggleCollapsed(state) {
      state.collapsed = !state.collapsed;
    },
    toggleDarkUI(state) {
      state.darkUI = !state.darkUI;
    },
    setDarkUI(state, action: { payload: boolean }) {
      state.darkUI = action.payload;
    },
  },
});

export const {
  openSidebarPanel,
  closeSidebarPanel,
  toggleSidebarPanel,
  openMobileNav,
  closeMobileNav,
  toggleCollapsed,
  toggleDarkUI,
  setDarkUI,
} = sidebarSlice.actions;

export default sidebarSlice.reducer;
