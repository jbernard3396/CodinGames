const OWNER = {
    ME: 1,
    ENEMY: -1,
    NEUTRAL: 0
};

class Comander {
    static trySendTroops(source, destination, numTroops) {
        // distance = GameContext.getInstance().getDistance(source, destination);
        const distance = 1;
        source.sendTroops(destination, numTroops, distance);
        this.#sendTroops(source.getId(), destination.getId(), numTroops);
    }
    static tryUpgradeFactory(factory) {
        factory.upgrade();
        this.#upgradeFactory(factory.getId());
    }
    static trySendBomb(source, destination) {
        this.#sendBomb(source.getId(), destination.getId());
    }
    static tryWait() {
        this.#wait();
    }
    static tryMessage(message) {
        this.#message(message);
    }
    static #sendTroops(source, destination, numTroops) {
        console.log('MOVE ' + source + ' ' + destination + ' ' + numTroops);
    }
    
    static #upgradeFactory(factoryId) {
        console.log('INC ' + factoryId);
    }
    
    static #sendBomb(source, destination) {
        console.log('BOMB ' + source + ' ' + destination);
    }
    
    static #wait(){
        console.log('WAIT');
    }
    
    static #message(message) {
        console.log('MSG' + ' ' + message);
    }
}

class Troops {
    #id
    #owner;
    #source;
    #destination;
    #number;
    #turnsRemaining;
    #traveling;
    constructor(id, owner, source, destination, number, turnsRemaining) {
        this.#id = id;
        this.#owner = owner;
        this.#source = source;
        this.#destination = destination;
        this.#number = number;
        this.#turnsRemaining = turnsRemaining;
        this.#traveling = turnsRemaining > 0;
        if(turnsRemaining == undefined){
            throw 'Must provide all parameters to Troops constructor'
        }
    }
    validateTroops(troopsToAssert) {
        if (this.#id != troopsToAssert.getId()) {
            throw 'troops id is not ' + troopsToAssert.getId();
        }
        if (this.#owner != troopsToAssert.getOwner()) {
            throw 'troops owner is not ' + troopsToAssert.getOwner();
        }
        if (this.#source != troopsToAssert.getSource()) {
            throw 'troops source is not ' + troopsToAssert.getSource();
        }
        if (this.#destination != troopsToAssert.getDestination()) {
            throw 'troops destination is not ' + troopsToAssert.getDestination();
        }
        if (this.#number != troopsToAssert.getCount()) {
            throw 'troops number is not ' + troopsToAssert.getCount();
        }
        if (this.#turnsRemaining != troopsToAssert.getTurnsRemaining()) {
            throw 'troops turns remaining is not ' + troopsToAssert.getTurnsRemaining();
        }
    }
    getId() {
        return this.#id;
    }
    getOwner() {
        return this.#owner;
    }
    getSource() {
        return this.#source;
    }
    getDestination() {
        return this.#destination;
    }
    add(number) {
        this.#number += number;
    }
    getCount() {
        return this.#number;
    }
    getTurnsRemaining() {
        return this.#turnsRemaining;
    }
    update(){
        this.#decrementTurnsRemaining();
    }
    #decrementTurnsRemaining() {
        if(this.#turnsRemaining <= 0){
            throw 'turns remaining is already less than or equal to 0';
        }
        this.#turnsRemaining--;
        if (this.#turnsRemaining == 0) {
            this.#arrive();
        }
    }
    getTraveling() {
        return this.#traveling;
    }
    #arrive() {
        this.#destination.receiveTroops(this);
    }
}

