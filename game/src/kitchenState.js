import {
  INGREDIENTS,
  RECIPES,
  RECIPE_BY_ID,
  canAddToAssembly,
  findCompletedRecipe,
  getNeededPrepHint,
  hasPerfectGrillQuality,
} from './recipes.js';
import { audio } from './audio.js';

export const WORLD_W = 1160;
export const WORLD_H = 600;
export const SHIFT_DURATION = 120;
export const MAX_ACTIVE_ORDERS = 4;

// Center island obstacle bounds for smooth waypoint routing
const ISLAND_BOX = { x: 276, y: 234, w: 528, h: 112 };

function createRng(seedValue) {
  let a = (Number(seedValue) || 1) >>> 0;
  return function nextRand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildStations() {
  return [
    // Top Hot Line & Serving Pass
    {
      id: 'grill_1',
      kind: 'grill',
      label: 'Charcoal Grill',
      x: 165,
      y: 24,
      w: 145,
      h: 86,
      standX: 237,
      standY: 144,
      faceX: 0,
      faceY: -1,
      item: null,
      perfectChimed: false,
      burnWarned: false,
      flamePhase: 0.2,
    },
    {
      id: 'grill_2',
      kind: 'grill',
      label: 'Sizzle Skillet',
      x: 330,
      y: 24,
      w: 145,
      h: 86,
      standX: 402,
      standY: 144,
      faceX: 0,
      faceY: -1,
      item: null,
      perfectChimed: false,
      burnWarned: false,
      flamePhase: 1.7,
    },
    {
      id: 'grill_3',
      kind: 'grill',
      label: 'Chef Burner',
      x: 495,
      y: 24,
      w: 145,
      h: 86,
      standX: 567,
      standY: 144,
      faceX: 0,
      faceY: -1,
      item: null,
      perfectChimed: false,
      burnWarned: false,
      flamePhase: 3.1,
    },
    {
      id: 'pass',
      kind: 'pass',
      label: 'Serving Pass',
      x: 690,
      y: 24,
      w: 280,
      h: 86,
      standX: 830,
      standY: 144,
      faceX: 0,
      faceY: -1,
      item: null,
      bellPulse: 0,
    },

    // Center Butcher-Block Prep & Assembly Island
    {
      id: 'prep_1',
      kind: 'prep',
      label: 'Prep Board 1',
      x: 290,
      y: 244,
      w: 135,
      h: 90,
      standX: 357,
      standY: 208,
      faceX: 0,
      faceY: 1,
      item: null,
      chopSwing: 0,
    },
    {
      id: 'prep_2',
      kind: 'prep',
      label: 'Prep Board 2',
      x: 440,
      y: 244,
      w: 135,
      h: 90,
      standX: 507,
      standY: 208,
      faceX: 0,
      faceY: 1,
      item: null,
      chopSwing: 0,
    },
    {
      id: 'assembly',
      kind: 'assembly',
      label: 'Assembly Counter',
      x: 595,
      y: 244,
      w: 195,
      h: 90,
      standX: 692,
      standY: 208,
      faceX: 0,
      faceY: 1,
      stack: [],
      completedRecipeId: null,
      completePulse: 0,
    },

    // Left Cold Larder & Bakery Counter
    {
      id: 'crate_bun',
      kind: 'crate',
      ingredientId: 'bun',
      label: 'Brioche Buns',
      x: 24,
      y: 112,
      w: 96,
      h: 84,
      standX: 156,
      standY: 154,
      faceX: -1,
      faceY: 0,
    },
    {
      id: 'crate_patty',
      kind: 'crate',
      ingredientId: 'patty',
      label: 'Wagyu Patty',
      x: 24,
      y: 206,
      w: 96,
      h: 84,
      standX: 156,
      standY: 248,
      faceX: -1,
      faceY: 0,
    },
    {
      id: 'crate_cheddar',
      kind: 'crate',
      ingredientId: 'cheddar',
      label: 'Aged Cheddar',
      x: 24,
      y: 300,
      w: 96,
      h: 84,
      standX: 156,
      standY: 342,
      faceX: -1,
      faceY: 0,
    },
    {
      id: 'crate_pasta',
      kind: 'crate',
      ingredientId: 'pasta',
      label: 'Fresh Pasta',
      x: 24,
      y: 394,
      w: 96,
      h: 84,
      standX: 156,
      standY: 436,
      faceX: -1,
      faceY: 0,
    },

    // Bottom Produce, Sauces & Compost Counter
    {
      id: 'crate_tomato',
      kind: 'crate',
      ingredientId: 'tomato',
      label: 'Vine Tomato',
      x: 152,
      y: 492,
      w: 108,
      h: 84,
      standX: 206,
      standY: 456,
      faceX: 0,
      faceY: 1,
    },
    {
      id: 'crate_lettuce',
      kind: 'crate',
      ingredientId: 'lettuce',
      label: 'Crisp Lettuce',
      x: 270,
      y: 492,
      w: 108,
      h: 84,
      standX: 324,
      standY: 456,
      faceX: 0,
      faceY: 1,
    },
    {
      id: 'crate_onion',
      kind: 'crate',
      ingredientId: 'onion',
      label: 'Sweet Onion',
      x: 388,
      y: 492,
      w: 108,
      h: 84,
      standX: 442,
      standY: 456,
      faceX: 0,
      faceY: 1,
    },
    {
      id: 'crate_basil',
      kind: 'crate',
      ingredientId: 'basil',
      label: 'Fresh Basil',
      x: 506,
      y: 492,
      w: 108,
      h: 84,
      standX: 560,
      standY: 456,
      faceX: 0,
      faceY: 1,
    },
    {
      id: 'crate_truffle',
      kind: 'crate',
      ingredientId: 'truffle',
      label: 'Truffle Sauce',
      x: 624,
      y: 492,
      w: 108,
      h: 84,
      standX: 678,
      standY: 456,
      faceX: 0,
      faceY: 1,
    },
    {
      id: 'crate_butter',
      kind: 'crate',
      ingredientId: 'butter',
      label: 'Garlic Butter',
      x: 742,
      y: 492,
      w: 108,
      h: 84,
      standX: 796,
      standY: 456,
      faceX: 0,
      faceY: 1,
    },
    {
      id: 'trash',
      kind: 'trash',
      label: 'Compost Bin',
      x: 874,
      y: 492,
      w: 120,
      h: 84,
      standX: 934,
      standY: 456,
      faceX: 0,
      faceY: 1,
    },

    // Right Resting & Warming Counter
    {
      id: 'shelf_1',
      kind: 'shelf',
      label: 'Resting Board',
      x: 1036,
      y: 160,
      w: 100,
      h: 112,
      standX: 1000,
      standY: 216,
      faceX: 1,
      faceY: 0,
      item: null,
    },
    {
      id: 'shelf_2',
      kind: 'shelf',
      label: 'Warming Shelf',
      x: 1036,
      y: 298,
      w: 100,
      h: 112,
      standX: 1000,
      standY: 354,
      faceX: 1,
      faceY: 0,
      item: null,
    },
  ];
}

function createOrder(recipe, idNum, remainingRatio = 1) {
  return {
    uid: `ord_${idNum}`,
    recipeId: recipe.id,
    duration: recipe.duration,
    remaining: recipe.duration * remainingRatio,
  };
}

function segmentIntersectsRect(x1, y1, x2, y2, rect) {
  const steps = 16;
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const px = x1 + (x2 - x1) * t;
    const py = y1 + (y2 - y1) * t;
    if (
      px >= rect.x &&
      px <= rect.x + rect.w &&
      py >= rect.y &&
      py <= rect.y + rect.h
    ) {
      return true;
    }
  }
  return false;
}

