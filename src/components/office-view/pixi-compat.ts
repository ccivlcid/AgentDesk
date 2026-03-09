/**
 * pixi-compat.ts  —  PixiJS v8 → Phaser 3 compatibility shim
 * All office-view drawing code imports from this file instead of "pixi.js".
 */

import * as Phaser from "phaser";

// ─── Global scene reference ───────────────────────────────────────────────────
let _scene: Phaser.Scene | null = null;
export function setCurrentScene(s: Phaser.Scene) { _scene = s; }
export function getCurrentScene() { return _scene; }
function requireScene(): Phaser.Scene {
  if (!_scene) throw new Error("[pixi-compat] No active Phaser scene.");
  return _scene;
}

// ─── Internal: unwrap compat nodes ───────────────────────────────────────────
export function getInnerObj(node: CompatNode): Phaser.GameObjects.GameObject {
  return (node as any)._obj;
}

// ─── Helper: VectorProxy (position/scale/anchor) ─────────────────────────────
class VecProxy {
  constructor(
    private _gx: () => number, private _sx: (v: number) => void,
    private _gy: () => number, private _sy: (v: number) => void,
    private _setFn: (x: number, y: number) => void,
  ) {}
  get x() { return this._gx(); }  set x(v: number) { this._sx(v); }
  get y() { return this._gy(); }  set y(v: number) { this._sy(v); }
  set(x: number, y = x) { this._setFn(x, y); }
}

// ─── FillStyle / StrokeStyle helpers ─────────────────────────────────────────
type FillArg   = number | { color?: number; alpha?: number } | null | undefined;
type StrokeArg = number | { width?: number; color?: number; alpha?: number } | null | undefined;

function parseFill(arg: FillArg): { color: number; alpha: number } {
  if (!arg && arg !== 0) return { color: 0xffffff, alpha: 1 };
  if (typeof arg === "number") return { color: arg, alpha: 1 };
  return { color: arg.color ?? 0xffffff, alpha: arg.alpha ?? 1 };
}
function parseStroke(arg: StrokeArg): { width: number; color: number; alpha: number } {
  if (!arg && arg !== 0) return { width: 1, color: 0x000000, alpha: 1 };
  if (typeof arg === "number") return { width: arg, color: 0x000000, alpha: 1 };
  return { width: arg.width ?? 1, color: arg.color ?? 0x000000, alpha: arg.alpha ?? 1 };
}

// ─── TextStyle ─────────────────────────────────────────────────────────────────
export class TextStyle {
  fontSize: number;
  fill: number | string;
  fontFamily: string;
  fontWeight: string;
  align: string;
  letterSpacing: number;
  wordWrap?: { width: number; breakWords?: boolean } | false;
  wordWrapWidth?: number;
  dropShadow?: boolean | { alpha?: number; blur?: number; distance?: number; color?: number };
  stroke?: { color?: number; width?: number; alpha?: number };

  constructor(s: {
    fontSize?: number; fill?: number | string; fontFamily?: string;
    fontWeight?: string; align?: string; letterSpacing?: number;
    wordWrap?: { width: number; breakWords?: boolean } | boolean;
    wordWrapWidth?: number;
    breakWords?: boolean;
    dropShadow?: boolean | { alpha?: number; blur?: number; distance?: number; color?: number };
    stroke?: { color?: number; width?: number; alpha?: number };
  } = {}) {
    this.fontSize     = s.fontSize ?? 12;
    this.fill         = s.fill ?? 0xffffff;
    this.fontFamily   = s.fontFamily ?? "monospace";
    this.fontWeight   = s.fontWeight ?? "normal";
    this.align        = s.align ?? "left";
    this.letterSpacing = s.letterSpacing ?? 0;
    this.dropShadow   = s.dropShadow;
    this.stroke       = s.stroke;
    this.wordWrapWidth = s.wordWrapWidth;
    if (typeof s.wordWrap === "boolean") {
      this.wordWrap = s.wordWrap ? { width: s.wordWrapWidth ?? 200 } : false;
    } else {
      this.wordWrap = s.wordWrap;
    }
  }

  toPhaserStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    const fillStr = typeof this.fill === "number"
      ? "#" + this.fill.toString(16).padStart(6, "0")
      : String(this.fill);
    return {
      fontSize: `${this.fontSize}px`,
      color: fillStr,
      fontFamily: this.fontFamily,
      fontStyle: this.fontWeight === "bold" ? "bold" : "normal",
      align: this.align as any,
      letterSpacing: this.letterSpacing,
      wordWrap: this.wordWrap
        ? { width: (this.wordWrap as { width: number }).width, useAdvancedWrap: (this.wordWrap as any).breakWords }
        : undefined,
    };
  }
}

