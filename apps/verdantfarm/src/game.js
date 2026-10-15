import AsyncStorage from '@react-native-async-storage/async-storage';

export const CROPS = {
  wheat:     { name: 'Wheat',      emoji: '🌾', growTime: 10,  seedCost: 5,   sellPrice: 9,   unlockLevel: 1,  lore: 'The starter grain that never abandoned the valley.' },
  carrot:    { name: 'Carrot',     emoji: '🥕', growTime: 25,  seedCost: 12,  sellPrice: 24,  unlockLevel: 2,  lore: 'Rabbit-shaped moonlight collectors, Granny called them.' },
  tomato:    { name: 'Tomato',     emoji: '🍅', growTime: 45,  seedCost: 25,  sellPrice: 52,  unlockLevel: 4,  lore: 'Red lanterns that ripen at dusk.' },
  corn:      { name: 'Corn',       emoji: '🌽', growTime: 80,  seedCost: 45,  sellPrice: 96,  unlockLevel: 6,  lore: 'Tall singers; when wind passes, the valley hums.' },
  pumpkin:   { name: 'Pumpkin',    emoji: '🎃', growTime: 120, seedCost: 78,  sellPrice: 170, unlockLevel: 8,  lore: "Festival fruit; the Wither's first undoing." },
  strawberry:{ name: 'Strawberry', emoji: '🍓', growTime: 180, seedCost: 130, sellPrice: 300, unlockLevel: 10, lore: 'Sweethearts of the eastern plot.' },
  moonpetal:  { name: 'Moonpetal', emoji: '🌙', growTime: 240, seedCost: 200, sellPrice: 0,   unlockLevel: 12, lore: 'A magical flower; currency for rare trades with Pim.', isRare: true },
};

export const ANIMALS = {
  hen:      { name: 'Hen',        emoji: '🐔', product: 'eggs',       productName: 'Eggs',       productEmoji: '🥚', cycleTime: 60,  buyCost: 120,  unlockLevel: 3,  lore: 'Henrietta and her sisters, the dawn chorus.' },
  cow:      { name: 'Cow',        emoji: '🐄', product: 'milk',       productName: 'Milk',       productEmoji: '🥛', cycleTime: 180, buyCost: 400,  unlockLevel: 5,  lore: 'Clementine, slow and sweet.' },
  sheep:    { name: 'Sheep',      emoji: '🐑', product: 'wool',       productName: 'Wool',       productEmoji: '🧶', cycleTime: 300, buyCost: 700,  unlockLevel: 7,  lore: 'Nimbus, a cloud that follows you.' },
  goat:     { name: 'Goat',       emoji: '🐐', product: 'cheese',    productName: 'Goat Cheese',productEmoji: '🧀', cycleTime: 420, buyCost: 1200, unlockLevel: 9,  lore: 'Beppo eats everything except instructions.' },
  bees:     { name: 'Bee Hive',   emoji: '🐝', product: 'honey',      productName: 'Honey',      productEmoji: '🍯', cycleTime: 600, buyCost: 2500, unlockLevel: 11, lore: 'Queen Aster boosts nearby crops.', boost: 0.15 },
  alpaca:   { name: 'Alpaca',     emoji: '🦙', product: 'fiber',      productName: 'Fine Fiber',  productEmoji: '🧵', cycleTime: 900, buyCost: 5000, unlockLevel: 13, lore: 'Duchess demands premium hay and gives premium fluff.' },
};

export const PRODUCTS = Object.fromEntries(Object.entries(ANIMALS).map(([id, a]) => [id, {
  name: a.productName, emoji: a.productEmoji,
}]));

export const UPGRADES = {
  sprinkler: { name: 'Sprinkler',   desc: 'Crops grow 20% faster per level',     cost: 250,  maxLevel: 3 },
  market:    { name: 'Market Deal', desc: '+15% sell price per level',           cost: 400,  maxLevel: 3 },
  barn:      { name: 'Big Barn',    desc: '+20 storage capacity per level',      cost: 350,  maxLevel: 3 },
};

export const WEATHERS = {
  sunny:  { name: 'Sunny',  emoji: '☀️', growth: 1.0,  weight: 5 },
  cloudy: { name: 'Cloudy', emoji: '☁️', growth: 1.0,  weight: 3 },
  rain:   { name: 'Rain',   emoji: '🌧️', growth: 1.25, weight: 2 },
  blessing: { name: 'Valley Blessing', emoji: '✨', growth: 1.5, weight: 0 },
};