class Factory{
    #id;
    #owner;
    #troops;
    #production;
    #turnsUntilProduction;
    constructor(id, owner, troops, production, turnsUntilProduction = 0) {
        this.#id = id;
        this.#owner = owner;
        this.#troops = troops;
        this.#setProduction(production);
        this.#turnsUntilProduction = turnsUntilProduction;
    }
    validateFactory(factoryToAssert) {
        if (this.#id != factoryToAssert.getId()) {
            throw 'factory id is not ' + factoryToAssert.getId();
        }
        if (this.#owner != factoryToAssert.getOwner()) {
            throw 'factory owner is not ' + factoryToAssert.getOwner();
        }
        if (this.#troops != factoryToAssert.getTroops()) {
            throw 'factory troops is not ' + factoryToAssert.getTroops();
        }
        if (this.#production != factoryToAssert.getProduction()) {
            throw 'factory production is not ' + factoryToAssert.getProduction();
        }
        if (this.#turnsUntilProduction != factoryToAssert.getTurnsUntilProduction()) {
            throw 'factory turns until production is not ' + factoryToAssert.getTurnsUntilProduction();
        }
    }
    getId() {
        return this.#id;
    }
    getOwner() {
        return this.#owner;
    }
    getTroops() {
        return this.#troops;
    }
    getProduction() {
        return this.#production;
    }
    upgrade() {
        if(this.getOwner() == OWNER.NEUTRAL){
            throw 'cannot increase production of a neutral factory';
        }
        if(this.#troops < 10){
            throw 'cannot increase production of a factory with less than 10 troops';
        }
        this.#setProduction(this.#production + 1);
        this.#troops -= 10;
    }
    #produce(){
        this.#troops += this.#production;
    }
    #setProduction(production) {
        if(production < 0 || production > 3){
            throw 'production must be between 0 and 3';
        }
        this.#production = production;
    }
    isProducing() {
        return this.#turnsUntilProduction == 0;
    }
    getTurnsUntilProduction() {
        return this.#turnsUntilProduction;
    }
    update() {
        if(this.#turnsUntilProduction > 0){
            this.#turnsUntilProduction--;
        } else {
            this.#produce();
        }
    }
    receiveTroops(troopsObject) {
        if(troopsObject.getDestination().getId() != this.#id){
            throw 'cannot arrive at a factory that is not the destination';
        }
        if(troopsObject.getOwner() == this.#owner){
            this.#reinforce(troopsObject);
        } else {
            this.#attack(troopsObject);
        }
    }
    sendTroops(destination, number, turnsRemaining) {
        if (this.#owner != OWNER.ME) {
            throw 'cannot send troops from factory' + this.#id + ' because it is not owned by me';
        }
        if (this.#troops < number) {
            throw 'cannot send' + number + ' troops from a factory with only ' + this.#troops + ' troops';
        }
        if(destination.getId() == this.#id){
            throw 'cannot send troops to the same factory with id ' + this.#id;
        }
        this.#troops -= number;
        return new Troops(-1, OWNER.ME, this, destination, number, turnsRemaining);
    }
    #reinforce(troopsObject) {
        if (troopsObject.getOwner() != this.#owner) {
            throw 'cannot reinforce a factory with troops of a different owner';
        }
        this.#troops += troopsObject.getCount();
    }
    #attack(troopsObject) {
        if (troopsObject.getOwner() == this.#owner) {
            throw 'cannot attack a factory with troops of the same owner';
        }
        this.#troops -= troopsObject.getCount();
        if (this.#troops < 0) {
            this.#owner = troopsObject.getOwner();
            this.#troops = Math.abs(this.#troops);
        }
    }
    bomb(){
        this.#bombTroops();
        this.#turnsUntilProduction = 5;
    }
    #bombTroops(){
        if(this.#troops <= 10){
            this.#troops = 0;
        } else if(this.#troops <= 20){
            this.#troops -= 10;
        } else {
            this.#troops -= Math.ceil(this.#troops/2);
        }
    }
}

class Bomb {
    #id;
    #owner;
    #source;
    #destination;
    #turnsRemaining;
    constructor(id, owner, source, destination, turnsRemaining) {
        this.#id = id;
        this.#owner = owner;
        this.#source = source;
        this.#destination = destination;
        this.#turnsRemaining = turnsRemaining;
    }
    static createFriendlyBomb(source, destination) {
        if(source.getOwner() != OWNER.ME){
            throw 'cannot bomb from a factory ' + source.getId() + ' that is not owned by me';
        }
        const distance = GameContext.getInstance().getLinkByTwoFactoryIds(source.getId(), destination.getId()).getDistance();
        return new Bomb(-1, OWNER.ME, source, destination, distance);
    }
    static createEnemyBomb(id, source){
        if(source.getOwner() != OWNER.ENEMY){
            throw 'cannot bomb from a factory ' + source.getId() + ' that is not owned by the enemy';
        }
        return new Bomb(id, OWNER.ENEMY, source);
    }
    getId() {
        return this.#id;
    }
    getOwner() {
        return this.#owner;
    }
    getSource() {
        return this.#source;
    }
    getDestination() {
        return this.#destination;
    }
    getTurnsRemaining() {
        return this.#turnsRemaining;
    }
    // update() {
    //     this.#decrementTurnsRemaining();
    // }
    // #decrementTurnsRemaining() {
    //     if(this.#turnsRemaining <= 0){
    //         throw 'turns remaining is already less than or equal to 0';
    //     }
    //     this.#turnsRemaining--;
    //     if (this.#turnsRemaining == 0) {
    //         this.#arrive();
    //     }
    // }
    // #arrive() {
    //     this.#destination.bomb();
    // }
}

