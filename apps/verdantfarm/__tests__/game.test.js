import { GameManager, CROPS, ANIMALS, WEATHERS } from '../src/game';

describe('GameManager — crops', () => {
  let gm;
  beforeEach(() => {
    gm = new GameManager();
    gm.state.coins = 5000;
    gm.state.level = 15;
  });

  test('plants and grows a crop to ready', () => {
    expect(gm.plant(0, 'wheat').ok).toBe(true);
    gm.state.lastTick -= CROPS.wheat.growTime * 1000 + 200;
    gm.tick();
    expect(gm.state.plots[0].ready).toBe(true);
  });

  test('harvest fills barn and almanac', () => {
    gm.plant(0, 'wheat');
    gm.state.lastTick -= CROPS.wheat.growTime * 1000 + 200;
    gm.tick();
    const res = gm.harvest(0);
    expect(res.ok).toBe(true);
    expect(gm.state.barn.wheat).toBeGreaterThan(0);
    expect(gm.state.almanac.crops.wheat).toBe(true);
    expect(gm.state.stats.harvests).toBe(1);
  });

  test('harvest refuses unready plot', () => {
    gm.plant(0, 'wheat');
    expect(gm.harvest(0).ok).toBe(false);
  });

  test('barn capacity blocks overflow', () => {
    gm.state.upgrades.barn = 0;
    gm.state.barn.wheat = gm.barnCapacity();
    gm.plant(0, 'wheat');
    gm.state.lastTick -= CROPS.wheat.growTime * 1000 + 200;
    gm.tick();
    const res = gm.harvest(0);
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/full/i);
  });

  test('sell applies market bonus', () => {
    gm.state.upgrades.market = 1;
    gm.state.barn.wheat = 10;
    const res = gm.sell('wheat');
    expect(res.ok).toBe(true);
    expect(res.earned).toBe(Math.floor(CROPS.wheat.sellPrice * 10 * 1.15));
  });

  test('moonpetal cannot be sold', () => {
    gm.state.barn.moonpetal = 5;
    expect(gm.sell('moonpetal').ok).toBe(false);
  });

  test('locked crop refused', () => {
    gm.state.level = 1;
    expect(gm.plant(0, 'strawberry').ok).toBe(false);
  });
});

describe('GameManager — animals', () => {
  let gm;
  beforeEach(() => {
    gm = new GameManager();
    gm.state.coins = 100000;
    gm.state.level = 15;
  });

  test('buy animal deducts escalating cost', () => {
    const c1 = gm.animalCost('hen');
    const res1 = gm.buyAnimal('hen');
    expect(res1.ok).toBe(true);
    expect(gm.state.coins).toBe(100000 - c1);
    expect(gm.animalCost('hen')).toBeGreaterThan(c1);
  });

  test('animal produces over time and collect works', () => {
    gm.buyAnimal('hen');
    gm.state.animals[0].progress = 1;
    gm.state.animals[0].ready = true;
    const res = gm.collectAnimal(0);
    expect(res.ok).toBe(true);
    expect(res.product).toBe('Eggs');
    expect(gm.state.products.hen).toBe(1);
    expect(gm.state.almanac.products.hen).toBe(true);
    expect(gm.state.animals[0].ready).toBe(false);
  });

  test('collect refuses unready animal', () => {
    gm.buyAnimal('hen');
    expect(gm.collectAnimal(0).ok).toBe(false);
  });

  test('sell product earns coins', () => {
    gm.state.products.cow = 3;
    const res = gm.sellProduct('cow');
    expect(res.ok).toBe(true);
    expect(res.earned).toBeGreaterThan(0);
    expect(gm.state.products.cow).toBe(0);
  });
});

describe('GameManager — plots & upgrades', () => {
  let gm;
  beforeEach(() => {
    gm = new GameManager();
    gm.state.coins = 100000;
  });

  test('buy plot expands farm', () => {
    const n = gm.state.plots.length;
    expect(gm.buy('plot').ok).toBe(true);
    expect(gm.state.plots.length).toBe(n + 1);
  });

  test('upgrade plot to rich then golden', () => {
    expect(gm.upgradePlot(0).ok).toBe(true);
    expect(gm.state.plots[0].tier).toBe(2);
    expect(gm.upgradePlot(0).ok).toBe(true);
    expect(gm.state.plots[0].tier).toBe(3);
    expect(gm.upgradePlot(0).ok).toBe(false);
  });

  test('upgrade cost escalates', () => {
    expect(gm.plotUpgradeCost(1)).toBeLessThan(gm.plotUpgradeCost(2));
  });

  test('sprinkler upgrade capped', () => {
    gm.buy('upgrade', 'sprinkler');
    gm.buy('upgrade', 'sprinkler');
    gm.buy('upgrade', 'sprinkler');
    expect(gm.buy('upgrade', 'sprinkler').ok).toBe(false);
  });
});

describe('GameManager — quests & progression', () => {
  let gm;
  beforeEach(() => {
    gm = new GameManager();
    gm.state.coins = 100000;
    gm.state.level = 15;
  });

  test('first harvest quest completes and claims', () => {
    gm.plant(0, 'wheat');
    gm.state.lastTick -= CROPS.wheat.growTime * 1000 + 200;
    gm.tick();
    gm.harvest(0);
    const list = gm.questList();
    const q = list.find((x) => x.id === 'first_harvest');
    expect(q.done).toBe(true);
    expect(q.claimed).toBe(false);
    const coinsBefore = gm.state.coins;
    const res = gm.claimQuest('first_harvest');
    expect(res.ok).toBe(true);
    expect(gm.state.coins).toBe(coinsBefore + q.rewardCoins);
    expect(gm.claimQuest('first_harvest').ok).toBe(false);
  });

  test('xp levels up', () => {
    const before = gm.state.level;
    gm.addXp(100000);
    expect(gm.state.level).toBeGreaterThan(before);
  });

  test('weather rolls within defined set', () => {
    gm.rollWeather(Date.now() + 999999999);
    expect(Object.keys(WEATHERS)).toContain(gm.state.weather);
  });

  test('blessing weather doubles harvest yield', () => {
    const rand = Math.random;
    Math.random = () => 0;
    gm.state.weather = 'sunny';
    gm.state.weatherUntil = Date.now() + 60000;
    gm.plant(0, 'wheat');
    gm.state.lastTick -= CROPS.wheat.growTime * 1000 + 200;
    gm.tick();
    const normalYield = (() => { const r = gm.harvest(0); return r.amount; })();

    gm.state.weather = 'blessing';
    gm.state.weatherUntil = Date.now() + 60000;
    gm.plant(1, 'wheat');
    gm.state.lastTick -= CROPS.wheat.growTime * 1000 + 200;
    gm.tick();
    const blessedYield = (() => { const r = gm.harvest(1); return r.amount; })();

    expect(blessedYield).toBe(normalYield * 2);
    Math.random = rand;
  });

  test('tick advances in-game time', () => {
    const t = gm.state.time;
    gm.state.lastTick -= 1000;
    gm.tick();
    expect(gm.state.time).toBeGreaterThan(t);
  });

  test('day/night detection', () => {
    gm.state.time = 3 * 3600;
    expect(gm.isNight()).toBe(true);
    gm.state.time = 12 * 3600;
    expect(gm.isNight()).toBe(false);
  });
});