export function questDefs(state) {
  return [
    { id: 'first_harvest', title: 'First Harvest', desc: 'Harvest any crop.', target: 1, kind: 'harvest_count', rewardCoins: 50, rewardXp: 20, lore: 'Rook: "One seed back. The valley remembers."' },
    { id: 'wheat_10', title: 'Golden Fields', desc: 'Harvest 10 wheat.', target: 10, kind: 'harvest_wheat', rewardCoins: 120, rewardXp: 40, lore: 'Rook: "Fields of gold, dummy of straw. We all grow."' },
    { id: 'first_animal', title: 'A Voice Returns', desc: 'Buy your first animal.', target: 1, kind: 'animal_count', rewardCoins: 100, rewardXp: 50, lore: 'The valley has not heard a hen in years.' },
    { id: 'moonpetal_1', title: 'Granny\u2019s Secret', desc: 'Grow a Moonpetal.', target: 1, kind: 'harvest_moonpetal', rewardCoins: 500, rewardXp: 200, lore: 'Granny Alba: "When the moon blooms, I am with you."' },
    { id: 'products_25', title: 'Feeding the Valley', desc: 'Collect 25 animal products.', target: 25, kind: 'product_count', rewardCoins: 400, rewardXp: 120, lore: 'Old Marlow: "Bridge planks don\u2019t buy themselves."' },
    { id: 'rich_soil', title: 'Golden Soil', desc: 'Upgrade any plot.', target: 1, kind: 'plot_upgrade', rewardCoins: 300, rewardXp: 100, lore: 'Rook: "Rich soil, rich soul. Cheap pun, real magic."' },
  ];
}

const SAVE_KEY = 'verdantfarm_save_v2';
const XP_BASE = 100;
const DAY_LENGTH = 240;

export class GameManager {
  constructor() {
    this.state = {
      coins: 50,
      level: 1,
      xp: 0,
      plots: this.initialPlots(4),
      barn: {},
      animals: [],
      products: {},
      upgrades: {},
      weather: 'sunny',
      weatherUntil: 0,
      time: 6 * 3600,
      almanac: { crops: {}, products: {} },
      stats: { harvests: 0, harvestsByCrop: {}, productsCollected: 0, plotUpgrades: 0 },
      quests: {},
      lastTick: Date.now(),
    };
    this.listeners = [];
  }

  initialPlots(n) {
    return Array.from({ length: n }, () => ({ crop: null, ready: false, growProgress: 0, tier: 1 }));
  }

  async load() {
    try {
      const raw = await AsyncStorage.getItem(SAVE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        this.state = { ...this.state, ...saved };
        this.state.lastTick = Date.now();
      }
    } catch (e) {}
    this.rollWeather(Date.now());
  }

  async save() {
    try {
      const s = { ...this.state, lastTick: Date.now() };
      await AsyncStorage.setItem(SAVE_KEY, JSON.stringify(s));
    } catch (e) {}
  }

  getState() { return JSON.parse(JSON.stringify(this.state)); }

  get xpNeeded() { return Math.floor(XP_BASE * Math.pow(1.4, this.state.level - 1)); }

  isNight() {
    const hour = (this.state.time / 3600) % 24;
    return hour < 6 || hour >= 20;
  }

  rollWeather(now) {
    if (this.state.weatherUntil > now) return;
    const entries = Object.entries(WEATHERS).filter(([id]) => id !== 'blessing');
    const total = entries.reduce((s, [, w]) => s + w.weight, 0);
    let r = Math.random() * total;
    for (const [id, w] of entries) { r -= w.weight; if (r <= 0) { this.state.weather = id; break; } }
    this.state.weatherUntil = now + 120000 + Math.random() * 180000;
    if (Math.random() < 0.08) {
      this.state.weather = 'blessing';
      this.state.weatherUntil = now + 30000;
    }
  }