// ─── Text ──────────────────────────────────────────────────────────────────────
export class Text {
  _obj: Phaser.GameObjects.Text;
  name = "";

  private _anchor: VecProxy;
  private _position: VecProxy;
  private _scale: VecProxy;

  constructor(opts: { text: string; style?: TextStyle | Phaser.Types.GameObjects.Text.TextStyle }) {
    const sc = requireScene();
    const pStyle = opts.style instanceof TextStyle
      ? opts.style.toPhaserStyle()
      : (opts.style ?? {});
    this._obj = new Phaser.GameObjects.Text(sc, 0, 0, opts.text ?? "", pStyle);
    this._anchor  = new VecProxy(
      () => this._obj.originX, v => this._obj.setOrigin(v, this._obj.originY),
      () => this._obj.originY, v => this._obj.setOrigin(this._obj.originX, v),
      (x, y) => this._obj.setOrigin(x, y),
    );
    this._position = new VecProxy(
      () => this._obj.x, v => { this._obj.x = v; },
      () => this._obj.y, v => { this._obj.y = v; },
      (x, y) => this._obj.setPosition(x, y),
    );
    this._scale = new VecProxy(
      () => this._obj.scaleX, v => { this._obj.scaleX = v; },
      () => this._obj.scaleY, v => { this._obj.scaleY = v; },
      (x, y) => this._obj.setScale(x, y),
    );
  }

  get text()           { return this._obj.text; }
  set text(v: string)  { this._obj.setText(v); }
  get anchor()         { return this._anchor; }
  get position()       { return this._position; }
  get scale()          { return this._scale; }
  get x()              { return this._obj.x; }
  set x(v: number)     { this._obj.x = v; }
  get y()              { return this._obj.y; }
  set y(v: number)     { this._obj.y = v; }
  get width()          { return this._obj.width; }
  get height()         { return this._obj.height; }
  get alpha()          { return this._obj.alpha; }
  set alpha(v: number) { this._obj.setAlpha(v); }
  get visible()           { return this._obj.visible; }
  set visible(v: boolean) { this._obj.setVisible(v); }
  get rotation()          { return this._obj.rotation; }
  set rotation(v: number) { this._obj.setRotation(v); }
  get parent(): Container | null {
    const p = this._obj.parentContainer;
    if (!p) return null;
    const w: any = Object.create(null); w._obj = p; return w as Container;
  }
  get destroyed()         { return !this._obj.scene; }
  destroy(_opts?: { children?: boolean }) { this._obj.destroy(); }
}

// ─── Graphics ──────────────────────────────────────────────────────────────────
type ShapeSpec =
  | { k: "rect";      x: number; y: number; w: number; h: number }
  | { k: "circle";    cx: number; cy: number; r: number }
  | { k: "ellipse";   cx: number; cy: number; rx: number; ry: number }
  | { k: "rrect";     x: number; y: number; w: number; h: number; r: number }
  | { k: "star";      cx: number; cy: number; pts: number; r: number; ir: number; rot: number }
  | { k: "arc";       cx: number; cy: number; r: number; sa: number; ea: number; anti: boolean }
  | { k: "path";      cmds: PathCmd[] };

type PathCmd =
  | { op: "M"; x: number; y: number }
  | { op: "L"; x: number; y: number }
  | { op: "Q"; cpx: number; cpy: number; x: number; y: number }
  | { op: "A"; cx: number; cy: number; r: number; sa: number; ea: number };

export class Graphics {
  _obj: Phaser.GameObjects.Graphics;
  name = "";
  private _shape: ShapeSpec | null = null;
  private _pathCmds: PathCmd[] = [];
  private _inPath = false;
  private _tintVal = 0xffffff;

  eventMode: string = "none";
  cursor: string = "default";
  private _interactive = false;

  private _position: VecProxy;
  private _scale: VecProxy;

  constructor() {
    this._obj = new Phaser.GameObjects.Graphics(requireScene());
    this._position = new VecProxy(
      () => this._obj.x, v => { this._obj.x = v; },
      () => this._obj.y, v => { this._obj.y = v; },
      (x, y) => this._obj.setPosition(x, y),
    );
    this._scale = new VecProxy(
      () => this._obj.scaleX, v => { this._obj.scaleX = v; },
      () => this._obj.scaleY, v => { this._obj.scaleY = v; },
      (x, y) => this._obj.setScale(x, y),
    );
  }

  on(event: string, cb: (...args: unknown[]) => void) {
    if (!this._interactive) {
      this._obj.setInteractive(
        new Phaser.Geom.Rectangle(-10, -10, 60, 40),
        Phaser.Geom.Rectangle.Contains,
      );
      this._interactive = true;
    }
    this._obj.on(event, cb);
    return this;
  }

