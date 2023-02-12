const GameFacts = require('../src/main.js').GameFacts;

describe('GameFacts', () => {
    describe('getMaxDistance', () => {
        it('returns 20', () => {
            expect(GameFacts.getMaxDistance()).toBe(20);
        });
    });
});