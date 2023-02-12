//mock console.log so it doesn't print to the console
global.console = {
    log: jest.fn(),
    info: jest.fn(),
    error: jest.fn()
};

const commander = require('../src/main.js').Comander;
const Factory = require('../src/main.js').Factory;
const Troops = require('../src/main.js').Troops;
const OWNER = require('../src/main.js').OWNER;
source = new Factory(1, OWNER.ME, 5, 3, 2);
destination = new Factory(2, OWNER.ENEMY, 1, 1, 1);

describe('Comander', () => {
    describe('trySendTroops', () => {
        it('console logs decision when possible', () => {
            const spy = jest.spyOn(console, 'log');
            commander.trySendTroops(source, destination, 3);
            expect(spy).toHaveBeenCalledWith('MOVE 1 2 3');
        });
        it('calls factory.sendTroops', () => {
            const spy = jest.spyOn(source, 'sendTroops');
            commander.trySendTroops(source, destination, 1);
            expect(spy).toHaveBeenCalledWith(destination, 1, 1);
        });
    });

    describe('tryUpgradeFactory', () => {
        it('console log if safe', () => {
            const spy = jest.spyOn(console, 'log');
            let factory = new Factory(1, OWNER.ME, 12, 2, 2);
            commander.tryUpgradeFactory(factory);
            expect(spy).toHaveBeenCalledWith('INC 1');
        });
        it('calls factory.upgrade', () => {
            let factory = new Factory(1, OWNER.ME, 12, 2, 2);
            const spy = jest.spyOn(factory, 'upgrade');
            commander.tryUpgradeFactory(factory);
            expect(spy).toHaveBeenCalled();
        });
    });
    describe('trySendBomb', () => {
        it('console log if safe', () => {
            const spy = jest.spyOn(console, 'log');
            let source = new Factory(1, OWNER.ME, 12, 2, 2);
            let destination = new Factory(2, OWNER.ENEMY, 1, 1, 1);
            commander.trySendBomb(source, destination);
            expect(spy).toHaveBeenCalledWith('BOMB 1 2');
        });
    });
    describe('tryWait', () => {
        it('console log', () => {
            const spy = jest.spyOn(console, 'log');
            commander.tryWait();
            expect(spy).toHaveBeenCalledWith('WAIT');
        });
    });
    describe('tryMessage', () => {
        it('console log', () => {
            const spy = jest.spyOn(console, 'log');
            commander.tryMessage('test');
            expect(spy).toHaveBeenCalledWith('MSG test');
        });
    });
});