  tick() {
    const now = Date.now();
    const dt = (now - this.state.lastTick) / 1000;
    this.state.lastTick = now;
    this.state.time += dt;
    this.rollWeather(now);
    const weather = WEATHERS[this.state.weather] || WEATHERS.sunny;
    const sprinkler = 1 + 0.2 * (this.state.upgrades.sprinkler || 0);
    const bees = this.state.animals.filter((a) => a.id === 'bees').length * 0.15;

    for (const p of this.state.plots) {
      if (p.crop && !p.ready) {
        const crop = CROPS[p.crop];
        let speed = sprinkler * weather.growth * (1 + bees) * p.tier;
        if (crop.isRare && !this.isNight()) speed *= 0.5;
        p.growProgress += (dt * speed) / crop.growTime;
        if (p.growProgress >= 1) p.ready = true;
      }
    }

    for (const a of this.state.animals) {
      if (!a.ready) {
        a.progress = (a.progress || 0) + dt / ANIMALS[a.id].cycleTime;
        if (a.progress >= 1) { a.ready = true; a.progress = 1; }
      }
    }
    return this.state;
  }

  addXp(amount) {
    this.state.xp += amount;
    while (this.state.xp >= this.xpNeeded) {
      this.state.xp -= this.xpNeeded;
      this.state.level += 1;
      this.listeners.forEach((cb) => cb({ type: 'levelup', level: this.state.level }));
    }
  }

  plant(plotIndex, cropId) {
    const crop = CROPS[cropId];
    if (!crop) return { ok: false, error: 'Unknown crop' };
    if (this.state.level < crop.unlockLevel) return { ok: false, error: `${crop.name} unlocks at level ${crop.unlockLevel}` };
    const plot = this.state.plots[plotIndex];
    if (!plot) return { ok: false, error: 'No such plot' };
    if (plot.crop) return { ok: false, error: 'Plot is occupied' };
    if (this.state.coins < crop.seedCost) return { ok: false, error: 'Not enough coins' };
    this.state.coins -= crop.seedCost;
    plot.crop = cropId;
    plot.ready = false;
    plot.growProgress = 0;
    this.save();
    return { ok: true };
  }

  harvest(plotIndex) {
    const plot = this.state.plots[plotIndex];
    if (!plot || !plot.crop || !plot.ready) return { ok: false, error: 'Nothing ready to harvest' };
    const crop = CROPS[plot.crop];
    const weatherBonus = this.state.weather === 'blessing' ? 2 : 1;
    const yieldAmount = (1 + Math.floor(Math.random() * 2) + Math.floor(this.state.level / 5)) * weatherBonus;
    const cap = this.barnCapacity();
    const used = Object.values(this.state.barn).reduce((s, v) => s + v, 0);
    if (used >= cap) return { ok: false, error: 'Barn is full! Sell or upgrade.' };
    const cropId = plot.crop;
    this.state.barn[cropId] = (this.state.barn[cropId] || 0) + yieldAmount;
    plot.crop = null; plot.ready = false; plot.growProgress = 0;
    this.state.stats.harvests += 1;
    this.state.stats.harvestsByCrop[cropId] = (this.state.stats.harvestsByCrop[cropId] || 0) + 1;
    this.state.almanac.crops[cropId] = true;
    this.addXp(5 + Math.floor(crop.sellPrice / 10));
    this.progressQuests('harvest_count', 1);
    this.progressQuests('harvest_' + cropId, 1);
    this.save();
    return { ok: true, amount: yieldAmount, cropName: crop.name };
  }

  barnCapacity() {
    return 50 + 20 * (this.state.upgrades.barn || 0);
  }

  sell(cropId) {
    const qty = this.state.barn[cropId] || 0;
    if (qty <= 0) return { ok: false, error: 'Nothing to sell' };
    const crop = CROPS[cropId];
    if (crop.isRare) return { ok: false, error: 'Moonpetals are too precious to sell. Trade them with Pim!' };
    const bonus = 1 + 0.15 * (this.state.upgrades.market || 0);
    const earned = Math.floor(crop.sellPrice * qty * bonus);
    this.state.barn[cropId] = 0;
    this.state.coins += earned;
    this.addXp(2 * qty);
    this.save();
    return { ok: true, earned };
  }

  buyAnimal(animalId) {
    const a = ANIMALS[animalId];
    if (!a) return { ok: false, error: 'Unknown animal' };
    if (this.state.level < a.unlockLevel) return { ok: false, error: `${a.name} unlocks at level ${a.unlockLevel}` };
    const count = this.state.animals.filter((x) => x.id === animalId).length;
    const cost = Math.floor(a.buyCost * Math.pow(1.3, count));
    if (this.state.coins < cost) return { ok: false, error: 'Not enough coins' };
    this.state.coins -= cost;
    this.state.animals.push({ id: animalId, ready: false, progress: 0 });
    this.addXp(20);
    this.progressQuests('animal_count', 1);
    this.save();
    return { ok: true, cost };
  }