  // ── Shape builders ──────────────────────────────────────────────────────────
  private _endPath() { this._inPath = false; this._pathCmds = []; }

  rect(x: number, y: number, w: number, h: number): this {
    this._endPath(); this._shape = { k: "rect", x, y, w, h }; return this;
  }
  circle(cx: number, cy: number, r: number): this {
    this._endPath(); this._shape = { k: "circle", cx, cy, r }; return this;
  }
  ellipse(cx: number, cy: number, rx: number, ry: number): this {
    this._endPath(); this._shape = { k: "ellipse", cx, cy, rx, ry }; return this;
  }
  roundRect(x: number, y: number, w: number, h: number, r = 0): this {
    this._endPath(); this._shape = { k: "rrect", x, y, w, h, r }; return this;
  }
  /** alias */ roundedRect(x: number, y: number, w: number, h: number, r = 0): this {
    return this.roundRect(x, y, w, h, r);
  }
  star(cx: number, cy: number, pts: number, r: number, ir: number, rot = 0): this {
    this._endPath(); this._shape = { k: "star", cx, cy, pts, r, ir, rot }; return this;
  }
  arc(cx: number, cy: number, r: number, sa: number, ea: number, anti = false): this {
    if (this._inPath) {
      this._pathCmds.push({ op: "A", cx, cy, r, sa, ea });
      this._shape = { k: "path", cmds: this._pathCmds };
      return this;
    }
    this._shape = { k: "arc", cx, cy, r, sa, ea, anti }; return this;
  }
  moveTo(x: number, y: number): this {
    if (!this._inPath) { this._inPath = true; this._pathCmds = []; }
    this._pathCmds.push({ op: "M", x, y });
    this._shape = { k: "path", cmds: this._pathCmds }; return this;
  }
  lineTo(x: number, y: number): this {
    if (!this._inPath) this.moveTo(x, y);
    else this._pathCmds.push({ op: "L", x, y });
    this._shape = { k: "path", cmds: this._pathCmds }; return this;
  }
  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): this {
    this._pathCmds.push({ op: "Q", cpx, cpy, x, y });
    this._shape = { k: "path", cmds: this._pathCmds }; return this;
  }
  closePath(): this {
    // close path by connecting back to moveTo (approximate with no-op)
    return this;
  }
  beginPath(): this { this._endPath(); return this; }

  // ── Fill & Stroke ─────────────────────────────────────────────────────────
  fill(arg: FillArg): this {
    if (!this._shape) return this;
    const { color, alpha } = parseFill(arg);
    this._obj.fillStyle(color, alpha);
    this._drawShape(this._shape, "fill");
    return this;
  }
  stroke(arg: StrokeArg): this {
    if (!this._shape) return this;
    const { width, color, alpha } = parseStroke(arg);
    this._obj.lineStyle(width, color, alpha);
    this._drawShape(this._shape, "stroke");
    this._shape = null; this._endPath();
    return this;
  }

  private _drawShape(s: ShapeSpec, mode: "fill" | "stroke") {
    const g = this._obj;
    switch (s.k) {
      case "rect":
        mode === "fill" ? g.fillRect(s.x, s.y, s.w, s.h) : g.strokeRect(s.x, s.y, s.w, s.h); break;
      case "circle":
        mode === "fill" ? g.fillCircle(s.cx, s.cy, s.r) : g.strokeCircle(s.cx, s.cy, s.r); break;
      case "ellipse":
        mode === "fill" ? g.fillEllipse(s.cx, s.cy, s.rx * 2, s.ry * 2)
                        : g.strokeEllipse(s.cx, s.cy, s.rx * 2, s.ry * 2); break;
      case "rrect":
        mode === "fill"
          ? g.fillRoundedRect(s.x, s.y, s.w, s.h, s.r)
          : g.strokeRoundedRect(s.x, s.y, s.w, s.h, s.r);
        break;
      case "star": {
        g.beginPath();
        for (let i = 0; i < s.pts * 2; i++) {
          const angle = (i * Math.PI) / s.pts + s.rot;
          const rad = i % 2 === 0 ? s.r : s.ir;
          const px = s.cx + Math.cos(angle) * rad;
          const py = s.cy + Math.sin(angle) * rad;
          i === 0 ? g.moveTo(px, py) : g.lineTo(px, py);
        }
        g.closePath();
        mode === "fill" ? g.fillPath() : g.strokePath(); break;
      }
      case "arc":
        g.beginPath(); g.arc(s.cx, s.cy, s.r, s.sa, s.ea, s.anti);
        mode === "fill" ? g.fillPath() : g.strokePath(); break;
      case "path": {
        g.beginPath();
        for (const c of s.cmds) {
          switch (c.op) {
            case "M": g.moveTo(c.x, c.y); break;
            case "L": g.lineTo(c.x, c.y); break;
            case "Q": g.lineTo(c.x, c.y); break; // approximate
            case "A": g.arc(c.cx, c.cy, c.r, c.sa, c.ea); break;
          }
        }
        mode === "fill" ? g.fillPath() : g.strokePath(); break;
      }
    }
  }

  clear(): this {
    this._obj.clear(); this._shape = null; this._endPath(); return this;
  }
  setTint(v: number) { this._tintVal = v; return this; } // Graphics has no tint in Phaser
  createGeometryMask() { return this._obj.createGeometryMask(); }

  get position() { return this._position; }
  get scale()    { return this._scale; }
  get x()              { return this._obj.x; }
  set x(v: number)     { this._obj.x = v; }
  get y()              { return this._obj.y; }
  set y(v: number)     { this._obj.y = v; }
  get alpha()          { return this._obj.alpha; }
  set alpha(v: number) { this._obj.setAlpha(v); }
  get visible()           { return this._obj.visible; }
  set visible(v: boolean) { this._obj.setVisible(v); }
  get rotation()          { return this._obj.rotation; }
  set rotation(v: number) { this._obj.setRotation(v); }
  get tint()              { return this._tintVal; }
  set tint(v: number)     { this._tintVal = v; } // Graphics has no tint in Phaser
  get parent(): Container | null {
    const p = this._obj.parentContainer;
    if (!p) return null;
    const w: any = Object.create(null); w._obj = p; return w as Container;
  }
  get destroyed()         { return !this._obj.scene; }
  destroy(_opts?: { children?: boolean }) { this._obj.destroy(); }
}

