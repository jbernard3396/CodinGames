const OWNER = require('../src/main.js').OWNER;
const Bomb = require('../src/main.js').Bomb;
const Factory = require('../src/main.js').Factory;
source = new Factory(1, OWNER.ME, 5, 3, 2);
destination = new Factory(2, OWNER.ENEMY, 1, 1, 1);

describe('Bomb', () => {
    describe('constructor from me', () => {
       it('sets id to -1', () => {
            const bomb = new Bomb(source, destination);
            expect(bomb.getId()).toBe(-1);
        });
        it('sets owner to OWNER.ME', () => {
            const bomb = new Bomb(source, destination);
            expect(bomb.getOwner()).toBe(OWNER.ME);
        });
        it('sets source to param', () => {
            const bomb = new Bomb(source, destination);
            expect(bomb.getSource()).toBe(source);
        });
        it('sets destination to param', () => {
            const bomb = new Bomb(source, destination);
            expect(bomb.getDestination()).toBe(destination);
        });
        it('throws error when source.owner != OWNER.ME', () => {
            let newSource = new Factory(1, OWNER.ENEMY, 5, 3, 2);
            expect(() => new Bomb(newSource, destination)).toThrow();
        });
    });
    // describe('constructor from enemy', () => {
    //     it('sets id to param', () => {
    //         const bomb = new Bomb(1, source);
    //         expect(bomb.getId()).toBe(1);
    //     });
    //     it('sets owner to OWNER.ENEMY', () => {
    //         const bomb = new Bomb(1, source);
    //         expect(bomb.getOwner()).toBe(OWNER.ENEMY);
    //     });
    //     it('sets source to param', () => {
    //         const bomb = new Bomb(1, source);
    //         expect(bomb.getSource()).toBe(source);
    //     });
    // });
});