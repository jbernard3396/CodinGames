readline = () => '0 1 2';
// main = () => {};

const test = require('../src/main.js');


describe('main', () => {
    describe('getDistance', () => {
        it('returns 0 when factory1 == factory2', () => {
            expect(test.getDistance(1, 1, [])).toBe(0);
        });
        it('returns 0 when no link', () => {
            expect(test.getDistance(1, 2, [])).toBe(0);
        });
        it('returns distance when link', () => {
            expect(test.getDistance(1, 2, [{factory1: 1, factory2: 2, distance: 3}])).toBe(3);
        });
    });
    describe('getClosestFactory', () => {
        it('returns 0 when no links', () => {
            expect(test.getClosestFactory(1, [])).toBe(0);
        });
        it('returns closest factory', () => {
            expect(test.getClosestFactory(1, [{factory1: 1, factory2: 2, distance: 3}, {factory1: 1, factory2: 3, distance: 1}])).toBe(3);
        });
    });
});