// ─── Sprite ────────────────────────────────────────────────────────────────────
export class Sprite {
  _obj: Phaser.GameObjects.Image;
  name = "";
  private _anchor: VecProxy;
  private _scale: VecProxy;
  private _position: VecProxy;

  constructor(texture?: Texture | null) {
    const sc = requireScene();
    const key = texture?._key ?? "__MISSING__";
    this._obj = new Phaser.GameObjects.Image(sc, 0, 0, key);
    this._anchor = new VecProxy(
      () => this._obj.originX, v => this._obj.setOrigin(v, this._obj.originY),
      () => this._obj.originY, v => this._obj.setOrigin(this._obj.originX, v),
      (x, y) => this._obj.setOrigin(x, y),
    );
    this._scale = new VecProxy(
      () => this._obj.scaleX, v => { this._obj.scaleX = v; },
      () => this._obj.scaleY, v => { this._obj.scaleY = v; },
      (x, y) => this._obj.setScale(x, y),
    );
    this._position = new VecProxy(
      () => this._obj.x, v => { this._obj.x = v; },
      () => this._obj.y, v => { this._obj.y = v; },
      (x, y) => this._obj.setPosition(x, y),
    );
  }

  get anchor()            { return this._anchor; }
  get scale()             { return this._scale; }
  get position()          { return this._position; }
  get x()                 { return this._obj.x; }
  set x(v: number)        { this._obj.x = v; }
  get y()                 { return this._obj.y; }
  set y(v: number)        { this._obj.y = v; }
  get width()             { return this._obj.displayWidth; }
  set width(v: number)    { this._obj.setDisplaySize(v, this._obj.displayHeight); }
  get height()            { return this._obj.displayHeight; }
  set height(v: number)   { this._obj.setDisplaySize(this._obj.displayWidth, v); }
  get alpha()             { return this._obj.alpha; }
  set alpha(v: number)    { this._obj.setAlpha(v); }
  get visible()              { return this._obj.visible; }
  set visible(v: boolean)    { this._obj.setVisible(v); }
  get rotation()             { return this._obj.rotation; }
  set rotation(v: number)    { this._obj.setRotation(v); }
  get tint()                 { return this._obj.tintTopLeft; }
  set tint(v: number)        { this._obj.setTint(v); }
  get texture(): Texture     { const t = this._obj.texture; return new Texture(t.key, t); }
  get destroyed()            { return !this._obj.scene; }
  destroy()                  { this._obj.destroy(); }
}

// ─── AnimatedSprite ────────────────────────────────────────────────────────────
export class AnimatedSprite {
  _obj: Phaser.GameObjects.Sprite;
  private _textures: Texture[];
  private _frameIdx = 0;
  private _tintVal = 0xffffff;
  animationSpeed = 0.1;
  name = "";

  private _anchor: VecProxy;
  private _scale: VecProxy;
  private _position: VecProxy;