export class KitchenState {
  constructor(options = {}) {
    this.seed = Number(options.seed) || 1;
    this.shotMode = options.shotMode || '';
    this.reset(this.shotMode);
  }

  reset(mode = '') {
    this.shotMode = mode;
    this.rng = createRng(this.seed);
    this.stations = buildStations();
    this.stationMap = Object.fromEntries(this.stations.map((s) => [s.id, s]));

    this.phase = 'start'; // 'start' | 'playing' | 'ended'
    this.shiftTime = SHIFT_DURATION;
    this.elapsed = 0;
    this.revenue = 0;
    this.tipsEarned = 0;
    this.servedCount = 0;
    this.missedCount = 0;
    this.perfectDishes = 0;
    this.combo = 1;
    this.bestCombo = 1;
    this.orderSeq = 1;
    this.nextOrderCooldown = 0;
    this.orders = [];
    this.pinnedOrderUid = null;

    this.focusedStationId = null;
    this.hoveredStationId = null;
    this.particles = [];
    this.popups = [];
    this.bellRings = [];

    this.chef = {
      x: 560,
      y: 175,
      radius: 21,
      speed: 315,
      dirX: 0,
      dirY: 1,
      walkCycle: 0,
      moving: false,
      holding: null,
      waypoints: [],
      targetStationId: null,
    };

    if (mode === 'play') {
      this._setupPlayShowcase();
    } else if (mode === 'end') {
      this._setupEndShowcase();
    } else {
      this._setupStartPreview();
    }
  }

