// readline = () => '0 1 2';
// // main = () => {};

// const commander = require('../src/main.js').Comander;

describe('Comander', () => {
    it('is true', () => {
        expect(true).toBe(true);
    });
});
//     describe('trySendTroops', () => {
//         it('console logs decision when possible', () => {
//             const spy = jest.spyOn(console, 'log');
//             commander.sendTroops(1, 2, 3);
//             expect(spy).toHaveBeenCalledWith('MOVE 1 2 3');
//         });
//         // it('throws error when source factory is not owned', () => {
//         //     expect(() => commander.sendTroops(1, 2, 3)).toThrowError('source factory not owned');
//         // }
//     });
//     describe('upgradeFactory', () => {
//         it('console log', () => {
//             const spy = jest.spyOn(console, 'log');
//             commander.upgradeFactory(1);
//             expect(spy).toHaveBeenCalledWith('INC 1');
//         });
//     });
//     describe('sendBomb', () => {
//         it('console log', () => {
//             const spy = jest.spyOn(console, 'log');
//             commander.sendBomb(1, 2);
//             expect(spy).toHaveBeenCalledWith('BOMB 1 2');
//         });
//     });
//     describe('wait', () => {
//         it('console log', () => {
//             const spy = jest.spyOn(console, 'log');
//             commander.wait();
//             expect(spy).toHaveBeenCalledWith('WAIT');
//         });
//     });
//     describe('message', () => {
//         it('console log', () => {
//             const spy = jest.spyOn(console, 'log');
//             commander.message('test');
//             expect(spy).toHaveBeenCalledWith('MSG test');
//         });
//     });
// });