  constructor(textures: Texture | Texture[]) {
    const sc = requireScene();
    const arr = Array.isArray(textures) ? textures : [textures];
    this._textures = arr;
    const key = arr[0]?._key ?? "__MISSING__";
    this._obj = new Phaser.GameObjects.Sprite(sc, 0, 0, key);
    this._anchor = new VecProxy(
      () => this._obj.originX, v => this._obj.setOrigin(v, this._obj.originY),
      () => this._obj.originY, v => this._obj.setOrigin(this._obj.originX, v),
      (x, y) => this._obj.setOrigin(x, y),
    );
    this._scale = new VecProxy(
      () => this._obj.scaleX, v => { this._obj.scaleX = v; },
      () => this._obj.scaleY, v => { this._obj.scaleY = v; },
      (x, y) => this._obj.setScale(x, y),
    );
    this._position = new VecProxy(
      () => this._obj.x, v => { this._obj.x = v; },
      () => this._obj.y, v => { this._obj.y = v; },
      (x, y) => this._obj.setPosition(x, y),
    );
  }

  get anchor()            { return this._anchor; }
  get scale()             { return this._scale; }
  get position()          { return this._position; }
  get x()                 { return this._obj.x; }
  set x(v: number)        { this._obj.x = v; }
  get y()                 { return this._obj.y; }
  set y(v: number)        { this._obj.y = v; }
  get width()             { return this._obj.width; }
  get height()            { return this._obj.height; }
  get alpha()             { return this._obj.alpha; }
  set alpha(v: number)    { this._obj.setAlpha(v); }
  get visible()              { return this._obj.visible; }
  set visible(v: boolean)    { this._obj.setVisible(v); }
  get rotation()             { return this._obj.rotation; }
  set rotation(v: number)    { this._obj.setRotation(v); }
  get tint()                 { return this._tintVal; }
  set tint(v: number)        { this._tintVal = v; this._obj.setTint(v); }
  get destroyed()            { return !this._obj.scene; }
  play()                     { /* frame cycling by ticker */ }
  stop()                     { /* no-op */ }

  gotoAndStop(frame: number) {
    this._frameIdx = Math.max(0, Math.min(frame, this._textures.length - 1));
    const t = this._textures[this._frameIdx];
    if (t) this._obj.setTexture(t._key);
  }

  get texture(): Texture { return this._textures[this._frameIdx] ?? new Texture("__MISSING__"); }

  getTextureSize(): { width: number; height: number } {
    const t = this._textures[0];
    if (!t?._obj) return { width: 48, height: 48 };
    return { width: t._obj.source[0]?.width ?? 48, height: t._obj.source[0]?.height ?? 48 };
  }

  destroy() { this._obj.destroy(); }
}

// ─── Container ─────────────────────────────────────────────────────────────────
export class Container {
  _obj: Phaser.GameObjects.Container;
  name = "";
  eventMode: string = "none";
  cursor: string = "default";

  private _position: VecProxy;
  private _scale: VecProxy;
  private _maskVal: Phaser.Display.Masks.GeometryMask | null = null;
  private _interactive = false;

  constructor(x = 0, y = 0) {
    this._obj = new Phaser.GameObjects.Container(requireScene(), x, y);
    this._position = new VecProxy(
      () => this._obj.x, v => { this._obj.x = v; },
      () => this._obj.y, v => { this._obj.y = v; },
      (x, y) => this._obj.setPosition(x, y),
    );
    this._scale = new VecProxy(
      () => this._obj.scaleX, v => { this._obj.scaleX = v; },
      () => this._obj.scaleY, v => { this._obj.scaleY = v; },
      (x, y) => this._obj.setScale(x, y),
    );
  }

  on(event: string, cb: (...a: unknown[]) => void) {
    if (!this._interactive) {
      // Set interactive with a generous hit area based on container size
      this._obj.setInteractive(
        new Phaser.Geom.Rectangle(-20, -20, 80, 60),
        Phaser.Geom.Rectangle.Contains,
      );
      this._interactive = true;
    }
    this._obj.on(event, cb);
    return this;
  }

  addChild<T extends CompatNode>(child: T): T {
    this._obj.add(getInnerObj(child) as Phaser.GameObjects.GameObject); return child;
  }
  addChildAt<T extends CompatNode>(child: T, idx: number): T {
    this._obj.addAt(getInnerObj(child) as Phaser.GameObjects.GameObject, idx); return child;
  }
  removeChild(child: CompatNode) {
    this._obj.remove(getInnerObj(child) as Phaser.GameObjects.GameObject, false);
  }
  removeChildren(): CompatNode[] {
    const kids = this.children;
    this._obj.removeAll(false);
    return kids;
  }

  get children(): CompatNode[] {
    // Return lightweight proxy array with destroy support
    return (this._obj.list as Phaser.GameObjects.GameObject[]).map(go => {
      const w: any = Object.create(null);
      w._obj = go;
      Object.defineProperty(w, 'destroyed', { get: () => !(go as any).scene });
      w.destroy = (opts?: { children?: boolean }) => {
        if ((go as any).destroy) {
          try { (go as any).destroy(opts?.children); } catch { /* already destroyed */ }
        }
      };
      return w as CompatNode;
    });
  }

