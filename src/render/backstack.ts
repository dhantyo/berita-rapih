/**
 * Back (Android's back button, the browser's, an iPhone edge swipe) closes the reader's topmost layer —
 * the settings panel, the feedback page and its sub-pages, the editor — instead of leaving the news site.
 *
 * Each open layer owns one history entry. Back pops the top layer (its handler closes it). Closing a layer
 * any other way (✕, Selesai, tapping outside) calls `release`, which drops that entry again so history stays
 * as it was. Moving from one layer straight to the next (Pengaturan → Beri masukan → Atur isi artikel) hands the
 * same entry over (`hand`) rather than dropping one and adding another: history.back() is asynchronous and
 * would race the new entry. The photo viewer keeps its own entry (render/gallery.ts).
 */
export interface BackLayer {
  /** The layer closed another way: drop its history entry. */
  release(): void;
  /** The layer is replaced by the next one, which keeps this entry: Back now calls `onBack` instead. */
  hand(onBack: () => void): BackLayer;
}

export interface BackStack {
  /** A layer opened: Back now calls `onBack` (which closes it, without calling release). */
  push(onBack: () => void): BackLayer;
}

export function createBackStack(win: Window): BackStack {
  const layers: Array<{ onBack: () => void }> = [];
  let ownPops = 0; // history.back() calls we made ourselves; their popstate isn't the reader pressing Back

  win.addEventListener('popstate', () => {
    if (ownPops > 0) {
      ownPops--;
      return;
    }
    layers.pop()?.onBack();
  });

  const none: BackLayer = { release: () => {}, hand: () => none };
  const layerFor = (slot: { onBack: () => void }): BackLayer => ({
    release() {
      const i = layers.indexOf(slot);
      if (i < 0) return; // already popped by Back
      layers.splice(i, 1);
      ownPops++;
      win.history.back();
    },
    hand(onBack) {
      slot.onBack = onBack;
      return layerFor(slot);
    },
  });

  return {
    push(onBack) {
      try {
        win.history.pushState({ ...(win.history.state ?? {}), sapuLayer: layers.length + 1 }, '');
      } catch {
        return none; // sandboxed or blocked history: Back simply leaves the page, as before
      }
      const slot = { onBack };
      layers.push(slot);
      return layerFor(slot);
    },
  };
}
