const MOVEMENT_KEYS = new Map([
  ["ArrowUp", { x: 0, y: -1 }],
  ["KeyW", { x: 0, y: -1 }],
  ["ArrowDown", { x: 0, y: 1 }],
  ["KeyS", { x: 0, y: 1 }],
  ["ArrowLeft", { x: -1, y: 0 }],
  ["KeyA", { x: -1, y: 0 }],
  ["ArrowRight", { x: 1, y: 0 }],
  ["KeyD", { x: 1, y: 0 }],
]);

export class InputManager {
  constructor(canvas) {
    this.keysDown = new Set();
    this.pendingKeyPresses = new Set();
    this.frameKeyPresses = new Set();
    this.pointer = {
      active: false,
      x: 0,
      y: 0,
    };
    this.pendingPointerPress = false;
    this.pendingPointerRelease = false;
    this.framePointerPress = false;
    this.framePointerRelease = false;
    this.pointerTap = false;
    this.framePointerTap = false;
    this.doubleTap = false;
    this._pointerIdentifier = null;
    this._lastTapTime = 0;

    window.addEventListener("keydown", (event) => {
      if (event.repeat) return;
      this.keysDown.add(event.code);
      this.pendingKeyPresses.add(event.code);
    });

    window.addEventListener("keyup", (event) => {
      this.keysDown.delete(event.code);
    });

    const updatePointerPosition = (event) => {
      const rect = canvas.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * canvas.clientWidth;
      const y = ((event.clientY - rect.top) / rect.height) * canvas.clientHeight;
      this.pointer.x = x;
      this.pointer.y = y;
    };

    canvas.addEventListener("pointerdown", (event) => {
      canvas.setPointerCapture(event.pointerId);
      updatePointerPosition(event);
      this.pointer.active = true;
      this._pointerIdentifier = event.pointerId;
      this.pendingPointerPress = true;
      this.pointerTap = true;
      event.preventDefault();
    });

    canvas.addEventListener("pointermove", (event) => {
      if (this._pointerIdentifier !== event.pointerId) return;
      const previousX = this.pointer.x;
      const previousY = this.pointer.y;
      updatePointerPosition(event);
      if (Math.hypot(this.pointer.x - previousX, this.pointer.y - previousY) > 16) {
        this.pointerTap = false;
      }
      event.preventDefault();
    });

    const releasePointer = (event) => {
      if (this._pointerIdentifier !== event.pointerId) return;
      updatePointerPosition(event);
      this.pointer.active = false;
      this.pendingPointerRelease = true;
      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
      this._pointerIdentifier = null;
      event.preventDefault();
    };

    canvas.addEventListener("pointerup", releasePointer);
    canvas.addEventListener("pointercancel", releasePointer);

    canvas.addEventListener("contextmenu", (event) => event.preventDefault());
  }

  beginFrame() {
    this.frameKeyPresses = this.pendingKeyPresses;
    this.pendingKeyPresses = new Set();
    this.framePointerPress = this.pendingPointerPress;
    this.framePointerRelease = this.pendingPointerRelease;
    this.pendingPointerPress = false;
    this.pendingPointerRelease = false;
    this.framePointerTap = this.pointerTap;
    this.doubleTap = false;
    if (this.pointerTap) {
      const now = typeof performance !== "undefined" ? performance.now() : Date.now();
      if (now - this._lastTapTime < 280) {
        this.doubleTap = true;
      }
      this._lastTapTime = now;
    }
    this.pointerTap = false;
  }

  isKeyDown(code) {
    return this.keysDown.has(code);
  }

  wasKeyPressed(code) {
    return this.frameKeyPresses.has(code);
  }

  consumePointerPress() {
    if (this.framePointerPress) {
      this.framePointerPress = false;
      return true;
    }
    return false;
  }

  pointerReleasedThisFrame() {
    return this.framePointerRelease;
  }

  consumeTap() {
    if (this.framePointerTap) {
      this.framePointerTap = false;
      return true;
    }
    return false;
  }

  consumeDoubleTap() {
    if (this.doubleTap) {
      this.doubleTap = false;
      return true;
    }
    return false;
  }

  getMovementVector() {
    let x = 0;
    let y = 0;
    for (const [code, vector] of MOVEMENT_KEYS) {
      if (this.keysDown.has(code)) {
        x += vector.x;
        y += vector.y;
      }
    }
    if (x !== 0 || y !== 0) {
      const length = Math.hypot(x, y) || 1;
      return { x: x / length, y: y / length };
    }
    return { x: 0, y: 0 };
  }

  isFiring() {
    return (
      this.pointer.active ||
      this.isKeyDown("Space") ||
      this.isKeyDown("KeyZ") ||
      this.isKeyDown("Enter")
    );
  }

  consumeConfirm() {
    const confirmPressed =
      this.wasKeyPressed("Enter") ||
      this.wasKeyPressed("Space") ||
      this.consumeTap() ||
      this.consumePointerPress();
    return confirmPressed;
  }
}