  _setupStartPreview() {
    this.phase = 'start';
    this.shiftTime = SHIFT_DURATION;
    this.orders = [
      createOrder(RECIPE_BY_ID.ember_wagyu, this.orderSeq++, 0.92),
      createOrder(RECIPE_BY_ID.truffle_bistro, this.orderSeq++, 0.85),
      createOrder(RECIPE_BY_ID.garlic_tagliatelle, this.orderSeq++, 0.96),
    ];
    this.pinnedOrderUid = this.orders[0].uid;

    // Warm lively kitchen preview behind the title card
    this.stationMap.grill_1.item = {
      kind: 'ingredient',
      id: 'patty',
      state: 'perfect',
      progress: 0.88,
      cookElapsed: 3.9,
    };
    this.stationMap.prep_1.item = {
      kind: 'ingredient',
      id: 'tomato',
      state: 'chopped',
      progress: 1,
    };
    this.stationMap.assembly.stack = [
      { kind: 'ingredient', id: 'bun', state: 'raw', progress: 1 },
      { kind: 'ingredient', id: 'patty', state: 'perfect', progress: 1 },
      { kind: 'ingredient', id: 'cheddar', state: 'raw', progress: 1 },
    ];
    this.stationMap.pass.item = {
      kind: 'dish',
      recipeId: 'truffle_bistro',
      perfect: true,
      ingredients: [
        { id: 'bun' },
        { id: 'patty', state: 'perfect' },
        { id: 'onion', state: 'perfect' },
        { id: 'truffle' },
      ],
    };
    this.chef.x = 640;
    this.chef.y = 185;
    this.chef.dirX = 0;
    this.chef.dirY = 1;
    this._updateFocusStation();
  }

  _setupPlayShowcase() {
    this.phase = 'playing';
    this.shiftTime = 84;
    this.revenue = 164;
    this.tipsEarned = 26;
    this.servedCount = 4;
    this.missedCount = 0;
    this.perfectDishes = 3;
    this.combo = 3;
    this.bestCombo = 3;

    this.orders = [
      createOrder(RECIPE_BY_ID.ember_wagyu, this.orderSeq++, 0.78),
      createOrder(RECIPE_BY_ID.truffle_bistro, this.orderSeq++, 0.56),
      createOrder(RECIPE_BY_ID.garlic_tagliatelle, this.orderSeq++, 0.88),
    ];
    this.pinnedOrderUid = this.orders[0].uid;

    // 1. One burger patty sizzling at golden perfection on Grill 1
    this.stationMap.grill_1.item = {
      kind: 'ingredient',
      id: 'patty',
      state: 'perfect',
      progress: 0.84,
      cookElapsed: 3.7,
    };
    this.stationMap.grill_1.perfectChimed = true;

    // 2. Caramelized onion sizzling on Grill 2
    this.stationMap.grill_2.item = {
      kind: 'ingredient',
      id: 'onion',
      state: 'seared',
      progress: 0.52,
      cookElapsed: 2.0,
    };

    // 3. Sliced tomato on Prep Board 1
    this.stationMap.prep_1.item = {
      kind: 'ingredient',
      id: 'tomato',
      state: 'chopped',
      progress: 1,
    };

    // 4. Dish mid-assembly on the Assembly Counter
    this.stationMap.assembly.stack = [
      { kind: 'ingredient', id: 'bun', state: 'raw', progress: 1 },
      { kind: 'ingredient', id: 'patty', state: 'perfect', progress: 1 },
      { kind: 'ingredient', id: 'cheddar', state: 'raw', progress: 1 },
    ];

    // 5. Finished gourmet plated dish glowing at the Serving Pass
    this.stationMap.pass.item = {
      kind: 'dish',
      recipeId: 'truffle_bistro',
      perfect: true,
      ingredients: [
        { id: 'bun' },
        { id: 'patty', state: 'perfect' },
        { id: 'onion', state: 'perfect' },
        { id: 'truffle' },
      ],
    };

    // Chef standing beside Assembly holding freshly chopped Crisp Lettuce
    this.chef.x = 692;
    this.chef.y = 202;
    this.chef.dirX = 0;
    this.chef.dirY = 1;
    this.chef.holding = {
      kind: 'ingredient',
      id: 'lettuce',
      state: 'chopped',
      progress: 1,
    };

    this.spawnPopup(830, 86, '+$48 PERFECT! x3', '#ffd15c');
    this._updateFocusStation();
  }

  _setupEndShowcase() {
    this._setupPlayShowcase();
    this.phase = 'ended';
    this.shiftTime = 0;
    this.revenue = 286;
    this.tipsEarned = 48;
    this.servedCount = 7;
    this.missedCount = 0;
    this.perfectDishes = 6;
    this.combo = 4;
    this.bestCombo = 5;
  }

  startNewShift() {
    this.reset('');
    this.phase = 'playing';
    this.shiftTime = SHIFT_DURATION;
    this.orders = [
      this._rollOrder(1.0),
      this._rollOrder(0.95),
      this._rollOrder(0.9),
    ];
    this.pinnedOrderUid = this.orders[0].uid;
    this.chef.x = 560;
    this.chef.y = 175;
    this.spawnPopup(560, 140, 'SERVICE OPEN!', '#ffd15c');
    this._updateFocusStation();
  }

  _rollOrder(ratio = 1) {
    const idx = Math.floor(this.rng() * RECIPES.length);
    const recipe = RECIPES[idx];
    return createOrder(recipe, this.orderSeq++, ratio);
  }

  spawnPopup(x, y, text, color = '#fff7e6') {
    this.popups.push({
      x,
      y,
      text,
      color,
      life: 1.45,
      maxLife: 1.45,
    });
  }

