import {
  INGREDIENTS,
  RECIPES,
  RECIPE_BY_ID,
  calculateStarRating,
} from './recipes.js';
import { KitchenState } from './kitchenState.js';
import { KitchenRenderer } from './renderer.js';
import { InputController } from './input.js';
import { audio } from './audio.js';

const params = new URLSearchParams(window.location.search);
const shotParam = (params.get('shot') || '').toLowerCase();
const seedParam = Number(params.get('seed') || '1') || 1;
const initialShotMode = ['start', 'play', 'end'].includes(shotParam) ? shotParam : 'start';

const canvas = document.getElementById('kitchen-canvas');
const hudTimerEl = document.getElementById('hud-timer');
const timerPillEl = document.getElementById('timer-pill');
const hudRevenueEl = document.getElementById('hud-revenue');
const hudTipsEl = document.getElementById('hud-tips');
const hudComboEl = document.getElementById('hud-combo');
const comboPillEl = document.getElementById('combo-pill');
const orderRailEl = document.getElementById('order-rail');
const holdingBadgeEl = document.getElementById('holding-badge');

const overlayStartEl = document.getElementById('overlay-start');
const overlayRecipesEl = document.getElementById('overlay-recipes');
const overlayEndEl = document.getElementById('overlay-end');
const recipeGuideGridEl = document.getElementById('recipe-guide-grid');

const btnPlayEl = document.getElementById('btn-play');
const btnStartRecipesEl = document.getElementById('btn-start-recipes');
const btnCloseRecipesEl = document.getElementById('btn-close-recipes');
const btnPlayAgainEl = document.getElementById('btn-play-again');
const btnEndRecipesEl = document.getElementById('btn-end-recipes');
const btnAudioEl = document.getElementById('btn-audio');
const btnRecipesEl = document.getElementById('btn-recipes');
const btnRestartEl = document.getElementById('btn-restart');

const endStarsEl = document.getElementById('end-stars');
const endVerdictEl = document.getElementById('end-verdict');
const endRevenueEl = document.getElementById('end-revenue');
const endServedEl = document.getElementById('end-served');
const endBestComboEl = document.getElementById('end-best-combo');
const endTipsEl = document.getElementById('end-tips');
const endBreakdownEl = document.getElementById('end-breakdown');

const state = new KitchenState({ seed: seedParam, shotMode: initialShotMode });
const renderer = new KitchenRenderer(canvas);

