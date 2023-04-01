const OWNER = require('../src/main.js').OWNER;
const Bomb = require('../src/main.js').Bomb;
const Factory = require('../src/main.js').Factory;
const GameContext = require('../src/main.js').GameContext;
const Link = require('../src/main.js').Link;
source = new Factory(1, OWNER.ME, 5, 3, 2);
enemySource = new Factory(2, OWNER.ENEMY, 5, 3, 2);
destination = new Factory(3, OWNER.ENEMY, 1, 1, 1);
link = new Link(1, 1, 3, 4);
GameContext.getInstance().addLink(link);
enemylink = new Link(1, 2, 3, 4);

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
    describe('update', () => {
        it('decrements turns remaining', () => {
            const bomb = Bomb.createFriendlyBomb(source, destination);
            bomb.update();
            expect(bomb.getTurnsRemaining()).toBe(3);
        });
        it('throws error when turnsRemaining <= 0', () => {
            const bomb = Bomb.createFriendlyBomb(source, destination);
            bomb.update(); 
            bomb.update(); 
            bomb.update(); 
            bomb.update(); 
            expect(() => bomb.update()).toThrow();
        });
        it('bombs the destination when turnsRemaining == 1', () => {
            const bomb = Bomb.createFriendlyBomb(source, destination);
            const spy = jest.spyOn(destination, 'bomb');
            bomb.update();
            bomb.update();
            bomb.update();
            bomb.update();
            expect(spy).toHaveBeenCalled();
        });
    });
    describe('validate', () => {
        it('throws error when passed in id != this.id', () => {
            const bomb = Bomb.createFriendlyBomb(source, destination);
            expect(() => bomb.validate(2, OWNER.ME, source, destination, 4)).toThrow();
        });
        it('throws error when passed in owner != this.owner', () => {
            const bomb = Bomb.createFriendlyBomb(source, destination);
            expect(() => bomb.validate(-1, OWNER.ENEMY, source, destination, 4)).toThrow();
        });
        it('throws error when passed in source != this.source', () => {
            const bomb = Bomb.createFriendlyBomb(source, destination);
            expect(() => bomb.validate(-1, OWNER.ME, enemySource, destination, 4)).toThrow();
        });
        it('throws error when passed in destination != this.destination', () => {
            const bomb = Bomb.createFriendlyBomb(source, destination);
            expect(() => bomb.validate(-1, OWNER.ME, source, enemySource, 4)).toThrow();
        });
        it('throws error when passed in turnsRemaining != this.turnsRemaining', () => {
            const bomb = Bomb.createFriendlyBomb(source, destination);
            expect(() => bomb.validate(-1, OWNER.ME, source, destination, 3)).toThrow();
        });
        it('does not throw error when passed in params match this', () => {
            console.log('look here');
            const bomb = Bomb.createFriendlyBomb(source, destination);
            expect(() => bomb.validate(-1, OWNER.ME, source, destination, 4)).not.toThrow();
        });
    });
});