var Troops = require('../src/main.js').Troops;
let OWNER = require('../src/main.js').OWNER;
const Factory = require('../src/main.js').Factory;
let source = new Factory(0, OWNER.ME, 5, 0);
let destination = new Factory(1, OWNER.ME, 5, 0);

describe('Troops', () => {
    describe('constructor', () => {
        it("sets id to param", () => {
            const troops = new Troops(1, OWNER.ME, source, destination, 0, 0);
            expect(troops.getId()).toBe(1);
        });
        it("sets owner to param", () => {
            const troops = new Troops(1, OWNER.ME, source, destination, 0, 0);
            expect(troops.getOwner()).toBe(OWNER.ME);
        });
        it('sets source to param', () => {
            const troops = new Troops(1, OWNER.ME, source, destination, 0, 0);
            expect(troops.getSource()).toBe(source);
        });
        it('sets destination to param', () => {
            const troops = new Troops(1, OWNER.ME, source, destination, 0, 0);
            expect(troops.getDestination()).toBe(destination);
        });
        it('sets count to param', () => {
            const troops = new Troops(1, OWNER.ME, source, destination, 5, 0);
            expect(troops.getCount()).toBe(5);
        });
        it('sets turnsRemaining to param', () => {
            const troops = new Troops(1, OWNER.ME, source, destination, 0, 6);
            expect(troops.getTurnsRemaining()).toBe(6);
        });
        it('sets traveling to true when turnsRemaining > 0', () => {
            const troops = new Troops(1, OWNER.ME, source, destination, 0, 3);
            expect(troops.getTraveling()).toBe(true);
        });
        it('sets traveling to true when turnsRemaining = 0', () => {
            const troops = new Troops(1, OWNER.ME, source, destination, 0, 0);
            expect(troops.getTraveling()).toBe(false);
        });
        it('throws error if not given all params', () => {
            expect(() => new Troops(1, OWNER.ME, source, destination, 0)).toThrow();
        });
    });
    describe('validateTroops', () => {
        it('throws error if passed in troops.id is not troops.id', () => {
            const troops = new Troops(1, OWNER.ME, source, destination, 0, 0);
            expect(() => troops.validateTroops(new Troops(2, OWNER.ME, source, destination, 0, 0))).toThrow();
        });
        it('throws error if passed in troops.owner is not troops.owner', () => {
            const troops = new Troops(1, OWNER.ME, source, destination, 0, 0);
            expect(() => troops.validateTroops(new Troops(1, OWNER.ENEMY, source, destination, 0, 0))).toThrow();
        });
        it('throws error if passed in troops.source is not troops.source', () => {
            const troops = new Troops(1, OWNER.ME, source, destination, 0, 0);
            expect(() => troops.validateTroops(new Troops(1, OWNER.ME, destination, destination, 0, 0))).toThrow();
        });
        it('throws error if passed in troops.destination is not troops.destination', () => {
            const troops = new Troops(1, OWNER.ME, source, destination, 0, 0);
            expect(() => troops.validateTroops(new Troops(1, OWNER.ME, source, source, 0, 0))).toThrow();
        });
        it('throws error if passed in troops.turnsRemaining is not troops.turnsRemaining', () => {
            const troops = new Troops(1, OWNER.ME, source, destination, 0, 0);
            expect(() => troops.validateTroops(new Troops(1, OWNER.ME, source, destination, 0, 1))).toThrow();
        });
    });
    describe('add and getCount', () => {
        it('adds troops and counts them', () => {
            const troops = new Troops(1, OWNER.ME, source,destination,0,0);
            troops.add(5);
            expect(troops.getCount()).toBe(5);
        });
    });
    describe('update', () => {
        it('decrements turnsRemaining', () => {
            const troops = new Troops(1, OWNER.ME, source,destination,0,5);
            troops.update();
            expect(troops.getTurnsRemaining()).toBe(4);
        });
        it('throws error when turnsRemaining == 0', () => {
            const troops = new Troops(1, OWNER.ME, source,destination,0,0);
            expect(() => troops.update()).toThrow();
        });
        it('throws error when turnsRemaining < 0', () => {
            const troops = new Troops(1, OWNER.ME, source,destination,0,-1);
            expect(() => troops.update()).toThrow();
        });
        it('arrives at destination when turnsRemaining = 1 ', () => {
            const spy = jest.spyOn(destination, 'receiveTroops');
            const troops = new Troops(1, OWNER.ME, source,destination,0,1);
            troops.update();
            expect(spy).toHaveBeenCalled();
        });
    });
});