import { create } from "zustand";

interface UiState {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (isOpen: boolean) => void;
  
  isMobileLayout: boolean;
  setMobileLayout: (isMobile: boolean) => void;
  
  activePane: 'chat' | 'pdf'; // For mobile view
  setActivePane: (pane: 'chat' | 'pdf') => void;
  
  pdfPage: number;
  setPdfPage: (page: number) => void;
}

export const useUiStore = create<UiState>((set) => ({
  isSidebarOpen: true,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),
  
  isMobileLayout: false,
  setMobileLayout: (isMobile) => set({ isMobileLayout: isMobile }),
  
  activePane: 'chat',
  setActivePane: (pane) => set({ activePane: pane }),
  
  pdfPage: 1,
  setPdfPage: (page) => set({ pdfPage: page }),
}));
