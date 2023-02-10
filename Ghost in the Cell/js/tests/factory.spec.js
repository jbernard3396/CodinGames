let Factory = require('../src/main.js').Factory;
let OWNER = require('../src/main.js').OWNER;
let Troops = require('../src/main.js').Troops;

describe('Factory', () => {
    describe('constructor', () => {
        it('sets id to param', () => {
            const factory = new Factory(1, OWNER.ME, 0, 0);
            expect(factory.getId()).toBe(1);
        });
        it('sets owner to param', () => {
            const factory = new Factory(0, OWNER.ENEMY, 0, 0);
            expect(factory.getOwner()).toBe(OWNER.ENEMY);
        });
        it('sets troops to param', () => {
            const factory = new Factory(0, OWNER.ME, 5, 0);
            expect(factory.getTroops()).toBe(5);
        });
        it('sets production to param', () => {
            const factory = new Factory(0, OWNER.ME, 0, 2);
            expect(factory.getProduction()).toBe(2);
        });
        it('sets isProducing to true', () => {
            const factory = new Factory(0, OWNER.ME, 0, 2);
            expect(factory.isProducing()).toBe(true);
        });
        it('throws error when production > 3', () => {
            expect(() => new Factory(0, OWNER.ME, 0, 4)).toThrow();
        });
        it('throws error when production < 0', () => {
            expect(() => new Factory(0, OWNER.ME, 0, -1)).toThrow();
        });
    });
    describe('validateFactory', () => {
        it('throws error when passed in id != factory id', () => {
            const factory = new Factory(0, OWNER.ME, 0, 2);
            expect(() => factory.validateFactory(new Factory(1, OWNER.ME, 0, 2))).toThrow();
        });
        it('throws error when passed in owner != factory owner', () => {
            const factory = new Factory(0, OWNER.ME, 0, 2);
            expect(() => factory.validateFactory(new Factory(0, OWNER.ENEMY, 0, 2))).toThrow();
        });
        it('throws error when passed in troops != factory troops', () => {
            const factory = new Factory(0, OWNER.ME, 5, 2);
            expect(() => factory.validateFactory(new Factory(0, OWNER.ME, 6, 2))).toThrow();
        });
        it('throws error when passed in production != factory production', () => {
            const factory = new Factory(0, OWNER.ME, 5, 2);
            expect(() => factory.validateFactory(new Factory(0, OWNER.ME, 5, 3))).toThrow();
        });
        it('throws error when passed in turnsUntilProduction != factory turnsUntilProduction', () => {
            const factory = new Factory(0, OWNER.ME, 5, 2, 3);
            expect(() => factory.validateFactory(new Factory(0, OWNER.ME, 5, 2, 1))).toThrow();
        });
    });
    describe('update', () => {
       it('adds production to troops', () => {
              const factory = new Factory(0, OWNER.ME, 5, 2);
              factory.update();
              expect(factory.getTroops()).toBe(7);
         });
        it('decrements turnsUntilProduction', () => {
            const factory = new Factory(0, OWNER.ME, 5, 2);
            factory.bomb();
            factory.update();
            expect(factory.getTurnsUntilProduction()).toBe(4);
        });
        it('doesn\'t add production if turnsUntilProduction > 0', () => {
            const factory = new Factory(0, OWNER.ME, 5, 2);
            factory.bomb();
            let troops = factory.getTroops();
            factory.update();
            expect(factory.getTroops()).toBe(troops);
        });
    });
    describe('arrive', () => {
        it('adds troops if troops owner is factory owner', () => {
            const factory = new Factory(0, OWNER.ME, 5, 0);
            const troops = new Troops(0, OWNER.ME, 0, factory, 3, 0);
            factory.arrive(troops);
            expect(factory.getTroops()).toBe(8);
        });
        it('subtracts troops if troops owner is not factory owner', () => {
            const factory = new Factory(0, OWNER.ENEMY, 5, 0);
            const troops = new Troops(0, OWNER.ME, 0, factory, 3, 0);
            factory.arrive(troops);
            expect(factory.getTroops()).toBe(2);
        });
        it('switches owner if troops > factory troops and troops owner is not factory owner', () => {
            const factory = new Factory(0, OWNER.ME, 5, 0);
            const troops = new Troops(0, OWNER.ENEMY, 0, factory, 6, 0);
            factory.arrive(troops);
            expect(factory.getOwner()).toBe(OWNER.ENEMY);
        });
        it('sets troops to abs(troops - factory troops) if troops > factory troops and troops owner is not factory owner', () => {
            const factory = new Factory(0, OWNER.ME, 5, 0);
            const troops = new Troops(0, OWNER.ENEMY, 0, factory, 6, 0);
            factory.arrive(troops);
            expect(factory.getTroops()).toBe(1);
        });
        it('does not switch owner if troops = factory troops', () => {
            const factory = new Factory(0, OWNER.ME, 5, 0);
            const troops = new Troops(0, OWNER.ENEMY, 0, factory, 5, 0);
            factory.arrive(troops);
            expect(factory.getOwner()).toBe(OWNER.ME);
        });
        it('throws error if factoryid != troops destination id', () => {
            const factory = new Factory(0, OWNER.ME, 5, 0);
            const wrongFactory = new Factory(1, OWNER.ME, 5, 0);
            const sourceFactory = new Factory(2, OWNER.ME, 5, 0);
            const troops = new Troops(0, OWNER.ENEMY, sourceFactory, wrongFactory, 5, 0);
            expect(() => factory.arrive(troops)).toThrow();
        });
    });
    describe('increaseProduction', () => {
        it('increases production by 1', () => {
            const factory = new Factory(0, OWNER.ME, 20, 1);
            factory.increaseProduction();
            expect(factory.getProduction()).toBe(2);
        });
        it('decreases troops by 10', () => {
            const factory = new Factory(0, OWNER.ME, 20, 1);
            factory.increaseProduction();
            expect(factory.getTroops()).toBe(10);
        });
        it('throws error if troops < 10', () => {
            const factory = new Factory(0, OWNER.ME, 9, 1);
            expect(() => factory.increaseProduction()).toThrow();
        });
        it('throws error if production is 3', () => {
            const factory = new Factory(0, OWNER.ME, 0, 3);
            expect(() => factory.increaseProduction()).toThrow();
        });
        it('throws error if owner is NEUTRAL', () => {
            const factory = new Factory(0, OWNER.NEUTRAL, 0, 2);
            expect(() => factory.increaseProduction()).toThrow();
        });
    });
    describe('bomb', () => {
        it('destroys all troops if number is 10 or less', () => {
            const factory = new Factory(0, OWNER.ME, 8, 1);
            factory.bomb();
            expect(factory.getTroops()).toBe(0);
        });
        it('destroys 10 troops if number is between 11 and 20', () => {
            const factory = new Factory(0, OWNER.ME, 15, 1);
            factory.bomb();
            expect(factory.getTroops()).toBe(5);
        });
        it('destroys half of troops if number is greater than 20', () => {
            const factory = new Factory(0, OWNER.ME, 30, 1);
            factory.bomb();
            expect(factory.getTroops()).toBe(15);
        });
        it('destroys half rounded down if number is greater than 20 and odd', () => {
            const factory = new Factory(0, OWNER.ME, 33, 1);
            factory.bomb();
            expect(factory.getTroops()).toBe(16);
        });
        it('sets turnsUntilProduction to 5', () => {
            const factory = new Factory(0, OWNER.ME, 30, 1);
            factory.bomb();
            expect(factory.getTurnsUntilProduction()).toBe(5);
        });
    });
});