class Link {
    #id;
    #factory1;
    #factory2;
    #distance;
    constructor(id, factory1, factory2, distance) {
        this.#id = id;
        this.#factory1 = factory1;
        this.#factory2 = factory2;
        this.#distance = distance;
    }
    getId() {
        return this.#id;
    }
    getFactory1() {
        return this.#factory1;
    }
    getFactory2() {
        return this.#factory2;
    }
    getDistance() {
        return this.#distance;
    }
}

class GameContext {
    #factories;
    #links;
    #troops;
    #bombs;
    singleInstance = null;
    static getInstance() {
        if (this.singleInstance == null) {
            this.singleInstance = new GameContext();
        }
        return this.singleInstance;
    } 
    constructor() {
        this.#factories = [];
        this.#links = [];
        this.#troops = [];
        this.#bombs = [];
    }
    getFactories() {
        return this.#factories;
    }
    addFactory(factory) {
        this.#factories.push(factory);
    }
    getLinks() {
        return this.#links;
    }
    getLinkByTwoFactoryIds(factory1Id, factory2Id) {
        return this.#links.find(link => (link.getFactory1().getId() == factory1Id && link.getFactory2().getId() == factory2Id) || (link.getFactory1().getId() == factory2Id && link.getFactory2().getId() == factory1Id));
    }
    addLink(link) {
        this.#links.push(link);
    }
    getTroops() {
        return this.#troops;
    }
    addTroop(troops) {
        this.#troops.push(troops);
    }
    getBombs() {
        return this.#bombs;
    }
    addBomb(bomb) {
        this.#bombs.push(bomb);
    }
    getDistanceBetweenTwoFactories(factory1, factory2) {
        return this.getLinkByTwoFactoryIds(factory1.getId(), factory2.getId()).getDistance();
    }
}

class GameFacts{ 
    static getMaxDistance(){
        return 20;
    }
}

function getDistance(factory1, factory2, links) {
    if (factory1 == factory2) {
        return 0;
    }
    const link = links.find(link => (link.factory1 == factory1 && link.factory2 == factory2) || (link.factory1 == factory2 && link.factory2 == factory1));
    if (link) {
        return link.distance;
    }
    return 0;
}

function getClosestFactory(myFactory, links) {
    let closestFactory = 0;
    let closestDistance = 999999;
    for (let i = 0; i < links.length; i++) {
        const link = links[i];
        if (link.factory1 == myFactory) {
            if (link.distance < closestDistance) {
                closestDistance = link.distance;
                closestFactory = link.factory2;
            }
        }
        if (link.factory2 == myFactory) {
            if (link.distance < closestDistance) {
                closestDistance = link.distance;
                closestFactory = link.factory1;
            }
        }
    }
    return closestFactory;
}

function getAttackDesireability(source, target){
    if(source.owner == target.owner){
        return 0;
    }
    return 20 - getDistance(source.id, target.id, links)
}

function init(){
    const factoryCount = parseInt(readline()); // the number of factories
    const linkCount = parseInt(readline()); // the number of links between factories
    let links = [];
    for (let i = 0; i < linkCount; i++) {
        var inputs = readline().split(' ');
        const factory1 = parseInt(inputs[0]);
        const factory2 = parseInt(inputs[1]);
        const distance = parseInt(inputs[2]);
        links.push({factory1, factory2, distance})
    }
    return links;
}

// game loop
let myFactory;
function main() {
    let links = init()
    while (true) {
        const entityCount = parseInt(readline()); // the number of entities (e.g. factories and troops)
        for (let i = 0; i < entityCount; i++) {
            var inputs = readline().split(' ');
            const entityId = parseInt(inputs[0]);
            const entityType = inputs[1];
            const arg1 = parseInt(inputs[2]);
            const arg2 = parseInt(inputs[3]);
            const arg3 = parseInt(inputs[4]);
            const arg4 = parseInt(inputs[5]);
            const arg5 = parseInt(inputs[6]);
            if(entityType == "FACTORY") {
                if(arg1 == 1) {
                    myFactory = entityId;
                }
            }
        }
    
        // Write an action using console.log()
        // To debug: console.error('Debug messages...');
    
    
        // Any valid action, such as "WAIT" or "MOVE source destination cyborgs"
        sendTroops(myFactory, 2, 1);
    }
}
//this ain't great, but for now swap which of these two lines is commented out to run the tests or the game
// main();
module.exports = { OWNER, Comander, Troops, Factory, Link, Bomb, GameContext, GameFacts, main, getDistance, getClosestFactory };