  setTint(v: number) { (this._obj as any).setTint?.(v); return this; }

  get position()         { return this._position; }
  get scale()            { return this._scale; }
  get x()                { return this._obj.x; }
  set x(v: number)       { this._obj.x = v; }
  get y()                { return this._obj.y; }
  set y(v: number)       { this._obj.y = v; }
  get alpha()            { return this._obj.alpha; }
  set alpha(v: number)   { this._obj.setAlpha(v); }
  get visible()             { return this._obj.visible; }
  set visible(v: boolean)   { this._obj.setVisible(v); }
  get rotation()            { return this._obj.rotation; }
  set rotation(v: number)   { this._obj.setRotation(v); }

  get parent(): Container | null {
    const p = this._obj.parentContainer;
    if (!p) return null;
    const w: any = Object.create(null); w._obj = p; return w as Container;
  }

  get mask() { return this._maskVal; }
  set mask(m: Phaser.Display.Masks.GeometryMask | Graphics | null) {
    if (m instanceof Graphics) {
      const gm = m._obj.createGeometryMask();
      this._maskVal = gm;
      this._obj.setMask(gm);
    } else {
      this._maskVal = m;
      if (m) this._obj.setMask(m); else this._obj.clearMask();
    }
  }

  get destroyed() { return !this._obj.scene; }
  destroy(opts?: { children?: boolean }) {
    if (opts?.children !== false) this._obj.removeAll(true);
    this._obj.destroy();
  }
}

// ─── Texture ───────────────────────────────────────────────────────────────────
export class Texture {
  _key: string;
  _obj: Phaser.Textures.Texture | null;

  constructor(key: string, phaserTex?: Phaser.Textures.Texture) {
    this._key = key;
    this._obj = phaserTex ?? null;
  }

  get width()  { return this._obj?.source[0]?.width  ?? 0; }
  get height() { return this._obj?.source[0]?.height ?? 0; }

  static from(key: string): Texture {
    if (!_scene) return new Texture(key);
    const t = _scene.textures.exists(key) ? _scene.textures.get(key) : null;
    return new Texture(key, t ?? undefined);
  }
}

// ─── Assets ────────────────────────────────────────────────────────────────────
export const Assets = {
  async load<T = Texture>(url: string): Promise<T> {
    const key = url;
    const scene = requireScene();
    if (scene.textures.exists(key)) {
      return new Texture(key, scene.textures.get(key)) as unknown as T;
    }
    return new Promise<T>((resolve, reject) => {
      fetch(url)
        .then(r => r.blob())
        .then(blob => {
          const blobUrl = URL.createObjectURL(blob);
          const img = new Image();
          img.onload = () => {
            try {
              scene.textures.addImage(key, img);
              URL.revokeObjectURL(blobUrl);
              resolve(new Texture(key, scene.textures.get(key)) as unknown as T);
            } catch (e) { reject(e); }
          };
          img.onerror = () => reject(new Error(`Failed: ${url}`));
          img.src = blobUrl;
        })
        .catch(reject);
    });
  },
};

// ─── TextureStyle ─────────────────────────────────────────────────────────────
export const TextureStyle = {
  defaultOptions: { scaleMode: "nearest" as "nearest" | "linear" },
};

// ─── PhaserApp  (= Application) ──────────────────────────────────────────────
export class PhaserApp {
  private _game: Phaser.Game | null = null;
  private _scene: Phaser.Scene | null = null;
  private _stage: Container | null = null;
  private _tickerCbs: Array<(dt: number) => void> = [];
  private _tickHandler: ((t: number, d: number) => void) | null = null;
  private _resolution = 1;

  get canvas(): HTMLCanvasElement { return this._game!.canvas as HTMLCanvasElement; }

  get stage(): Container {
    if (!this._stage) throw new Error("[PhaserApp] stage not ready");
    return this._stage;
  }

  get renderer() {
    const self = this;
    return {
      /** @deprecated Use resizeViewport() + setCameraBounds() instead. */
      resize(w: number, h: number) {
        // Legacy: delegates to resizeViewport (preserves camera state)
        self.resizeViewport(w, h);
      },
    };
  }

  get ticker() {
    const self = this;
    return {
      add(cb: (dt: number) => void)    { self._tickerCbs.push(cb); },
      remove(cb: (dt: number) => void) {
        const i = self._tickerCbs.indexOf(cb);
        if (i >= 0) self._tickerCbs.splice(i, 1);
      },
    };
  }

