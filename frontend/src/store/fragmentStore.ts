import { create } from 'zustand';
import type { SkillFragment } from '@/types/fragment';

interface FragmentState {
  fragments: SkillFragment[];
  setFragments: (fragments: SkillFragment[]) => void;
  addFragment: (fragment: SkillFragment) => void;
  removeFragment: (id: string) => void;
  clearFragments: () => void;
}

export const useFragmentStore = create<FragmentState>((set) => ({
  fragments: [],
  setFragments: (fragments) => set({ fragments }),
  addFragment: (fragment) =>
    set((state) => ({ fragments: [...state.fragments, fragment] })),
  removeFragment: (id) =>
    set((state) => ({
      fragments: state.fragments.filter((f) => f.id !== id),
    })),
  clearFragments: () => set({ fragments: [] }),
}));