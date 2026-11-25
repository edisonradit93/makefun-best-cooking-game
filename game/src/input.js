import { audio } from './audio.js';

export class InputController {
  constructor(canvas, renderer, state, callbacks = {}) {
    this.canvas = canvas;
    this.renderer = renderer;
    this.state = state;
    this.callbacks = callbacks;
    this.keys = new Set();

    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onMouseDown = this._onMouseDown.bind(this);
    this._onBlur = this._onBlur.bind(this);

    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', this._onBlur);
    canvas.addEventListener('mousemove', this._onMouseMove);
    canvas.addEventListener('mousedown', this._onMouseDown);
  }

  _onBlur() {
    this.keys.clear();
  }

  _onKeyDown(e) {
    const code = e.code;
    audio.unlock();

    if (code === 'Escape') {
      this.callbacks.onEscape?.();
      return;
    }

    if (code === 'KeyM') {
      this.callbacks.onToggleAudio?.();
      return;
    }

    if (code === 'KeyR' && !e.ctrlKey && !e.metaKey) {
      this.callbacks.onToggleRecipes?.();
      return;
    }

    if (this.state.phase !== 'playing' || this.callbacks.isModalOpen?.()) {
      if ((code === 'Enter' || code === 'Space') && this.state.phase === 'start' && !this.callbacks.isModalOpen?.()) {
        e.preventDefault();
        this.callbacks.onStartPlay?.();
      }
      return;
    }

    if (
      code === 'Space' ||
      code === 'ArrowUp' ||
      code === 'ArrowDown' ||
      code === 'ArrowLeft' ||
      code === 'ArrowRight'
    ) {
      e.preventDefault();
    }

    this.keys.add(code);

    if (e.repeat) return;

    if (code === 'Space' || code === 'KeyE') {
      this.state.interactFocused();
    } else if (code === 'KeyQ' || code === 'KeyX') {
      this.state.discardHolding();
    } else if (code === 'Digit1') {
      this.state.quickDispatch(1);
    } else if (code === 'Digit2') {
      this.state.quickDispatch(2);
    } else if (code === 'Digit3') {
      this.state.quickDispatch(3);
    } else if (code === 'Digit4') {
      this.state.quickDispatch(4);
    }
  }

  _onKeyUp(e) {
    this.keys.delete(e.code);
  }

  _findStationAt(worldX, worldY) {
    const pad = 8;
    for (const st of this.state.stations) {
      if (
        worldX >= st.x - pad &&
        worldX <= st.x + st.w + pad &&
        worldY >= st.y - pad &&
        worldY <= st.y + st.h + pad
      ) {
        return st;
      }
    }
    return null;
  }

  _onMouseMove(e) {
    if (this.state.phase !== 'playing') {
      this.state.hoveredStationId = null;
      return;
    }
    const { x, y } = this.renderer.clientToWorld(e.clientX, e.clientY);
    const st = this._findStationAt(x, y);
    this.state.hoveredStationId = st ? st.id : null;
  }

  _onMouseDown(e) {
    if (e.button !== 0) return;
    audio.unlock();
    if (this.state.phase !== 'playing' || this.callbacks.isModalOpen?.()) return;

    const { x, y } = this.renderer.clientToWorld(e.clientX, e.clientY);
    const st = this._findStationAt(x, y);
    if (st) {
      this.state.navigateToStation(st.id);
    } else {
      this.state.navigateToPoint(x, y, null);
    }
  }

  getMovementVector() {
    if (this.state.phase !== 'playing' || this.callbacks.isModalOpen?.()) {
      return { x: 0, y: 0 };
    }
    let x = 0;
    let y = 0;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) y -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) y += 1;
    return { x, y };
  }
}
