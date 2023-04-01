const GameContext = require('../src/main.js').GameContext;
const Factory = require('../src/main.js').Factory;
const Link = require('../src/main.js').Link;
const Troops = require('../src/main.js').Troops;
const Bomb = require('../src/main.js').Bomb;

describe('GameContext', () => {
    describe('getInstance', () => {
        it('returns the same gamecontext everytime', () => {
            const gameContext = GameContext.getInstance();
            expect(GameContext.getInstance()).toBe(gameContext);
        });
    });
    describe('addFactory', () => {
        it('adds a factory to the list of factories', () => {
            const gameContext = GameContext.getInstance();
            const factory1 = new Factory(1, 1, 1, 1, 1);
            gameContext.addFactory(factory1);
            expect(gameContext.getFactories().length).toBe(1);
            expect(gameContext.getFactories()[0].getId()).toBe(1);
        });
    });
    describe('addLink', () => {
        it('adds a link to the list of links', () => {
            const gameContext = GameContext.getInstance();
            const factory1 = new Factory(1, 1, 1, 1, 1);
            const factory2 = new Factory(2, 1, 1, 1, 1);
            const link1 = new Link(1, factory1, factory2, 3);
            gameContext.addLink(link1);
            expect(gameContext.getLinks().length).toBe(1);
            expect(gameContext.getLinks()[0].getId()).toBe(1);
        });
    });
    describe('addTroop', () => {
        it('adds a troop to the list of troops', () => {
            const gameContext = GameContext.getInstance();
            const troop1 = new Troops(1, 1, 2, 3, 4, 5);
            gameContext.addTroop(troop1);
            expect(gameContext.getTroops().length).toBe(1);
            expect(gameContext.getTroops()[0].getId()).toBe(1);
        });
    });
    describe('addBomb', () => {
        it('adds a bomb to the list of bombs', () => {
            const gameContext = GameContext.getInstance();
            const factory1 = new Factory(1, 1, 1, 1, 1);
            const factory2 = new Factory(2, 1, 1, 1, 1);
            const bomb1 = Bomb.createFriendlyBomb(factory1, factory2);
            gameContext.addBomb(bomb1);
            expect(gameContext.getBombs().length).toBe(1);
            expect(gameContext.getBombs()[0].getId()).toBe(-1);
        });
    });
    describe('getDistanceBetweenTwoFactories', () => {
        it('returns the distance between the two factories', () => {
            const gameContext = GameContext.getInstance();
            const factory1 = new Factory(1, 1, 1, 1, 1);
            const factory2 = new Factory(2, 1, 1, 1, 1);
            const link1 = new Link(1, factory1, factory2, 3);
            gameContext.addLink(link1);
            expect(gameContext.getDistanceBetweenTwoFactories(factory1, factory2)).toBe(3);
        });
    });
});