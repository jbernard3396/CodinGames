const Link = require('../src/main.js').Link;
const Factory = require('../src/main.js').Factory;

describe('Link', () => {
    describe('constructor', () => {
        it('sets id to param', () => {
            const link = new Link(1, 1, 2, 3);
            expect(link.getId()).toBe(1);
        });
        it('sets factory1 to param', () => {
            const link = new Link(1, 2, 3);
            expect(link.getFactory1()).toBe(2);
        });  
        it('sets factory2 to param', () => {
            const link = new Link(1, 2, 3);
            expect(link.getFactory2()).toBe(3);
        });
        it('sets distance to param', () => {
            const link = new Link(1, 2, 3, 4);
            expect(link.getDistance()).toBe(4);
        });
    });
});