function formatClock(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

function populateRecipeBook() {
  recipeGuideGridEl.innerHTML = RECIPES.map((recipe) => {
    const badges = recipe.ingredients
      .map((id) => {
        const spec = INGREDIENTS[id];
        const verb =
          spec.prep === 'grill' ? 'Grill' : spec.prep === 'chop' ? 'Chop' : 'Ready';
        return `<span class="step-badge ${spec.prep}">${spec.name} (${verb})</span>`;
      })
      .join('');
    return `
      <div class="recipe-guide-item">
        <div class="recipe-guide-top">
          <span>${recipe.name}</span>
          <span class="recipe-guide-price">$${recipe.price}</span>
        </div>
        <div class="recipe-guide-steps">${badges}</div>
      </div>
    `;
  }).join('');
}

let lastRailSignature = '';
let lastPhaseRendered = '';

function syncOverlays() {
  if (state.phase === 'start') {
    overlayStartEl.classList.remove('hidden');
    overlayEndEl.classList.add('hidden');
  } else if (state.phase === 'playing') {
    overlayStartEl.classList.add('hidden');
    overlayEndEl.classList.add('hidden');
  } else if (state.phase === 'ended') {
    overlayStartEl.classList.add('hidden');
    overlayEndEl.classList.remove('hidden');
    if (lastPhaseRendered !== 'ended') {
      const { stars, verdict } = calculateStarRating(
        state.revenue,
        state.servedCount,
        state.missedCount,
      );
      endStarsEl.textContent = `${'★ '.repeat(stars).trim()}${' ☆'.repeat(5 - stars)}`;
      endVerdictEl.textContent = verdict;
      endRevenueEl.textContent = `$${state.revenue}`;
      endServedEl.textContent = String(state.servedCount);
      endBestComboEl.textContent = `x${state.bestCombo}`;
      endTipsEl.textContent = `$${state.tipsEarned}`;
      endBreakdownEl.textContent = `Perfect Grill Dishes: ${state.perfectDishes}  •  Missed Tickets: ${state.missedCount}`;
    }
  }
  lastPhaseRendered = state.phase;
}

function getHoldingDescription() {
  const h = state.chef.holding;
  if (!h) return 'Hands: Empty';
  if (h.kind === 'dish') {
    const recipe = RECIPE_BY_ID[h.recipeId];
    return `Carrying: ${recipe ? recipe.shortName : 'Dish'} (Take to Pass!)`;
  }
  const spec = INGREDIENTS[h.id];
  const stateLabel =
    h.state === 'raw' ? '' : ` [${h.state.toUpperCase()}]`;
  return `Holding: ${spec ? spec.name : h.id}${stateLabel}`;
}

function syncOrderRail() {
  const asm = state.stationMap.assembly;
  const asmIds = new Set(asm.stack.map((item) => item.id));
  const passDishId = state.stationMap.pass.item?.recipeId || null;
  const heldDishId =
    state.chef.holding?.kind === 'dish' ? state.chef.holding.recipeId : null;

  const signature = state.orders
    .map((o) => {
      const recipe = RECIPE_BY_ID[o.recipeId];
      const doneMask = recipe.ingredients
        .map((id) => (asmIds.has(id) ? '1' : '0'))
        .join('');
      const ready =
        asm.completedRecipeId === o.recipeId ||
        passDishId === o.recipeId ||
        heldDishId === o.recipeId;
      return `${o.uid}:${doneMask}:${ready ? 'R' : '0'}`;
    })
    .join('|') + `@${state.pinnedOrderUid || ''}`;

  if (signature !== lastRailSignature) {
    lastRailSignature = signature;
    if (state.orders.length === 0) {
      orderRailEl.innerHTML =
        '<div class="empty-rail-hint">Waiting for fresh dining room tickets...</div>';
    } else {
      orderRailEl.innerHTML = state.orders
        .map((ord) => {
          const recipe = RECIPE_BY_ID[ord.recipeId];
          const isPinned = ord.uid === state.pinnedOrderUid;
          const isReadyMatch =
            asm.completedRecipeId === ord.recipeId ||
            passDishId === ord.recipeId ||
            heldDishId === ord.recipeId;
          const chips = recipe.ingredients
            .map((id) => {
              const spec = INGREDIENTS[id];
              const isDone = asmIds.has(id);
              const tag =
                spec.prep === 'grill' ? '🔥' : spec.prep === 'chop' ? '🔪' : '';
              return `<span class="ing-chip${isDone ? ' done' : ''}"><span class="ing-dot" style="background:${spec.color}"></span>${tag}${spec.shortName}</span>`;
            })
            .join('');
          return `
            <article class="order-ticket${isPinned ? ' pinned' : ''}${isReadyMatch ? ' ready-match' : ''}" data-uid="${ord.uid}">
              <div class="ticket-head">
                <span class="ticket-title">${recipe.name}</span>
                <span class="ticket-price">$${recipe.price}</span>
              </div>
              <div class="ticket-ingredients">${chips}</div>
              <div class="ticket-timer-track">
                <div class="ticket-timer-fill ok" data-timer-uid="${ord.uid}" style="width:100%"></div>
              </div>
            </article>
          `;
        })
        .join('');
    }
  }

  for (const ord of state.orders) {
    const fillEl = orderRailEl.querySelector(`[data-timer-uid="${ord.uid}"]`);
    if (!fillEl) continue;
    const pct = Math.max(0, Math.min(100, (ord.remaining / ord.duration) * 100));
    fillEl.style.width = `${pct.toFixed(1)}%`;
    fillEl.className = `ticket-timer-fill ${pct > 50 ? 'ok' : pct > 24 ? 'warn' : 'crit'}`;
  }
}

function syncHud() {
  hudTimerEl.textContent = formatClock(state.shiftTime);
  timerPillEl.classList.toggle('urgent', state.phase === 'playing' && state.shiftTime <= 20);
  hudRevenueEl.textContent = `$${state.revenue}`;
  hudTipsEl.textContent = `+$${state.tipsEarned} tips`;
  hudComboEl.textContent = `x${state.combo}`;
  comboPillEl.classList.toggle('hot', state.combo >= 3);
  holdingBadgeEl.textContent = getHoldingDescription();

  syncOrderRail();
  syncOverlays();
}

function toggleRecipeModal(forceOpen) {
  const isOpen = !overlayRecipesEl.classList.contains('hidden');
  const next = typeof forceOpen === 'boolean' ? forceOpen : !isOpen;
  overlayRecipesEl.classList.toggle('hidden', !next);
}

function toggleAudio() {
  audio.setMuted(!audio.isMuted());
  btnAudioEl.textContent = audio.isMuted() ? '🔇' : '🔊';
}

const input = new InputController(canvas, renderer, state, {
  isModalOpen: () => !overlayRecipesEl.classList.contains('hidden'),
  onEscape: () => {
    if (!overlayRecipesEl.classList.contains('hidden')) {
      toggleRecipeModal(false);
    }
  },
  onToggleRecipes: () => toggleRecipeModal(),
  onToggleAudio: () => toggleAudio(),
  onStartPlay: () => {
    audio.unlock();
    state.startNewShift();
    syncHud();
  },
});

orderRailEl.addEventListener('click', (e) => {
  const card = e.target.closest('.order-ticket');
  if (!card) return;
  const uid = card.getAttribute('data-uid');
  if (uid) {
    state.pinOrder(uid);
    syncOrderRail();
  }
});

btnPlayEl.addEventListener('click', () => {
  audio.unlock();
  state.startNewShift();
  syncHud();
});

btnPlayAgainEl.addEventListener('click', () => {
  audio.unlock();
  state.startNewShift();
  syncHud();
});

btnRestartEl.addEventListener('click', () => {
  audio.unlock();
  toggleRecipeModal(false);
  state.startNewShift();
  syncHud();
});

btnStartRecipesEl.addEventListener('click', () => toggleRecipeModal(true));
btnEndRecipesEl.addEventListener('click', () => toggleRecipeModal(true));
btnRecipesEl.addEventListener('click', () => toggleRecipeModal());
btnCloseRecipesEl.addEventListener('click', () => toggleRecipeModal(false));
btnAudioEl.addEventListener('click', () => toggleAudio());

overlayRecipesEl.addEventListener('click', (e) => {
  if (e.target === overlayRecipesEl) toggleRecipeModal(false);
});

populateRecipeBook();
syncHud();
renderer.render(state);

let lastTime = performance.now();
function frame(now) {
  const dt = Math.min(0.05, Math.max(0, (now - lastTime) / 1000));
  lastTime = now;

  const move = input.getMovementVector();
  state.update(dt, move.x, move.y);
  renderer.render(state);
  syncHud();

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