  spawnParticles(x, y, count, color, speed = 70, gravity = 0, radius = 3.5) {
    for (let i = 0; i < count; i += 1) {
      const ang = this.rng() * Math.PI * 2;
      const spd = speed * (0.4 + this.rng() * 0.8);
      this.particles.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 16,
        gravity,
        radius: radius * (0.7 + this.rng() * 0.6),
        color,
        life: 0.45 + this.rng() * 0.45,
        maxLife: 0.9,
      });
    }
  }

  navigateToPoint(tx, ty, targetStationId = null) {
    if (this.phase !== 'playing') return;
    let cx = Math.max(142, Math.min(WORLD_W - 142, tx));
    let cy = Math.max(132, Math.min(WORLD_H - 132, ty));

    // Push floor click target outside the center island if clicked between stations
    if (
      cx > ISLAND_BOX.x - 22 &&
      cx < ISLAND_BOX.x + ISLAND_BOX.w + 22 &&
      cy > ISLAND_BOX.y - 22 &&
      cy < ISLAND_BOX.y + ISLAND_BOX.h + 22
    ) {
      cy = cy < ISLAND_BOX.y + ISLAND_BOX.h / 2
        ? ISLAND_BOX.y - 24
        : ISLAND_BOX.y + ISLAND_BOX.h + 24;
    }

    const waypoints = [];

    if (segmentIntersectsRect(this.chef.x, this.chef.y, cx, cy, ISLAND_BOX)) {
      const leftViaX = 242;
      const rightViaX = 836;
      const midY = 289;
      const leftDist =
        Math.hypot(this.chef.x - leftViaX, this.chef.y - midY) +
        Math.hypot(cx - leftViaX, cy - midY);
      const rightDist =
        Math.hypot(this.chef.x - rightViaX, this.chef.y - midY) +
        Math.hypot(cx - rightViaX, cy - midY);
      const viaX = leftDist <= rightDist ? leftViaX : rightViaX;
      waypoints.push({ x: viaX, y: midY });
    }

    waypoints.push({ x: cx, y: cy });
    this.chef.waypoints = waypoints;
    this.chef.targetStationId = targetStationId;
  }

  navigateToStation(stationId) {
    const st = this.stationMap[stationId];
    if (!st) return;
    const dist = Math.hypot(this.chef.x - st.standX, this.chef.y - st.standY);
    if (dist <= 22) {
      this.chef.dirX = st.faceX;
      this.chef.dirY = st.faceY;
      this.interactWithStation(st);
      return;
    }
    this.navigateToPoint(st.standX, st.standY, st.id);
  }

  quickDispatch(slotNumber) {
    if (this.phase !== 'playing') return;
    if (slotNumber === 1) {
      // Nearest occupied/ready grill, preferring perfect or empty grill
      const grills = ['grill_1', 'grill_2', 'grill_3'].map((id) => this.stationMap[id]);
      const target =
        grills.find((g) => g.item && g.item.state === 'perfect') ||
        grills.find((g) => !g.item) ||
        grills[0];
      this.navigateToStation(target.id);
    } else if (slotNumber === 2) {
      const preps = [this.stationMap.prep_1, this.stationMap.prep_2];
      const target =
        preps.find((p) => p.item && p.item.state === 'chopped') ||
        preps.find((p) => p.item) ||
        preps[0];
      this.navigateToStation(target.id);
    } else if (slotNumber === 3) {
      this.navigateToStation('assembly');
    } else if (slotNumber === 4) {
      this.navigateToStation('pass');
    }
  }

  discardHolding() {
    if (this.phase !== 'playing') return;
    if (this.chef.holding) {
      this.chef.holding = null;
      audio.playTrash();
      this.spawnPopup(this.chef.x, this.chef.y - 34, 'Discarded', '#e6b89c');
      return;
    }
    // If standing at assembly with empty hands and partial stack, allow clearing
    if (this.focusedStationId === 'assembly') {
      const asm = this.stationMap.assembly;
      if (asm.stack.length > 0 && !asm.completedRecipeId) {
        asm.stack = [];
        audio.playTrash();
        this.spawnPopup(asm.x + asm.w / 2, asm.y - 10, 'Plate Cleared', '#e6b89c');
      }
    }
  }

  interactFocused() {
    if (this.phase !== 'playing') return;
    this._updateFocusStation();
    if (!this.focusedStationId) return;
    const st = this.stationMap[this.focusedStationId];
    if (st) {
      this.interactWithStation(st);
    }
  }

  interactWithStation(st) {
    if (!st || this.phase !== 'playing') return;

    if (st.kind === 'crate') {
      this._interactCrate(st);
    } else if (st.kind === 'prep') {
      this._interactPrep(st);
    } else if (st.kind === 'grill') {
      this._interactGrill(st);
    } else if (st.kind === 'assembly') {
      this._interactAssembly(st);
    } else if (st.kind === 'pass') {
      this._interactPass(st);
    } else if (st.kind === 'shelf') {
      this._interactShelf(st);
    } else if (st.kind === 'trash') {
      this.discardHolding();
    }
  }

  _interactCrate(st) {
    const spec = INGREDIENTS[st.ingredientId];
    if (!this.chef.holding) {
      this.chef.holding = {
        kind: 'ingredient',
        id: st.ingredientId,
        state: 'raw',
        progress: 0,
        cookElapsed: 0,
      };
      audio.playPickup();
      this.spawnParticles(st.x + st.w / 2, st.y + st.h / 2, 6, spec.color, 55);
      return;
    }
    if (
      this.chef.holding.kind === 'ingredient' &&
      this.chef.holding.id === st.ingredientId &&
      this.chef.holding.state === 'raw'
    ) {
      this.chef.holding = null;
      audio.playPlace();
      this.spawnPopup(st.x + st.w / 2, st.y - 6, 'Returned', '#e7d5be');
      return;
    }
    this.spawnPopup(this.chef.x, this.chef.y - 34, 'Hands full! [Q] Discard', '#ffad75');
  }

  _interactPrep(st) {
    if (st.item) {
      if (st.item.state === 'chopped') {
        if (!this.chef.holding) {
          this.chef.holding = st.item;
          st.item = null;
          audio.playPickup();
        } else {
          this.spawnPopup(this.chef.x, this.chef.y - 34, 'Hands full!', '#ffad75');
        }
        return;
      }

      // Active chopping tap boost
      st.chopSwing = 1;
      st.item.progress = Math.min(1, st.item.progress + 0.36);
      audio.playChop();
      const spec = INGREDIENTS[st.item.id];
      this.spawnParticles(st.x + st.w / 2, st.y + st.h / 2, 7, spec.accentColor, 80, 140, 3);
      if (st.item.progress >= 1) {
        st.item.state = 'chopped';
        audio.playPerfectChime();
        this.spawnPopup(st.x + st.w / 2, st.y - 8, 'CHOPPED!', '#86efac');
      }
      return;
    }

    if (!this.chef.holding) return;
    if (this.chef.holding.kind !== 'ingredient') {
      this.spawnPopup(this.chef.x, this.chef.y - 34, 'Take Dish to Pass!', '#ffd15c');
      return;
    }
    const spec = INGREDIENTS[this.chef.holding.id];
    if (spec.prep === 'chop' && this.chef.holding.state !== 'chopped') {
      st.item = this.chef.holding;
      st.item.state = 'chopping';
      st.chopSwing = 1;
      this.chef.holding = null;
      audio.playPlace();
      audio.playChop();
    } else if (spec.prep === 'chop' && this.chef.holding.state === 'chopped') {
      st.item = this.chef.holding;
      this.chef.holding = null;
      audio.playPlace();
    } else if (spec.prep === 'grill') {
      this.spawnPopup(st.x + st.w / 2, st.y - 10, `Cook ${spec.shortName} on Grill!`, '#ff9c66');
    } else {
      this.spawnPopup(st.x + st.w / 2, st.y - 10, `${spec.shortName} goes on Assembly!`, '#ffd15c');
    }
  }

  _interactGrill(st) {
    if (st.item) {
      if (st.item.state === 'raw') {
        this.spawnPopup(st.x + st.w / 2, st.y - 10, 'Sizzling... hold on!', '#ffba69');
        return;
      }
      if (!this.chef.holding) {
        this.chef.holding = st.item;
        st.item = null;
        st.perfectChimed = false;
        st.burnWarned = false;
        audio.playPickup();
      } else {
        this.spawnPopup(this.chef.x, this.chef.y - 34, 'Hands full!', '#ffad75');
      }
      return;
    }

    if (!this.chef.holding) return;
    if (this.chef.holding.kind !== 'ingredient') {
      this.spawnPopup(this.chef.x, this.chef.y - 34, 'Take Dish to Pass!', '#ffd15c');
      return;
    }
    const spec = INGREDIENTS[this.chef.holding.id];
    if (spec.prep === 'grill' && this.chef.holding.state === 'raw') {
      st.item = this.chef.holding;
      st.perfectChimed = false;
      st.burnWarned = false;
      this.chef.holding = null;
      audio.playPlace();
    } else if (spec.prep === 'chop') {
      this.spawnPopup(st.x + st.w / 2, st.y - 10, `Chop ${spec.shortName} on Prep Board!`, '#9ae6b4');
    } else {
      this.spawnPopup(st.x + st.w / 2, st.y - 10, 'Already ready for Assembly!', '#ffd15c');
    }
  }

  _interactAssembly(st) {
    if (st.completedRecipeId) {
      if (!this.chef.holding) {
        const recipe = RECIPE_BY_ID[st.completedRecipeId];
        this.chef.holding = {
          kind: 'dish',
          recipeId: st.completedRecipeId,
          perfect: hasPerfectGrillQuality(st.stack),
          ingredients: [...st.stack],
        };
        st.stack = [];
        st.completedRecipeId = null;
        audio.playPickup();
        this.spawnPopup(st.x + st.w / 2, st.y - 10, `Carry ${recipe.shortName} to Pass!`, '#ffd15c');
      } else {
        this.spawnPopup(this.chef.x, this.chef.y - 34, 'Hands full!', '#ffad75');
      }
      return;
    }

    if (!this.chef.holding) return;
    if (this.chef.holding.kind === 'dish') {
      this.spawnPopup(st.x + st.w / 2, st.y - 10, 'Bring Dish to Pass Bell!', '#ffd15c');
      return;
    }

    const item = this.chef.holding;
    if (canAddToAssembly(st.stack, item)) {
      st.stack.push(item);
      this.chef.holding = null;
      audio.playPlace();
      this.spawnParticles(st.x + st.w / 2, st.y + st.h / 2, 6, '#fff4d4', 55);

      const completed = findCompletedRecipe(st.stack);
      if (completed) {
        st.completedRecipeId = completed.id;
        st.completePulse = 1;
        audio.playDishComplete();
        this.spawnParticles(st.x + st.w / 2, st.y + st.h / 2, 16, '#ffd15c', 120);
        this.spawnPopup(st.x + st.w / 2, st.y - 14, `${completed.shortName} READY!`, '#ffd15c');
      }
      return;
    }

    const hint = getNeededPrepHint(item);
    if (hint) {
      this.spawnPopup(st.x + st.w / 2, st.y - 10, hint, '#ff9c66');
    } else if (st.stack.some((entry) => entry.id === item.id)) {
      this.spawnPopup(st.x + st.w / 2, st.y - 10, 'Already on plate!', '#ffba69');
    } else {
      this.spawnPopup(st.x + st.w / 2, st.y - 10, 'Does not fit current dish!', '#ff857a');
    }
  }

  _interactPass(st) {
    if (st.item) {
      // Ring the golden bell & serve the plated dish!
      this._serveDishFromPass(st);
      if (this.chef.holding && this.chef.holding.kind === 'dish') {
        st.item = this.chef.holding;
        this.chef.holding = null;
      }
      return;
    }
    if (this.chef.holding && this.chef.holding.kind === 'dish') {
      st.item = this.chef.holding;
      this.chef.holding = null;
      audio.playPlace();
      this.spawnPopup(st.x + st.w / 2, st.y - 8, 'Ring Bell to Serve!', '#ffd15c');
      return;
    }
    if (this.chef.holding) {
      this.spawnPopup(st.x + st.w / 2, st.y - 8, 'Assemble full dish first!', '#ffba69');
    }
  }

  _interactShelf(st) {
    if (!st.item && this.chef.holding) {
      st.item = this.chef.holding;
      this.chef.holding = null;
      audio.playPlace();
    } else if (st.item && !this.chef.holding) {
      this.chef.holding = st.item;
      st.item = null;
      audio.playPickup();
    }
  }

  _serveDishFromPass(st) {
    const dish = st.item;
    if (!dish) return;
    st.item = null;
    st.bellPulse = 1;
    this.bellRings.push({
      x: st.x + st.w - 42,
      y: st.y + 42,
      radius: 10,
      life: 0.65,
      maxLife: 0.65,
    });

    const recipe = RECIPE_BY_ID[dish.recipeId];
    // Match most urgent ticket for this recipe
    let matchedIdx = -1;
    let lowestRem = Infinity;
    for (let i = 0; i < this.orders.length; i += 1) {
      if (this.orders[i].recipeId === dish.recipeId && this.orders[i].remaining < lowestRem) {
        lowestRem = this.orders[i].remaining;
        matchedIdx = i;
      }
    }

    audio.playBellServe();
    this.spawnParticles(st.x + st.w / 2, st.y + 40, 22, '#ffd15c', 145, 60, 4);

    if (matchedIdx !== -1) {
      const ord = this.orders[matchedIdx];
      this.orders.splice(matchedIdx, 1);
      if (this.pinnedOrderUid === ord.uid) {
        this.pinnedOrderUid = this.orders[0]?.uid || null;
      }

      const speedRatio = ord.remaining / ord.duration;
      const speedTip = speedRatio >= 0.62 ? 8 : speedRatio >= 0.32 ? 4 : 1;
      const qualityTip = dish.perfect ? 6 : 0;
      const comboTip = (this.combo - 1) * 5;
      const totalTip = speedTip + qualityTip + comboTip;
      const earned = recipe.price + totalTip;

      this.revenue += earned;
      this.tipsEarned += totalTip;
      this.servedCount += 1;
      if (dish.perfect) this.perfectDishes += 1;
      this.combo = Math.min(5, this.combo + 1);
      this.bestCombo = Math.max(this.bestCombo, this.combo);

      const tag = dish.perfect ? 'PERFECT!' : 'SERVED!';
      this.spawnPopup(
        st.x + st.w / 2,
        st.y + 18,
        `+$${earned} ${tag} x${this.combo}`,
        '#ffd15c',
      );
      this.nextOrderCooldown = Math.min(this.nextOrderCooldown, 0.9);
    } else {
      // Walk-in Special fallback if no ticket matches
      const walkIn = Math.round(recipe.price * 0.6);
      this.revenue += walkIn;
      this.servedCount += 1;
      this.spawnPopup(st.x + st.w / 2, st.y + 18, `+$${walkIn} Walk-In Special`, '#a7f3d0');
    }
  }

  update(dt, moveX, moveY) {
    this.elapsed += dt;

    // Gentle ambient particles even on title screen
    this._updateStations(dt);
    this._updateEffects(dt);

    if (this.phase !== 'playing') return;

    // Shift timer
    this.shiftTime = Math.max(0, this.shiftTime - dt);
    if (this.shiftTime <= 0) {
      this.phase = 'ended';
      audio.playShiftEnd();
      return;
    }

    // Orders countdown & replenishment
    for (let i = this.orders.length - 1; i >= 0; i -= 1) {
      const ord = this.orders[i];
      ord.remaining -= dt;
      if (ord.remaining <= 0) {
        this.orders.splice(i, 1);
        this.missedCount += 1;
        this.combo = 1;
        audio.playOrderExpired();
        this.spawnPopup(580, 96, 'Order Expired! Combo Reset', '#ff7b72');
        if (this.pinnedOrderUid === ord.uid) {
          this.pinnedOrderUid = this.orders[0]?.uid || null;
        }
      }
    }

    this.nextOrderCooldown -= dt;
    if (this.orders.length < 3 || (this.orders.length < MAX_ACTIVE_ORDERS && this.nextOrderCooldown <= 0)) {
      if (this.nextOrderCooldown <= 0) {
        this.orders.push(this._rollOrder(1));
        if (!this.pinnedOrderUid) {
          this.pinnedOrderUid = this.orders[0].uid;
        }
        this.nextOrderCooldown = this.orders.length < 3 ? 1.8 : 7.5;
      }
    }

    this._updateChefMovement(dt, moveX, moveY);
    this._updateFocusStation();
  }

  _updateStations(dt) {
    let anySizzling = false;

    for (const st of this.stations) {
      if (st.kind === 'grill') {
        st.flamePhase += dt * 7.5;
        if (st.item && st.item.kind === 'ingredient') {
          const spec = INGREDIENTS[st.item.id];
          if (this.phase === 'playing') {
            st.item.cookElapsed = (st.item.cookElapsed || 0) + dt;
          }
          const t = st.item.cookElapsed || 0;
          const cookTime = spec.cookTime || 4.2;
          const burnTime = spec.burnTime || 8.5;
          st.item.progress = t / cookTime;

          if (t < cookTime * 0.48) {
            st.item.state = 'raw';
          } else if (t < cookTime * 0.78) {
            st.item.state = 'seared';
          } else if (t < burnTime) {
            st.item.state = 'perfect';
            if (this.phase === 'playing' && !st.perfectChimed) {
              st.perfectChimed = true;
              audio.playPerfectChime();
              this.spawnPopup(st.x + st.w / 2, st.y - 6, 'PERFECT!', '#ffd15c');
              this.spawnParticles(st.x + st.w / 2, st.y + 42, 10, '#ffd15c', 75);
            }
            if (this.phase === 'playing' && t > burnTime - 2.1 && !st.burnWarned) {
              st.burnWarned = true;
              audio.playBurnAlert();
              this.spawnPopup(st.x + st.w / 2, st.y - 6, 'PULL SOON!', '#ff7b54');
            }
          } else {
            if (st.item.state !== 'burned' && this.phase === 'playing') {
              audio.playBurnAlert();
              this.spawnPopup(st.x + st.w / 2, st.y - 6, 'BURNED!', '#ff5252');
            }
            st.item.state = 'burned';
          }

          if (st.item.state !== 'burned') {
            anySizzling = true;
            if (this.rng() < dt * 9) {
              const cx = st.x + 36 + this.rng() * (st.w - 72);
              const cy = st.y + 32 + this.rng() * 24;
              const isHotWarn = t > burnTime - 2.2;
              this.particles.push({
                x: cx,
                y: cy,
                vx: (this.rng() - 0.5) * 18,
                vy: -28 - this.rng() * 22,
                gravity: -8,
                radius: 3 + this.rng() * 4,
                color: isHotWarn ? 'rgba(90, 75, 70, 0.75)' : 'rgba(255, 232, 185, 0.55)',
                life: 0.65,
                maxLife: 0.65,
              });
            }
          }
        }
      } else if (st.kind === 'prep') {
        st.chopSwing = Math.max(0, st.chopSwing - dt * 4.5);
        if (st.item && st.item.state === 'chopping' && this.phase === 'playing') {
          const spec = INGREDIENTS[st.item.id];
          const rate = 1 / (spec.chopTime || 1.4);
          st.item.progress = Math.min(1, st.item.progress + dt * rate);
          if (st.item.progress >= 1) {
            st.item.state = 'chopped';
            audio.playPerfectChime();
            this.spawnPopup(st.x + st.w / 2, st.y - 6, 'CHOPPED!', '#86efac');
          }
        }
      } else if (st.kind === 'assembly') {
        st.completePulse = Math.max(0, st.completePulse - dt * 1.6);
      } else if (st.kind === 'pass') {
        st.bellPulse = Math.max(0, st.bellPulse - dt * 2.2);
      }
    }

    if (anySizzling && this.phase === 'playing') {
      audio.playSizzleTick(0.65);
    }
  }

  _updateEffects(dt) {
    for (let i = this.particles.length - 1; i >= 0; i -= 1) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.vy += (p.gravity || 0) * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }

    for (let i = this.popups.length - 1; i >= 0; i -= 1) {
      const pop = this.popups[i];
      pop.life -= dt;
      pop.y -= 26 * dt;
      if (pop.life <= 0) {
        this.popups.splice(i, 1);
      }
    }

    for (let i = this.bellRings.length - 1; i >= 0; i -= 1) {
      const ring = this.bellRings[i];
      ring.life -= dt;
      ring.radius += 110 * dt;
      if (ring.life <= 0) {
        this.bellRings.splice(i, 1);
      }
    }
  }

  _updateChefMovement(dt, moveX, moveY) {
    let vx = 0;
    let vy = 0;

    if (moveX !== 0 || moveY !== 0) {
      // Manual keyboard overrides click navigation
      this.chef.waypoints = [];
      this.chef.targetStationId = null;
      const len = Math.hypot(moveX, moveY) || 1;
      vx = (moveX / len) * this.chef.speed;
      vy = (moveY / len) * this.chef.speed;
      this.chef.dirX = moveX / len;
      this.chef.dirY = moveY / len;
    } else if (this.chef.waypoints.length > 0) {
      const wp = this.chef.waypoints[0];
      const dx = wp.x - this.chef.x;
      const dy = wp.y - this.chef.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= 10) {
        this.chef.x = wp.x;
        this.chef.y = wp.y;
        this.chef.waypoints.shift();
        if (this.chef.waypoints.length === 0 && this.chef.targetStationId) {
          const st = this.stationMap[this.chef.targetStationId];
          this.chef.targetStationId = null;
          if (st) {
            this.chef.dirX = st.faceX;
            this.chef.dirY = st.faceY;
            this.interactWithStation(st);
          }
        }
      } else {
        vx = (dx / dist) * this.chef.speed;
        vy = (dy / dist) * this.chef.speed;
        this.chef.dirX = dx / dist;
        this.chef.dirY = dy / dist;
      }
    }

    this.chef.moving = vx !== 0 || vy !== 0;
    if (this.chef.moving) {
      this.chef.walkCycle += dt * 14;
      this.chef.x += vx * dt;
      this.chef.y += vy * dt;
      this._resolveCollisions();
    }
  }

  _resolveCollisions() {
    const r = this.chef.radius;
    // Perimeter bounds inside counters
    this.chef.x = Math.max(120 + r, Math.min(1036 - r, this.chef.x));
    this.chef.y = Math.max(110 + r, Math.min(492 - r, this.chef.y));

    // Resolve circle vs Center Island AABB
    const box = ISLAND_BOX;
    const closestX = Math.max(box.x, Math.min(this.chef.x, box.x + box.w));
    const closestY = Math.max(box.y, Math.min(this.chef.y, box.y + box.h));
    const dx = this.chef.x - closestX;
    const dy = this.chef.y - closestY;
    const distSq = dx * dx + dy * dy;

    if (distSq < r * r) {
      const dist = Math.sqrt(distSq);
      if (dist > 0.0001) {
        const push = r - dist;
        this.chef.x += (dx / dist) * push;
        this.chef.y += (dy / dist) * push;
      } else {
        // Fallback push upward
        this.chef.y = box.y - r;
      }
    }
  }

  _updateFocusStation() {
    const reachX = this.chef.x + this.chef.dirX * 26;
    const reachY = this.chef.y + this.chef.dirY * 26;
    let bestId = null;
    let bestScore = Infinity;

    for (const st of this.stations) {
      const cx = Math.max(st.x, Math.min(reachX, st.x + st.w));
      const cy = Math.max(st.y, Math.min(reachY, st.y + st.h));
      const dist = Math.hypot(reachX - cx, reachY - cy);
      if (dist <= 56 && dist < bestScore) {
        bestScore = dist;
        bestId = st.id;
      }
    }
    this.focusedStationId = bestId;
  }

  getPinnedOrder() {
    if (!this.orders.length) return null;
    return this.orders.find((o) => o.uid === this.pinnedOrderUid) || this.orders[0];
  }

  pinOrder(uid) {
    if (this.orders.some((o) => o.uid === uid)) {
      this.pinnedOrderUid = uid;
    }
  }
}
