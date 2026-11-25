import {
  INGREDIENTS,
  RECIPE_BY_ID,
  findCandidateRecipes,
  sortStackForDisplay,
} from './recipes.js';
import { WORLD_W, WORLD_H } from './kitchenState.js';

function roundRectPath(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  ctx.lineTo(x + rad, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
  ctx.lineTo(x, y + rad);
  ctx.quadraticCurveTo(x, y, x + rad, y);
  ctx.closePath();
}

export class KitchenRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.dpr = 1;
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    this.dpr = Math.min(2.5, window.devicePixelRatio || 1);
    const targetW = Math.round(rect.width * this.dpr);
    const targetH = Math.round(rect.height * this.dpr);
    if (this.canvas.width !== targetW || this.canvas.height !== targetH) {
      this.canvas.width = targetW;
      this.canvas.height = targetH;
    }
    const scaleX = rect.width / WORLD_W;
    const scaleY = rect.height / WORLD_H;
    this.scale = Math.min(scaleX, scaleY);
    this.offsetX = (rect.width - WORLD_W * this.scale) * 0.5;
    this.offsetY = (rect.height - WORLD_H * this.scale) * 0.5;
  }

  clientToWorld(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const x = (clientX - rect.left - this.offsetX) / this.scale;
    const y = (clientY - rect.top - this.offsetY) / this.scale;
    return { x, y };
  }

  render(state) {
    this.resize();
    const ctx = this.ctx;
    ctx.save();
    ctx.scale(this.dpr, this.dpr);

    const viewW = this.canvas.width / this.dpr;
    const viewH = this.canvas.height / this.dpr;
    ctx.fillStyle = '#241610';
    ctx.fillRect(0, 0, viewW, viewH);

    ctx.translate(this.offsetX, this.offsetY);
    ctx.scale(this.scale, this.scale);

    // Clip to logical world
    roundRectPath(ctx, 0, 0, WORLD_W, WORLD_H, 14);
    ctx.clip();

    this._drawFloorAndWalls(ctx, state);
    this._drawCounterFrames(ctx);

    const pinnedOrder = state.getPinnedOrder();
    const pinnedNeeds = pinnedOrder ? RECIPE_BY_ID[pinnedOrder.recipeId]?.ingredients || [] : [];

    for (const st of state.stations) {
      this._drawStation(ctx, state, st, pinnedNeeds);
    }

    this._drawNavigationMarker(ctx, state);
    this._drawChef(ctx, state);
    this._drawBellRings(ctx, state);
    this._drawParticles(ctx, state);
    this._drawPopups(ctx, state);

    ctx.restore();
  }

  _drawFloorAndWalls(ctx, state) {
    // Warm sunlit terracotta & sandstone checkerboard floor
    const tile = 48;
    for (let y = 0; y < WORLD_H; y += tile) {
      for (let x = 0; x < WORLD_W; x += tile) {
        const even = ((x / tile + y / tile) | 0) % 2 === 0;
        ctx.fillStyle = even ? '#ead3b0' : '#dec096';
        ctx.fillRect(x, y, tile, tile);
        ctx.strokeStyle = 'rgba(130, 89, 52, 0.14)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, tile - 1, tile - 1);
      }
    }

    // Warm overhead bistro lighting pools
    const islandGlow = ctx.createRadialGradient(540, 290, 40, 540, 290, 390);
    islandGlow.addColorStop(0, 'rgba(255, 244, 214, 0.28)');
    islandGlow.addColorStop(1, 'rgba(255, 244, 214, 0)');
    ctx.fillStyle = islandGlow;
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);

    // Subtle ember warmth near top hot line
    const grillGlow = ctx.createRadialGradient(380, 65, 20, 380, 65, 260);
    grillGlow.addColorStop(0, `rgba(255, 130, 55, ${0.14 + Math.sin(state.elapsed * 4) * 0.03})`);
    grillGlow.addColorStop(1, 'rgba(255, 130, 55, 0)');
    ctx.fillStyle = grillGlow;
    ctx.fillRect(0, 0, WORLD_W, 240);

    // Outer bistro wood wainscot border
    ctx.strokeStyle = '#3b2417';
    ctx.lineWidth = 18;
    ctx.strokeRect(0, 0, WORLD_W, WORLD_H);
  }

  _drawCounterFrames(ctx) {
    // Drop shadows for counter runs
    ctx.fillStyle = 'rgba(35, 18, 9, 0.28)';
    roundRectPath(ctx, 148, 22, 840, 98, 12);
    ctx.fill();
    roundRectPath(ctx, 18, 102, 110, 390, 12);
    ctx.fill();
    roundRectPath(ctx, 142, 486, 864, 98, 12);
    ctx.fill();
    roundRectPath(ctx, 1028, 148, 114, 278, 12);
    ctx.fill();
    roundRectPath(ctx, 280, 240, 524, 106, 14);
    ctx.fill();

    // Top Hot Line Frame
    this._drawWoodBlock(ctx, 150, 16, 834, 98, '#3f281b', '#5b3a27');
    // Left Pantry Frame
    this._drawWoodBlock(ctx, 16, 100, 108, 386, '#3f281b', '#6d472e');
    // Bottom Produce & Sauce Frame
    this._drawWoodBlock(ctx, 140, 484, 864, 96, '#3f281b', '#6d472e');
    // Right Resting Counter Frame
    this._drawWoodBlock(ctx, 1030, 146, 110, 274, '#3f281b', '#5e3c28');
    // Center Maple Butcher-Block Island
    this._drawWoodBlock(ctx, 278, 234, 524, 108, '#7c4c28', '#d49d64');

    // Subtle butcher-block grain planks on center island
    ctx.strokeStyle = 'rgba(120, 70, 32, 0.22)';
    ctx.lineWidth = 1;
    for (let x = 306; x < 790; x += 28) {
      ctx.beginPath();
      ctx.moveTo(x, 242);
      ctx.lineTo(x, 336);
      ctx.stroke();
    }
  }

  _drawWoodBlock(ctx, x, y, w, h, borderColor, fillColor) {
    roundRectPath(ctx, x, y, w, h, 12);
    ctx.fillStyle = fillColor;
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = borderColor;
    ctx.stroke();
  }

  _drawStation(ctx, state, st, pinnedNeeds) {
    const isFocused = state.focusedStationId === st.id;
    const isHovered = state.hoveredStationId === st.id;

    // Base station tile
    if (st.kind === 'grill') {
      this._drawGrillStation(ctx, state, st);
    } else if (st.kind === 'prep') {
      this._drawPrepStation(ctx, st);
    } else if (st.kind === 'assembly') {
      this._drawAssemblyStation(ctx, state, st);
    } else if (st.kind === 'pass') {
      this._drawPassStation(ctx, state, st);
    } else if (st.kind === 'crate') {
      const neededByPinned = pinnedNeeds.includes(st.ingredientId);
      this._drawCrateStation(ctx, state, st, neededByPinned);
    } else if (st.kind === 'trash') {
      this._drawTrashStation(ctx, st);
    } else if (st.kind === 'shelf') {
      this._drawShelfStation(ctx, st);
    }

    // Highlight border and context prompt when targeted or hovered
    if (isFocused || isHovered) {
      ctx.save();
      roundRectPath(ctx, st.x - 2, st.y - 2, st.w + 4, st.h + 4, 10);
      ctx.strokeStyle = isFocused ? '#ffd15c' : 'rgba(255, 224, 150, 0.72)';
      ctx.lineWidth = isFocused ? 3 : 2;
      ctx.stroke();

      if (isFocused && state.phase === 'playing') {
        const actionLabel = this._getStationActionPrompt(state, st);
        if (actionLabel) {
          const pillW = Math.max(70, actionLabel.length * 6.8 + 16);
          let pillX = st.x + st.w / 2 - pillW / 2;
          let pillY = st.y + st.h + 4;
          if (st.x < 100) {
            pillX = st.x + st.w + 6;
            pillY = st.y + st.h / 2 - 9;
          } else if (st.x > 950) {
            pillX = st.x - pillW - 6;
            pillY = st.y + st.h / 2 - 9;
          } else if (st.y > 440) {
            pillY = st.y - 22;
          }
          roundRectPath(ctx, pillX, pillY, pillW, 18, 6);
          ctx.fillStyle = 'rgba(29, 18, 13, 0.92)';
          ctx.fill();
          ctx.strokeStyle = '#ffd15c';
          ctx.lineWidth = 1.2;
          ctx.stroke();
          ctx.fillStyle = '#ffd15c';
          ctx.font = '800 9.5px "Segoe UI", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(actionLabel, pillX + pillW / 2, pillY + 9);
        }
      }
      ctx.restore();
    }
  }

  _getStationActionPrompt(state, st) {
    const h = state.chef.holding;
    if (st.kind === 'crate') return h ? '' : 'SPACE: TAKE';
    if (st.kind === 'prep') {
      if (st.item) return st.item.state === 'chopped' ? 'SPACE: PICK UP' : 'SPACE: CHOP!';
      return h ? 'SPACE: PLACE' : '';
    }
    if (st.kind === 'grill') {
      if (st.item && st.item.state !== 'raw') return 'SPACE: PICK UP';
      return !st.item && h ? 'SPACE: GRILL' : '';
    }
    if (st.kind === 'assembly') {
      if (st.completedRecipeId) return h ? '' : 'SPACE: TAKE DISH';
      return h ? 'SPACE: PLATE' : '';
    }
    if (st.kind === 'pass') {
      if (st.item) return 'SPACE: SERVE!';
      return h?.kind === 'dish' ? 'SPACE: SET ON PASS' : '';
    }
    if (st.kind === 'trash' && h) return 'SPACE: DISCARD';
    if (st.kind === 'shelf') return st.item && !h ? 'SPACE: PICK UP' : !st.item && h ? 'SPACE: SET' : '';
    return '';
  }

  _drawCrateStation(ctx, state, st, neededByPinned) {
    const spec = INGREDIENTS[st.ingredientId];
    // Recessed wooden pantry bin
    roundRectPath(ctx, st.x, st.y, st.w, st.h, 10);
    ctx.fillStyle = '#8b5a34';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#4e2f19';
    ctx.stroke();

    roundRectPath(ctx, st.x + 6, st.y + 6, st.w - 12, st.h - 24, 7);
    ctx.fillStyle = '#ead7ba';
    ctx.fill();

    // Pinned order helper aura
    if (neededByPinned && state.phase === 'playing') {
      const pulse = 0.55 + Math.sin(state.elapsed * 5.5) * 0.25;
      roundRectPath(ctx, st.x + 3, st.y + 3, st.w - 6, st.h - 6, 8);
      ctx.strokeStyle = `rgba(255, 209, 92, ${pulse})`;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    // Draw ingredient clusters inside crate
    const cx = st.x + st.w / 2;
    const cy = st.y + (st.h - 18) / 2;
    this.drawIngredientSprite(ctx, st.ingredientId, cx - 12, cy - 3, 0.75, 'raw');
    this.drawIngredientSprite(ctx, st.ingredientId, cx + 10, cy + 3, 0.82, 'raw');

    // Label banner
    roundRectPath(ctx, st.x + 5, st.y + st.h - 21, st.w - 10, 17, 5);
    ctx.fillStyle = '#2d1c13';
    ctx.fill();
    ctx.fillStyle = neededByPinned ? '#ffd15c' : '#f8ead7';
    ctx.font = '700 10px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(spec.shortName.toUpperCase(), cx, st.y + st.h - 12.5);
  }

  _drawGrillStation(ctx, state, st) {
    // Brushed steel housing
    roundRectPath(ctx, st.x, st.y, st.w, st.h, 10);
    ctx.fillStyle = '#454952';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#23262c';
    ctx.stroke();

    const cx = st.x + st.w / 2;
    const cy = st.y + 42;

    if (st.id === 'grill_1') {
      // Cast-iron charcoal grates with glowing orange embers underneath
      roundRectPath(ctx, st.x + 12, st.y + 10, st.w - 24, 58, 8);
      ctx.fillStyle = '#1f1614';
      ctx.fill();

      const emberPulse = 0.55 + Math.sin(st.flamePhase) * 0.25;
      const emberGrad = ctx.createRadialGradient(cx, cy, 4, cx, cy, 46);
      emberGrad.addColorStop(0, `rgba(255, 118, 36, ${emberPulse})`);
      emberGrad.addColorStop(1, 'rgba(255, 65, 12, 0)');
      ctx.fillStyle = emberGrad;
      ctx.fillRect(st.x + 12, st.y + 10, st.w - 24, 58);

      // Active ember flame tongues when grilling
      if (st.item && st.item.state !== 'burned') {
        for (let i = -2; i <= 2; i += 1) {
          const fx = cx + i * 17;
          const fh = 6 + Math.sin(st.flamePhase + i * 1.3) * 3;
          ctx.fillStyle = 'rgba(255, 148, 48, 0.78)';
          ctx.beginPath();
          ctx.moveTo(fx - 5, st.y + 62);
          ctx.quadraticCurveTo(fx, st.y + 62 - fh * 1.9, fx + 5, st.y + 62);
          ctx.closePath();
          ctx.fill();
        }
      }

      // Parallel grill grate bars
      ctx.strokeStyle = '#5a5d64';
      ctx.lineWidth = 3;
      for (let gx = st.x + 22; gx <= st.x + st.w - 22; gx += 14) {
        ctx.beginPath();
        ctx.moveTo(gx, st.y + 13);
        ctx.lineTo(gx, st.y + 65);
        ctx.stroke();
      }
    } else {
      // Sizzle cast-iron skillet with copper handle
      ctx.fillStyle = '#23252a';
      ctx.beginPath();
      ctx.arc(cx, cy, 31, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#b9773b';
      ctx.stroke();

      // Skillet handle
      roundRectPath(ctx, cx + 26, cy - 5, 24, 10, 4);
      ctx.fillStyle = '#33363d';
      ctx.fill();

      // Subtle gas burner ring glow
      if (st.item) {
        const ringAlpha = 0.5 + Math.sin(st.flamePhase) * 0.22;
        ctx.beginPath();
        ctx.arc(cx, cy, 24, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 138, 43, ${ringAlpha})`;
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }
    }

    // Active sizzling item
    if (st.item) {
      this.drawIngredientSprite(ctx, st.item.id, cx, cy, 1.15, st.item.state);

      // Progress bar & state badge
      const spec = INGREDIENTS[st.item.id];
      const cookTime = spec.cookTime || 4.2;
      const burnTime = spec.burnTime || 8.5;
      const elapsed = st.item.cookElapsed || 0;
      const ratio = Math.min(1, elapsed / burnTime);

      const barW = st.w - 22;
      const barX = st.x + 11;
      const barY = st.y + st.h - 17;
      roundRectPath(ctx, barX, barY, barW, 9, 4);
      ctx.fillStyle = '#1b1412';
      ctx.fill();

      // Perfect zone marker notch
      const perfectStart = (cookTime * 0.78) / burnTime;
      ctx.fillStyle = 'rgba(255, 209, 92, 0.32)';
      ctx.fillRect(barX + barW * perfectStart, barY + 1, barW * (1 - perfectStart), 7);

      let fillCol = '#f59e0b';
      if (st.item.state === 'perfect') fillCol = '#4ade80';
      if (elapsed > burnTime - 2.1 && st.item.state !== 'burned') {
        fillCol = Math.sin(state.elapsed * 16) > 0 ? '#ef4444' : '#fb923c';
      }
      if (st.item.state === 'burned') fillCol = '#6b7280';

      roundRectPath(ctx, barX + 1, barY + 1, Math.max(4, (barW - 2) * ratio), 7, 3);
      ctx.fillStyle = fillCol;
      ctx.fill();

      // Status pill above item
      if (st.item.state === 'perfect' || st.item.state === 'burned') {
        const badgeText = st.item.state === 'burned' ? 'BURNED' : 'PERFECT!';
        const bg = st.item.state === 'burned' ? '#991b1b' : '#15803d';
        roundRectPath(ctx, cx - 34, st.y + 4, 68, 16, 6);
        ctx.fillStyle = bg;
        ctx.fill();
        ctx.fillStyle = '#fffdf7';
        ctx.font = '800 9px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(badgeText, cx, st.y + 12);
      }
    } else {
      ctx.fillStyle = '#c5ccd6';
      ctx.font = '700 10px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(st.label.toUpperCase(), cx, st.y + st.h - 11);
    }
  }

  _drawPrepStation(ctx, st) {
    // End-grain maple cutting board
    roundRectPath(ctx, st.x + 8, st.y + 8, st.w - 16, st.h - 16, 9);
    ctx.fillStyle = '#f2d9b1';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#9c6838';
    ctx.stroke();

    const cx = st.x + st.w / 2;
    const cy = st.y + st.h / 2 - 2;

    if (st.item) {
      this.drawIngredientSprite(ctx, st.item.id, cx - 4, cy, 1.12, st.item.state);

      // Animated chef's knife when chopping
      if (st.item.state !== 'chopped') {
        ctx.save();
        const angle = -0.35 + Math.sin(st.chopSwing * Math.PI) * 0.65;
        ctx.translate(cx + 22, cy - 8);
        ctx.rotate(angle);
        ctx.fillStyle = '#d4dce6';
        ctx.beginPath();
        ctx.moveTo(-22, -4);
        ctx.lineTo(4, -7);
        ctx.lineTo(6, 5);
        ctx.lineTo(-18, 2);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#3b2416';
        roundRectPath(ctx, 4, -5, 16, 6, 2);
        ctx.fill();
        ctx.restore();
      }

      // Chop progress bar
      const barW = st.w - 28;
      const barX = st.x + 14;
      const barY = st.y + st.h - 20;
      roundRectPath(ctx, barX, barY, barW, 8, 4);
      ctx.fillStyle = '#573a24';
      ctx.fill();
      roundRectPath(
        ctx,
        barX + 1,
        barY + 1,
        Math.max(4, (barW - 2) * (st.item.progress || 0)),
        6,
        3,
      );
      ctx.fillStyle = st.item.state === 'chopped' ? '#4ade80' : '#facc15';
      ctx.fill();

      if (st.item.state === 'chopped') {
        roundRectPath(ctx, cx - 28, st.y + 4, 56, 15, 5);
        ctx.fillStyle = '#15803d';
        ctx.fill();
        ctx.fillStyle = '#fffef5';
        ctx.font = '800 9px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('CHOPPED', cx, st.y + 11.5);
      }
    } else {
      // Resting chef knife silhouette
      ctx.save();
      ctx.translate(cx + 6, cy - 2);
      ctx.rotate(-0.22);
      ctx.fillStyle = '#cad2dc';
      ctx.beginPath();
      ctx.moveTo(-24, -4);
      ctx.lineTo(4, -7);
      ctx.lineTo(6, 4);
      ctx.lineTo(-20, 2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#4a2e1d';
      roundRectPath(ctx, 4, -5, 15, 6, 2);
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = '#5c3c24';
      ctx.font = '800 10px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('PREP BOARD', cx, st.y + st.h - 17);
    }
  }

  _drawAssemblyStation(ctx, state, st) {
    // Sleek marble plating surface
    roundRectPath(ctx, st.x + 6, st.y + 6, st.w - 12, st.h - 12, 10);
    ctx.fillStyle = '#f8f5f0';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#c8bfb2';
    ctx.stroke();

    const plateX = st.x + 56;
    const plateY = st.y + st.h / 2 - 2;

    // Porcelain dinner plate
    ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
    ctx.beginPath();
    ctx.arc(plateX + 2, plateY + 3, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(plateX, plateY, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#dfd8cc';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(plateX, plateY, 21, 0, Math.PI * 2);
    ctx.strokeStyle = '#ece6dc';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Multi-layer stack or completed dish
    if (st.completedRecipeId) {
      const pulse = 0.65 + Math.sin(state.elapsed * 6) * 0.25;
      ctx.beginPath();
      ctx.arc(plateX, plateY, 34, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(44, 155, 91, ${pulse})`;
      ctx.lineWidth = 3;
      ctx.stroke();
      this.drawDishSprite(ctx, st.completedRecipeId, plateX, plateY, 1.05);
    } else if (st.stack.length > 0) {
      this.drawMidAssemblyStack(ctx, st.stack, plateX, plateY);
    }

    // Side status / recipe helper readout
    const infoX = st.x + 96;
    const infoW = st.w - 108;
    ctx.textAlign = 'left';
    if (st.completedRecipeId) {
      const recipe = RECIPE_BY_ID[st.completedRecipeId];
      ctx.fillStyle = '#166534';
      ctx.font = '800 11px "Segoe UI", sans-serif';
      ctx.fillText('PLATED!', infoX, st.y + 28);
      ctx.fillStyle = '#291c14';
      ctx.font = '700 10px "Segoe UI", sans-serif';
      ctx.fillText(recipe.shortName, infoX, st.y + 44);
      ctx.fillStyle = '#b45309';
      ctx.font = '700 9px "Segoe UI", sans-serif';
      ctx.fillText('Take to Pass →', infoX, st.y + 60);
    } else if (st.stack.length > 0) {
      const candidates = findCandidateRecipes(st.stack);
      const pinned = state.getPinnedOrder();
      const chosen =
        (pinned && candidates.find((c) => c.id === pinned.recipeId)) || candidates[0];
      ctx.fillStyle = '#7c2d12';
      ctx.font = '800 10px "Segoe UI", sans-serif';
      ctx.fillText(`ASSEMBLING (${st.stack.length}/4)`, infoX, st.y + 24);
      if (chosen) {
        ctx.fillStyle = '#291c14';
        ctx.font = '700 10px "Segoe UI", sans-serif';
        ctx.fillText(chosen.shortName, infoX, st.y + 39);
        // Remaining ingredient dots
        const have = st.stack.map((s) => s.id);
        const missing = chosen.ingredients.filter((id) => !have.includes(id));
        ctx.fillStyle = '#6c5344';
        ctx.font = '700 9px "Segoe UI", sans-serif';
        ctx.fillText(
          `Need: ${missing.map((id) => INGREDIENTS[id].shortName).join(', ')}`,
          infoX,
          st.y + 55,
          infoW,
        );
      }
    } else {
      ctx.fillStyle = '#5c4b3f';
      ctx.font = '800 11px "Segoe UI", sans-serif';
      ctx.fillText('ASSEMBLY', infoX, st.y + 34);
      ctx.fillStyle = '#8b7361';
      ctx.font = '600 9.5px "Segoe UI", sans-serif';
      ctx.fillText('Stack 4 prepped', infoX, st.y + 49);
      ctx.fillText('ingredients here', infoX, st.y + 62);
    }

    // 4-slot assembly progress dots along bottom of marble station
    for (let i = 0; i < 4; i += 1) {
      const filled = st.completedRecipeId ? true : i < st.stack.length;
      ctx.fillStyle = st.completedRecipeId
        ? '#16a34a'
        : filled
          ? '#e85d24'
          : '#d6cdc0';
      ctx.beginPath();
      ctx.arc(infoX + 6 + i * 14, st.y + st.h - 14, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _drawPassStation(ctx, state, st) {
    // Heated brass & brushed steel pass counter
    roundRectPath(ctx, st.x, st.y, st.w, st.h, 11);
    ctx.fillStyle = '#6c5339';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#c89b4b';
    ctx.stroke();

    // Inner steel shelf
    roundRectPath(ctx, st.x + 8, st.y + 8, st.w - 16, st.h - 16, 8);
    ctx.fillStyle = '#474341';
    ctx.fill();

    // Overhead warm heat-lamp strip
    roundRectPath(ctx, st.x + 18, st.y + 6, st.w - 36, 7, 3);
    ctx.fillStyle = '#fbbf24';
    ctx.fill();

    const dishX = st.x + 92;
    const dishY = st.y + 47;

    if (st.item) {
      // Glowing warm spotlight halo around READY TO SERVE plate
      const pulse = 0.72 + Math.sin(state.elapsed * 5.5) * 0.24;
      const halo = ctx.createRadialGradient(dishX, dishY, 10, dishX, dishY, 54);
      halo.addColorStop(0, `rgba(255, 215, 92, ${pulse * 0.65})`);
      halo.addColorStop(1, 'rgba(255, 215, 92, 0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(dishX, dishY, 54, 0, Math.PI * 2);
      ctx.fill();

      // White serving plate
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(dishX, dishY, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffd15c';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      this.drawDishSprite(ctx, st.item.recipeId, dishX, dishY, 1.04);

      // Crisp READY TO SERVE! badge
      roundRectPath(ctx, st.x + 18, st.y - 11, 148, 20, 8);
      ctx.fillStyle = '#15803d';
      ctx.fill();
      ctx.strokeStyle = '#ffd15c';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#fffef5';
      ctx.font = '900 10.5px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('★ READY TO SERVE! ★', st.x + 92, st.y - 1);
    } else {
      ctx.strokeStyle = 'rgba(255, 232, 180, 0.25)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.arc(dishX, dishY, 26, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#e8d5bc';
      ctx.font = '800 11px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('HOT PASS', dishX, dishY);
    }

    // Golden Service Bell on the right of the Pass
    const bellX = st.x + st.w - 58;
    const bellY = st.y + 46;
    const wobble = st.bellPulse > 0 ? Math.sin(st.bellPulse * Math.PI * 6) * 3 : 0;

    // Brass base
    ctx.fillStyle = '#4a2b18';
    ctx.beginPath();
    ctx.ellipse(bellX, bellY + 13, 21, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Golden dome
    const bellGrad = ctx.createRadialGradient(bellX - 5, bellY - 6, 3, bellX, bellY, 20);
    bellGrad.addColorStop(0, '#fff4b8');
    bellGrad.addColorStop(0.55, '#f2b830');
    bellGrad.addColorStop(1, '#9e6811');
    ctx.fillStyle = bellGrad;
    ctx.beginPath();
    ctx.arc(bellX + wobble, bellY + 8, 17, Math.PI, 0);
    ctx.lineTo(bellX + 19 + wobble, bellY + 12);
    ctx.lineTo(bellX - 19 + wobble, bellY + 12);
    ctx.closePath();
    ctx.fill();

    // Bell plunger button
    ctx.fillStyle = '#ffe58f';
    ctx.beginPath();
    ctx.arc(bellX + wobble, bellY - 10, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = st.item ? '#ffd15c' : '#d2bea4';
    ctx.font = '800 9.5px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(st.item ? 'RING BELL!' : 'SERVICE BELL', bellX, st.y + st.h - 12);
  }

  _drawTrashStation(ctx, st) {
    roundRectPath(ctx, st.x, st.y, st.w, st.h, 10);
    ctx.fillStyle = '#3f454f';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#1f2329';
    ctx.stroke();

    const cx = st.x + st.w / 2;
    const cy = st.y + 34;
    ctx.fillStyle = '#1e2228';
    ctx.beginPath();
    ctx.arc(cx, cy, 21, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8b95a5';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Recycle / discard icon bars
    ctx.strokeStyle = '#9ca3af';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx - 7, cy - 7);
    ctx.lineTo(cx + 7, cy + 7);
    ctx.moveTo(cx + 7, cy - 7);
    ctx.lineTo(cx - 7, cy + 7);
    ctx.stroke();

    ctx.fillStyle = '#e5e7eb';
    ctx.font = '800 10px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('COMPOST [Q]', cx, st.y + st.h - 14);
  }

  _drawShelfStation(ctx, st) {
    roundRectPath(ctx, st.x, st.y, st.w, st.h, 10);
    ctx.fillStyle = '#785032';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#472d1b';
    ctx.stroke();

    roundRectPath(ctx, st.x + 8, st.y + 8, st.w - 16, st.h - 28, 7);
    ctx.fillStyle = '#e4cfa8';
    ctx.fill();

    const cx = st.x + st.w / 2;
    const cy = st.y + (st.h - 20) / 2;
    if (st.item) {
      if (st.item.kind === 'dish') {
        this.drawDishSprite(ctx, st.item.recipeId, cx, cy, 0.95);
      } else {
        this.drawIngredientSprite(ctx, st.item.id, cx, cy, 1.05, st.item.state);
      }
    }

    ctx.fillStyle = '#f8ead7';
    ctx.font = '700 9.5px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(st.label.toUpperCase(), cx, st.y + st.h - 12);
  }

  drawMidAssemblyStack(ctx, stack, x, y) {
    const ordered = sortStackForDisplay(stack);
    const isPasta = ordered.some((entry) => entry.id === 'pasta');
    if (isPasta) {
      for (let i = 0; i < ordered.length; i += 1) {
        const entry = ordered[i];
        const oy = y + 3 - i * 3.5;
        this.drawIngredientSprite(ctx, entry.id, x, oy, 0.92, entry.state);
      }
      return;
    }

    // Burger stacked cross-section perspective
    const hasBun = ordered.some((entry) => entry.id === 'bun');
    let layerY = y + 10;
    if (hasBun) {
      // Bottom golden brioche bun heel
      ctx.fillStyle = '#c97829';
      roundRectPath(ctx, x - 18, layerY - 4, 36, 9, 4);
      ctx.fill();
      layerY -= 6;
    }

    for (const entry of ordered) {
      if (entry.id === 'bun') continue;
      if (entry.id === 'patty') {
        ctx.fillStyle = entry.state === 'perfect' ? '#6d2518' : '#8b3228';
        roundRectPath(ctx, x - 18, layerY - 5, 36, 9, 4);
        ctx.fill();
        layerY -= 6;
      } else if (entry.id === 'cheddar') {
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.moveTo(x - 19, layerY - 2);
        ctx.lineTo(x + 19, layerY - 2);
        ctx.lineTo(x + 14, layerY + 5);
        ctx.lineTo(x - 15, layerY + 3);
        ctx.closePath();
        ctx.fill();
        layerY -= 5;
      } else if (entry.id === 'lettuce') {
        ctx.fillStyle = '#4ade80';
        roundRectPath(ctx, x - 19, layerY - 4, 38, 6, 3);
        ctx.fill();
        layerY -= 5;
      } else if (entry.id === 'tomato') {
        ctx.fillStyle = '#ef4444';
        roundRectPath(ctx, x - 16, layerY - 4, 32, 5, 2);
        ctx.fill();
        layerY -= 5;
      } else if (entry.id === 'onion') {
        ctx.fillStyle = '#c47b38';
        roundRectPath(ctx, x - 15, layerY - 4, 30, 5, 2);
        ctx.fill();
        layerY -= 5;
      } else if (entry.id === 'truffle') {
        ctx.fillStyle = '#5c4033';
        roundRectPath(ctx, x - 14, layerY - 3, 28, 4, 2);
        ctx.fill();
        layerY -= 4;
      } else if (entry.id === 'basil') {
        ctx.fillStyle = '#2e8b57';
        roundRectPath(ctx, x - 14, layerY - 3, 28, 4, 2);
        ctx.fill();
        layerY -= 4;
      }
    }
  }

  drawDishSprite(ctx, recipeId, x, y, scale = 1) {
    const recipe = RECIPE_BY_ID[recipeId];
    if (!recipe) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    if (recipe.category === 'pasta') {
      // Swirled golden pasta mound
      ctx.fillStyle = '#f2c94c';
      ctx.beginPath();
      ctx.ellipse(0, 2, 20, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#d49a22';
      ctx.lineWidth = 2;
      for (let r = 6; r <= 15; r += 4) {
        ctx.beginPath();
        ctx.arc(0, 2, r, 0.2, Math.PI * 1.7);
        ctx.stroke();
      }
      if (recipeId === 'truffle_wagyu_pasta') {
        ctx.fillStyle = '#6e281d';
        ctx.beginPath();
        ctx.arc(-5, 0, 6, 0, Math.PI * 2);
        ctx.arc(6, 3, 5.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#5c3c28';
        ctx.beginPath();
        ctx.ellipse(0, -1, 10, 4, 0.2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(-6, 1, 4, 0, Math.PI * 2);
        ctx.arc(6, 0, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      // Fresh basil crown
      ctx.fillStyle = '#2e8b57';
      ctx.beginPath();
      ctx.ellipse(-3, -6, 5, 2.5, -0.4, 0, Math.PI * 2);
      ctx.ellipse(3, -6, 5, 2.5, 0.4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Gourmet stacked brioche burger
      ctx.fillStyle = '#b96921';
      roundRectPath(ctx, -18, 5, 36, 7, 3);
      ctx.fill();

      ctx.fillStyle = '#6b2417';
      roundRectPath(ctx, -19, 0, 38, 7, 3);
      ctx.fill();

      ctx.fillStyle = recipeId === 'truffle_bistro' ? '#6e4e37' : '#fbbf24';
      roundRectPath(ctx, -18, -3, 36, 4, 2);
      ctx.fill();

      ctx.fillStyle = recipeId === 'caprese_melt' ? '#ef4444' : '#4ade80';
      roundRectPath(ctx, -19, -6, 38, 4, 2);
      ctx.fill();

      // Glossy top sesame brioche crown
      const dome = ctx.createLinearGradient(0, -18, 0, -4);
      dome.addColorStop(0, '#f3a847');
      dome.addColorStop(1, '#c97622');
      ctx.fillStyle = dome;
      ctx.beginPath();
      ctx.arc(0, -5, 18, Math.PI, 0);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#fff8dc';
      for (const [sx, sy] of [[-7, -13], [0, -15], [7, -12], [-3, -9], [5, -9]]) {
        ctx.beginPath();
        ctx.ellipse(sx, sy, 1.8, 1, 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  drawIngredientSprite(ctx, id, x, y, scale = 1, state = 'raw') {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    if (id === 'bun') {
      const grad = ctx.createLinearGradient(0, -12, 0, 10);
      grad.addColorStop(0, '#f6b352');
      grad.addColorStop(1, '#c6731f');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 3, 15, Math.PI, 0);
      ctx.lineTo(15, 7);
      ctx.lineTo(-15, 7);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fff9df';
      for (const [sx, sy] of [[-6, -5], [0, -7], [6, -4], [-2, -1], [4, -1]]) {
        ctx.beginPath();
        ctx.arc(sx, sy, 1.3, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (id === 'patty') {
      let col = '#b83939';
      if (state === 'seared') col = '#8c3b28';
      if (state === 'perfect') col = '#692519';
      if (state === 'burned') col = '#231f20';

      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.ellipse(0, 1, 16, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = state === 'burned' ? '#111' : '#4a1811';
      ctx.lineWidth = 1.6;
      ctx.stroke();

      if (state === 'raw') {
        ctx.fillStyle = 'rgba(255, 224, 224, 0.55)';
        ctx.beginPath();
        ctx.arc(-5, -1, 2, 0, Math.PI * 2);
        ctx.arc(4, 2, 1.8, 0, Math.PI * 2);
        ctx.arc(2, -3, 1.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.strokeStyle = state === 'perfect' ? '#36110a' : '#4b2117';
        ctx.lineWidth = 2;
        for (const gx of [-7, 0, 7]) {
          ctx.beginPath();
          ctx.moveTo(gx - 3, -6);
          ctx.lineTo(gx + 3, 6);
          ctx.stroke();
        }
      }
    } else if (id === 'cheddar') {
      ctx.fillStyle = '#f59e0b';
      roundRectPath(ctx, -13, -8, 22, 15, 2);
      ctx.fill();
      ctx.fillStyle = '#fbbf24';
      ctx.save();
      ctx.rotate(0.18);
      roundRectPath(ctx, -8, -10, 20, 14, 2);
      ctx.fill();
      ctx.restore();
    } else if (id === 'tomato') {
      if (state === 'chopped') {
        for (const [tx, ty] of [[-7, 2], [5, -3], [1, 5]]) {
          ctx.fillStyle = '#e53935';
          ctx.beginPath();
          ctx.arc(tx, ty, 7.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ff9e99';
          ctx.beginPath();
          ctx.arc(tx, ty, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        ctx.fillStyle = '#e53935';
        ctx.beginPath();
        ctx.arc(0, 1, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.beginPath();
        ctx.arc(-4, -4, 3.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#2e7d32';
        ctx.beginPath();
        ctx.ellipse(0, -11, 5, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (id === 'lettuce') {
      if (state === 'chopped') {
        ctx.fillStyle = '#4ade80';
        for (const [lx, ly, ang] of [[-6, 2, -0.4], [4, -3, 0.5], [1, 4, 0.1], [-2, -4, -0.2]]) {
          ctx.save();
          ctx.translate(lx, ly);
          ctx.rotate(ang);
          roundRectPath(ctx, -7, -2.5, 14, 5, 2);
          ctx.fill();
          ctx.restore();
        }
      } else {
        ctx.fillStyle = '#43a047';
        ctx.beginPath();
        ctx.arc(-4, 0, 9, 0, Math.PI * 2);
        ctx.arc(5, 1, 9, 0, Math.PI * 2);
        ctx.arc(0, -4, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#9ccc65';
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (id === 'onion') {
      if (state === 'seared' || state === 'perfect') {
        ctx.strokeStyle = state === 'perfect' ? '#c97a2b' : '#b86c52';
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.arc(-3, 0, 8, 0.2, Math.PI * 1.5);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(4, 2, 7, -0.5, Math.PI * 1.1);
        ctx.stroke();
      } else if (state === 'burned') {
        ctx.fillStyle = '#262323';
        ctx.beginPath();
        ctx.arc(0, 0, 11, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = '#9c4d7d';
        ctx.beginPath();
        ctx.arc(0, 1, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#f3d7ea';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 1, 7, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else if (id === 'truffle') {
      // Ceramic ramekin bowl with dark truffle aioli + spoon
      ctx.fillStyle = '#f5f0e6';
      ctx.beginPath();
      ctx.arc(0, 1, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#6d4c3d';
      ctx.beginPath();
      ctx.arc(0, 1, 9.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2b1d17';
      ctx.beginPath();
      ctx.arc(-2, -1, 1.6, 0, Math.PI * 2);
      ctx.arc(3, 3, 1.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#cfd6de';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(4, -3);
      ctx.lineTo(13, -11);
      ctx.stroke();
    } else if (id === 'pasta') {
      ctx.strokeStyle =
        state === 'burned' ? '#2c2927' : state === 'perfect' ? '#eab308' : '#f2c94c';
      ctx.lineWidth = 3.2;
      for (const r of [11, 7.5, 4]) {
        ctx.beginPath();
        ctx.arc(0, 1, r, 0, Math.PI * 1.75);
        ctx.stroke();
      }
    } else if (id === 'basil') {
      if (state === 'chopped') {
        ctx.fillStyle = '#2e8b57';
        for (const [bx, by] of [[-5, 2], [4, -2], [0, 5], [-3, -4], [6, 3]]) {
          ctx.beginPath();
          ctx.ellipse(bx, by, 4, 1.8, bx, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        ctx.fillStyle = '#2e8b57';
        ctx.beginPath();
        ctx.ellipse(-5, 0, 7, 4.5, -0.5, 0, Math.PI * 2);
        ctx.ellipse(5, 0, 7, 4.5, 0.5, 0, Math.PI * 2);
        ctx.ellipse(0, -6, 6, 4.5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (id === 'butter') {
      ctx.fillStyle = '#fff5d6';
      roundRectPath(ctx, -14, -8, 28, 17, 3);
      ctx.fill();
      ctx.fillStyle = '#ffe066';
      roundRectPath(ctx, -10, -5, 20, 11, 2);
      ctx.fill();
      ctx.fillStyle = '#2e8b57';
      ctx.beginPath();
      ctx.arc(-3, 0, 1.5, 0, Math.PI * 2);
      ctx.arc(4, -1, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  _drawNavigationMarker(ctx, state) {
    const wps = state.chef.waypoints;
    if (!wps || wps.length === 0) return;
    const target = wps[wps.length - 1];
    const pulse = 0.5 + Math.sin(state.elapsed * 8) * 0.25;
    ctx.save();
    ctx.strokeStyle = `rgba(255, 209, 92, ${pulse})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(target.x, target.y, 13, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  _drawChef(ctx, state) {
    const chef = state.chef;
    const bob = chef.moving ? Math.sin(chef.walkCycle) * 2.5 : Math.sin(state.elapsed * 3) * 0.9;
    const cx = chef.x;
    const cy = chef.y + bob;

    ctx.save();
    // Soft floor shadow
    ctx.fillStyle = 'rgba(20, 10, 5, 0.28)';
    ctx.beginPath();
    ctx.ellipse(chef.x, chef.y + 18, 20, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // Stepping shoes
    const stride = chef.moving ? Math.sin(chef.walkCycle) * 5 : 0;
    ctx.fillStyle = '#2a1c15';
    ctx.beginPath();
    ctx.ellipse(cx - 8, chef.y + 15 + stride * 0.5, 6, 4, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + 8, chef.y + 15 - stride * 0.5, 6, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Chef double-breasted white jacket & warm terracotta apron
    ctx.fillStyle = '#ffffff';
    roundRectPath(ctx, cx - 17, cy - 8, 34, 24, 10);
    ctx.fill();
    ctx.strokeStyle = '#d1c7b8';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#d95326';
    roundRectPath(ctx, cx - 12, cy + 2, 24, 15, 5);
    ctx.fill();

    // Hands facing direction
    const handBaseX = cx + chef.dirX * 20;
    const handBaseY = cy + 2 + chef.dirY * 14;
    ctx.fillStyle = '#f2c199';
    ctx.beginPath();
    ctx.arc(handBaseX - chef.dirY * 10, handBaseY + chef.dirX * 10, 5, 0, Math.PI * 2);
    ctx.arc(handBaseX + chef.dirY * 10, handBaseY - chef.dirX * 10, 5, 0, Math.PI * 2);
    ctx.fill();

    // Held ingredient or finished gourmet plate
    if (chef.holding) {
      const holdX = cx + chef.dirX * 26;
      const holdY = cy - 4 + chef.dirY * 16;
      if (chef.holding.kind === 'dish') {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(holdX, holdY, 17, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffd15c';
        ctx.lineWidth = 2;
        ctx.stroke();
        this.drawDishSprite(ctx, chef.holding.recipeId, holdX, holdY, 0.72);
      } else {
        this.drawIngredientSprite(ctx, chef.holding.id, holdX, holdY, 0.95, chef.holding.state);
      }
    }

    // Chef head
    ctx.fillStyle = '#f2c199';
    ctx.beginPath();
    ctx.arc(cx, cy - 13, 13, 0, Math.PI * 2);
    ctx.fill();

    // Expressive eyes oriented slightly toward movement
    const eyeOffX = chef.dirX * 3.5;
    const eyeOffY = chef.dirY * 2.5;
    ctx.fillStyle = '#291a12';
    ctx.beginPath();
    ctx.arc(cx - 4 + eyeOffX, cy - 12 + eyeOffY, 1.8, 0, Math.PI * 2);
    ctx.arc(cx + 4 + eyeOffX, cy - 12 + eyeOffY, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Classic pleated white chef toque hat
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#dcd4c8';
    ctx.lineWidth = 1.4;
    roundRectPath(ctx, cx - 12, cy - 30, 24, 12, 4);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx - 7, cy - 32, 7.5, 0, Math.PI * 2);
    ctx.arc(cx + 7, cy - 32, 7.5, 0, Math.PI * 2);
    ctx.arc(cx, cy - 35, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  _drawBellRings(ctx, state) {
    for (const ring of state.bellRings) {
      const alpha = Math.max(0, ring.life / ring.maxLife);
      ctx.save();
      ctx.strokeStyle = `rgba(255, 209, 92, ${alpha})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  _drawParticles(ctx, state) {
    for (const p of state.particles) {
      const alpha = Math.max(0, Math.min(1, p.life / p.maxLife));
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  _drawPopups(ctx, state) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 15px "Segoe UI", sans-serif';
    for (const pop of state.popups) {
      const alpha = Math.max(0, Math.min(1, pop.life / 0.45));
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(26, 15, 9, 0.9)';
      ctx.strokeText(pop.text, pop.x, pop.y);
      ctx.fillStyle = pop.color;
      ctx.fillText(pop.text, pop.x, pop.y);
    }
    ctx.restore();
  }
}
