const STORAGE_KEY = "starfighter-best-score";

export class GameStorage {
  constructor() {
    this.bestScore = 0;
    this._load();
  }

  _load() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const value = parseInt(raw, 10);
        if (!Number.isNaN(value)) {
          this.bestScore = value;
        }
      }
    } catch (err) {
      // localStorage may be blocked; fail silently
      console.warn("Unable to access localStorage", err);
    }
  }

  updateBestScore(score) {
    if (score > this.bestScore) {
      this.bestScore = score;
      try {
        window.localStorage.setItem(STORAGE_KEY, String(score));
      } catch (err) {
        console.warn("Unable to persist best score", err);
      }
    }
  }
}