  animalCost(animalId) {
    const a = ANIMALS[animalId];
    const count = this.state.animals.filter((x) => x.id === animalId).length;
    return Math.floor(a.buyCost * Math.pow(1.3, count));
  }

  collectAnimal(index) {
    const a = this.state.animals[index];
    if (!a || !a.ready) return { ok: false, error: 'Not ready yet' };
    const def = ANIMALS[a.id];
    this.state.products[a.id] = (this.state.products[a.id] || 0) + 1;
    this.state.almanac.products[a.id] = true;
    a.ready = false; a.progress = 0;
    this.state.stats.productsCollected += 1;
    this.addXp(10);
    this.progressQuests('product_count', 1);
    this.save();
    return { ok: true, product: def.productName, emoji: def.productEmoji };
  }

  sellProduct(animalId) {
    const qty = this.state.products[animalId] || 0;
    if (qty <= 0) return { ok: false, error: 'Nothing to sell' };
    const def = ANIMALS[animalId];
    const unit = Math.floor(def.buyCost / 4);
    const bonus = 1 + 0.15 * (this.state.upgrades.market || 0);
    const earned = Math.floor(unit * qty * bonus);
    this.state.products[animalId] = 0;
    this.state.coins += earned;
    this.addXp(3 * qty);
    this.save();
    return { ok: true, earned };
  }

  plotCost() { return Math.floor(100 * Math.pow(1.6, this.state.plots.length - 4)); }

  plotUpgradeCost(tier) { return Math.floor(300 * Math.pow(2.5, tier - 1)); }

  upgradePlot(index) {
    const plot = this.state.plots[index];
    if (!plot) return { ok: false, error: 'No such plot' };
    if (plot.tier >= 3) return { ok: false, error: 'Already golden soil' };
    const cost = this.plotUpgradeCost(plot.tier);
    if (this.state.coins < cost) return { ok: false, error: 'Not enough coins' };
    this.state.coins -= cost;
    plot.tier += 1;
    this.state.stats.plotUpgrades += 1;
    this.progressQuests('plot_upgrade', 1);
    this.save();
    return { ok: true };
  }

  buy(kind, id) {
    if (kind === 'plot') {
      const cost = this.plotCost();
      if (this.state.coins < cost) return { ok: false, error: 'Not enough coins' };
      this.state.coins -= cost;
      this.state.plots.push({ crop: null, ready: false, growProgress: 0, tier: 1 });
      this.save();
      return { ok: true };
    }
    if (kind === 'upgrade') {
      const up = UPGRADES[id];
      const lvl = this.state.upgrades[id] || 0;
      if (lvl >= up.maxLevel) return { ok: false, error: 'Already max level' };
      const cost = up.cost * (lvl + 1);
      if (this.state.coins < cost) return { ok: false, error: 'Not enough coins' };
      this.state.coins -= cost;
      this.state.upgrades[id] = lvl + 1;
      this.save();
      return { ok: true };
    }
    return { ok: false, error: 'Unknown purchase' };
  }

  questList() {
    const defs = questDefs(this.state);
    return defs.map((q) => {
      const progress = q.kind === 'harvest_wheat'
        ? (this.state.stats.harvestsByCrop.wheat || 0)
        : q.kind === 'harvest_moonpetal'
        ? (this.state.stats.harvestsByCrop.moonpetal || 0)
        : q.kind === 'harvest_count'
        ? this.state.stats.harvests
        : q.kind === 'animal_count'
        ? this.state.animals.length
        : q.kind === 'product_count'
        ? this.state.stats.productsCollected
        : q.kind === 'plot_upgrade'
        ? this.state.stats.plotUpgrades
        : 0;
      const claimed = !!this.state.quests[q.id];
      return { ...q, progress: Math.min(progress, q.target), claimed, done: progress >= q.target };
    });
  }

  progressQuests(kind) {
    // quest progress is derived from state; nothing to mutate here.
    // claiming happens explicitly through claimQuest.
  }

  claimQuest(questId) {
    const list = this.questList();
    const q = list.find((x) => x.id === questId);
    if (!q || !q.done || q.claimed) return { ok: false, error: 'Quest not claimable' };
    this.state.quests[questId] = true;
    this.state.coins += q.rewardCoins;
    this.addXp(q.rewardXp);
    this.save();
    return { ok: true, lore: q.lore };
  }
}