  async init(cfg: {
    width?: number; height?: number; backgroundAlpha?: number;
    resolution?: number; antialias?: boolean; parent?: HTMLElement;
    autoDensity?: boolean; [key: string]: unknown;
  }): Promise<void> {
    const { width = 410, height = 600, backgroundAlpha = 0, parent } = cfg;
    this._resolution = cfg.resolution ?? 1;

    return new Promise<void>((resolve) => {
      const self = this;

      class OfficeScene extends Phaser.Scene {
        constructor() { super({ key: "OfficeScene", active: true, visible: true }); }

        create() {
          self._scene = this;
          setCurrentScene(this);

          // Root stage container (registered in scene display list)
          const stageGO = new Phaser.GameObjects.Container(this, 0, 0);
          this.add.existing(stageGO);

          // Wrap in compat Container
          const stageCompat = new Container(0, 0);
          (stageCompat as any)._obj = stageGO;
          self._stage = stageCompat;

          // Ticker
          self._tickHandler = (_time: number, delta: number) => {
            for (const cb of self._tickerCbs) cb(delta);
          };
          this.events.on("update", self._tickHandler, this);

          resolve();
        }
      }

      self._game = new Phaser.Game({
        type: Phaser.AUTO,
        width, height,
        transparent: backgroundAlpha === 0,
        backgroundColor: backgroundAlpha === 0 ? undefined : 0x000000,
        antialias: cfg.antialias ?? false,
        pixelArt: TextureStyle.defaultOptions.scaleMode === "nearest",
        parent,
        scene: [OfficeScene],
        scale: { mode: Phaser.Scale.NONE, width, height },
        banner: false,
      });
    });
  }

  /** Zoom the main camera. Pass worldCX/CY to center on a point (world coords). */
  setZoom(zoom: number, worldCX?: number, worldCY?: number): void {
    const cam = this._scene?.cameras.main;
    if (!cam) { console.warn("[PhaserApp] setZoom: no camera (scene not ready)"); return; }
    cam.setZoom(zoom);
    if (worldCX !== undefined && worldCY !== undefined) {
      // centerOn() does NOT account for zoom — must compensate manually
      cam.setScroll(
        worldCX - cam.width / (2 * zoom),
        worldCY - cam.height / (2 * zoom),
      );
    }
  }

  /** Access the underlying Phaser Scene (for tweens, cameras, etc.) */
  get scene(): Phaser.Scene | null { return this._scene; }

  /** Reset camera to default (zoom=1, origin top-left). */
  resetZoom(): void {
    const cam = this._scene?.cameras.main;
    if (!cam) { return; }
    cam.setZoom(1);
    cam.setScroll(0, 0);
  }

  /** Called after init() to store scene ref (from buildScene side) */
  setScene(scene: Phaser.Scene) {
    this._scene = scene;
    setCurrentScene(scene);
  }

  // ── Camera-based viewport API ─────────────────────────────────────────────
  // All world coordinate methods account for DPR stage scaling automatically.

  /** Resize the viewport (canvas) to match container dimensions.
   *  World objects remain at their positions; camera scroll/zoom preserved. */
  resizeViewport(w: number, h: number): void {
    const dpr = this._resolution;
    this._game?.scale.resize(w * dpr, h * dpr);
    const cam = this._scene?.cameras.main;
    if (cam) cam.setSize(w * dpr, h * dpr);
    if (dpr > 1 && this._stage) {
      this._stage._obj.setScale(dpr);
    }
    // CSS size = logical dimensions (not physical)
    const canvas = this._game?.canvas as HTMLCanvasElement | undefined;
    if (canvas) {
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    }
  }

  /** Set camera world bounds. World is in logical units; we scale by resolution for Phaser. */
  setCameraBounds(x: number, y: number, w: number, h: number): void {
    const cam = this._scene?.cameras.main;
    const dpr = this._resolution;
    cam?.setBounds(x * dpr, y * dpr, w * dpr, h * dpr);
  }

  /** Set camera scroll (logical coordinates from caller; we scale for Phaser world). */
  setCameraScroll(x: number, y: number): void {
    const cam = this._scene?.cameras.main;
    const dpr = this._resolution;
    if (cam) {
      cam.scrollX = x * dpr;
      cam.scrollY = y * dpr;
    }
  }

  /** Get camera scroll in logical coordinates (Phaser world / resolution). */
  getCameraScroll(): { x: number; y: number } {
    const cam = this._scene?.cameras.main;
    const dpr = this._resolution;
    return {
      x: (cam?.scrollX ?? 0) / dpr,
      y: (cam?.scrollY ?? 0) / dpr,
    };
  }

  /** Get camera viewport size in world coordinates (accounts for zoom). */
  getCameraViewportSize(): { w: number; h: number } {
    const cam = this._scene?.cameras.main;
    const dpr = this._resolution;
    const zoom = cam?.zoom ?? 1;
    return {
      w: (cam?.width ?? 0) / (dpr * zoom),
      h: (cam?.height ?? 0) / (dpr * zoom),
    };
  }

