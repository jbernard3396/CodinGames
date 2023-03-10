const OWNER = require('../src/main.js').OWNER;
const Bomb = require('../src/main.js').Bomb;
const Factory = require('../src/main.js').Factory;
const GameContext = require('../src/main.js').GameContext;
const Link = require('../src/main.js').Link;
source = new Factory(1, OWNER.ME, 5, 3, 2);
enemySource = new Factory(2, OWNER.ENEMY, 5, 3, 2);
destination = new Factory(3, OWNER.ENEMY, 1, 1, 1);
link = new Link(1, source, destination, 4);
GameContext.getInstance().addLink(link);
enemylink = new Link(1, enemySource, destination, 4);

describe('Bomb', () => {
    describe('createFriendlyBomb', () => {
       it('sets id to -1', () => {
            const bomb = Bomb.createFriendlyBomb(source, destination);
            expect(bomb.getId()).toBe(-1);
        });
        it('sets owner to OWNER.ME', () => {
            const bomb =Bomb.createFriendlyBomb(source, destination);
            expect(bomb.getOwner()).toBe(OWNER.ME);
        });
        it('sets source to param', () => {
            const bomb = Bomb.createFriendlyBomb(source, destination);
            expect(bomb.getSource()).toBe(source);
        });
        it('sets destination to param', () => {
            const bomb = Bomb.createFriendlyBomb(source, destination);
            expect(bomb.getDestination()).toBe(destination);
        });
        it('sets turnsRemaining to distance between factories', () => {
            const bomb = Bomb.createFriendlyBomb(source, destination);
            expect(bomb.getTurnsRemaining()).toBe(4);
        });
        it('throws error when source.owner != OWNER.ME', () => {
            expect(() => Bomb.createFriendlyBomb(enemySource, destination)).toThrow();
        });
    });
    describe('createEnemyBomb', () => {
        it('sets id to param', () => {
            const bomb = Bomb.createEnemyBomb(1, enemySource);
            expect(bomb.getId()).toBe(1);
        });
        it('sets owner to OWNER.ENEMY', () => {
            const bomb = Bomb.createEnemyBomb(1, enemySource);
            expect(bomb.getOwner()).toBe(OWNER.ENEMY);
        });
        it('sets source to param', () => {
            const bomb = Bomb.createEnemyBomb(1, enemySource);
            expect(bomb.getSource()).toStrictEqual(source);
        });
        it('throws error when source.owner != OWNER.ENEMY', () => {
            expect(() => Bomb.createEnemyBomb(1, source)).toThrow();
        });
    });
});