export type GuidedDemoPhase = 'themes' | 'editor';

export type GuidedDemoState = {
  active: boolean;
  phase: GuidedDemoPhase;
  stepIndex: number;
  presentationId?: string;
  themeId?: string;
  showcaseThemeIds: string[];
  paused?: boolean;
};

const KEY = 'prezgen-guided-demo-state';

export function readGuidedDemoState(): GuidedDemoState | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GuidedDemoState;
    if (!parsed || !parsed.active) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeGuidedDemoState(next: GuidedDemoState) {
  window.localStorage.setItem(KEY, JSON.stringify(next));
}

export function clearGuidedDemoState() {
  window.localStorage.removeItem(KEY);
}