  /** Set camera zoom (1 = 1:1 pixel, <1 = zoomed out). */
  setCameraZoom(zoom: number): void {
    this._scene?.cameras.main?.setZoom(zoom);
  }

  /** Get current camera zoom. */
  getCameraZoom(): number {
    return this._scene?.cameras.main?.zoom ?? 1;
  }

  /** Smoothly pan camera to center on a world point (logical coordinates). */
  panCamera(worldX: number, worldY: number, duration: number, ease = "Linear"): void {
    const cam = this._scene?.cameras.main;
    const dpr = this._resolution;
    cam?.pan(worldX * dpr, worldY * dpr, duration, ease, true);
  }

  /** Smoothly zoom camera. */
  zoomCamera(zoom: number, duration: number, ease = "Linear"): void {
    this._scene?.cameras.main?.zoomTo(zoom, duration, ease, true);
  }

  /** Stop all camera effects (pan/zoom/shake). */
  stopCameraEffects(): void {
    const cam = this._scene?.cameras.main;
    if (cam) {
      cam.stopFollow();
      try { (cam as any).panEffect?.reset(); } catch { /* v3.x compat */ }
      try { (cam as any).zoomEffect?.reset(); } catch { /* v3.x compat */ }
    }
  }

  destroy(removeView = false, _opts?: unknown) {
    if (this._scene && this._tickHandler) {
      this._scene.events.off("update", this._tickHandler);
    }
    this._tickerCbs = [];
    this._game?.destroy(removeView);
    this._game = null; this._scene = null; this._stage = null;
  }
}

export { PhaserApp as Application };

// ─── Types ─────────────────────────────────────────────────────────────────────
export type CompatNode = Container | Graphics | Text | Sprite | AnimatedSprite;

// ─── Phaser Tween helpers ──────────────────────────────────────────────────────

/** Create a Phaser tween targeting a compat node's underlying Phaser object. */
export function tweenNode(
  node: CompatNode,
  props: Record<string, number>,
  duration: number,
  opts?: {
    ease?: string;
    delay?: number;
    yoyo?: boolean;
    repeat?: number;
    onComplete?: () => void;
  },
): Phaser.Tweens.Tween | null {
  if (!_scene) return null;
  const obj = getInnerObj(node);
  return _scene.tweens.add({
    targets: obj,
    ...props,
    duration,
    ease: opts?.ease ?? "Linear",
    delay: opts?.delay ?? 0,
    yoyo: opts?.yoyo ?? false,
    repeat: opts?.repeat ?? 0,
    onComplete: opts?.onComplete,
  });
}

/**
 * Spawn a one-shot particle: tween its properties over `duration` ms then destroy it.
 * Removes boilerplate of manual _life tracking and per-frame position/alpha updates.
 */
export function spawnParticleTween(
  parent: Container,
  particle: Graphics | Text,
  props: Record<string, number>,
  duration: number,
  opts?: { ease?: string; delay?: number },
): void {
  parent.addChild(particle);
  if (!_scene) return;
  const obj = (particle as any)._obj;
  _scene.tweens.add({
    targets: obj,
    ...props,
    duration,
    ease: opts?.ease ?? "Linear",
    delay: opts?.delay ?? 0,
    onComplete: () => {
      try {
        if (parent && !parent.destroyed) parent.removeChild(particle);
        if (!particle.destroyed) particle.destroy();
      } catch { /* already cleaned up */ }
    },
  });
}

// ─── loadSprite helper ────────────────────────────────────────────────────────
export async function loadSprite(
  scene: Phaser.Scene,
  spriteNum: number,
  directions: string[],
  frameCount: number,
): Promise<Texture[][]> {
  const results: Texture[][] = [];
  for (const dir of directions) {
    const frames: Texture[] = [];
    for (let f = 1; f <= frameCount; f++) {
      const url = `/sprites/${spriteNum}-${dir}-${f}.png`;
      const key = `sprite_${spriteNum}_${dir}_${f}`;
      if (!scene.textures.exists(key)) {
        await new Promise<void>(res => {
          fetch(url).then(r => r.blob()).then(blob => {
            const burl = URL.createObjectURL(blob);
            const img = new Image();
            img.onload = () => {
              try { scene.textures.addImage(key, img); } catch (_) {}
              URL.revokeObjectURL(burl); res();
            };
            img.onerror = () => res();
            img.src = burl;
          }).catch(() => res());
        });
      }
      if (scene.textures.exists(key)) {
        frames.push(new Texture(key, scene.textures.get(key)));
      }
    }
    results.push(frames);
  }
  return results;
}
