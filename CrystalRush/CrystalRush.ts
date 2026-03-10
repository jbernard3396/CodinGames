//there is a bug where we somtimes blow up enemy bombs?  I think we are not marking them correctly always

/**
 * Enums
 */
enum Allegiance {
    mine = 0,
    enemy1 = 1
}

enum Item {
    empty = -1,
    radar = 2,
    trap = 3,
    ore = 4
}

enum ActionType {
    move = "move",
    dig = "dig",
    requestRadar = "requestRadar",
    requestTrap = "requestTrap",
    placeRadar = "placeRadar",
    placeTrap = "placeTrap",
    score = "score",
    wait = "wait"
}

/**
 * Objects
 */

class Coordinate {
    constructor(x:number, y:number){
        this.x=x;
        this.y=y;
    }

    public x: number;
    public y: number;
    public print(){
        return `${this.x} ${this.y}`
    }
    public equals(other:Coordinate) {
        return this.x == other.x && this.y == other.y;
    }
    public distance(other:Coordinate) {
        const diffX = other.x - this.x;
        const diffY = other.y - this.y;
        return Math.abs(diffX) + Math.abs(diffY);
    }

    public closest(others:Coordinate[]) {
        if(others.length == 0){
            throw new Error("no coordinates for closest");
        }
        let leastDistance = this.distance(others[0]);
        let closest = others[0];
        others.forEach((o) => {
            let distance = this.distance(o);
            if(distance < leastDistance){
                closest = o;
                leastDistance = distance;
            }
        });
        return closest;
    }

    public inRadarRange(other:Coordinate){
        return this.distance(other) <= 4;
    }
}

class Action {
    constructor(
        robotId: number,
        robotLocation: Coordinate,
        type: ActionType,
        target: Coordinate | null,
        turnsRemaining: number,
        value: number,
        createdTurn: number,
        note: string | null = null
    ) {
        this.robotId = robotId;
        this.robotLocation = robotLocation;
        this.type = type;
        this.target = target;
        this.turnsRemaining = turnsRemaining;
        this.value = value;
        this.createdTurn = createdTurn;
        this.skipped = false;
        this.note = note;
    }

    public robotId: number;
    public robotLocation: Coordinate;
    public type: ActionType;
    public target: Coordinate | null;
    public turnsRemaining: number;
    public value: number;
    public createdTurn: number;
    public skipped: boolean;
    public note: string | null;

    public command(): string {
        switch (this.type) {
            case ActionType.move:
                return `MOVE ${this.requireTarget().print()}`;
            case ActionType.dig:
                return `DIG ${this.requireTarget().print()}`;
            case ActionType.requestRadar:
                return this.requestCommand("RADAR");
            case ActionType.requestTrap:
                return this.requestCommand("TRAP");
            case ActionType.placeRadar:
                return `DIG ${this.requireTarget().print()}`;
            case ActionType.placeTrap:
                return `DIG ${this.requireTarget().print()}`;
            case ActionType.score:
                return `MOVE ${this.requireTarget().print()}`;
            case ActionType.wait:
                return "WAIT";
            default:
                throw new Error("Unknown action type");
        }
    }

    private requireTarget(): Coordinate {
        if (!this.target) {
            throw new Error("Action target is required for this action type");
        }
        return this.target;
    }

    public uniqueKey(): string | null {
        if (this.type === ActionType.score) {
            return null;
        }
        return `${this.type}:${this.target ? this.target.print() : "null"}`;
    }

    private requestCommand(item: "RADAR" | "TRAP"): string {
        if (this.robotLocation.x !== 0) {
            return `MOVE ${this.requireTarget().print()}`;
        }
        return `REQUEST ${item}`;
    }
}

class Actions {
    public collection: Action[] = [];

    public add(action: Action) {
        this.collection.push(action);
    }

    public forRobot(robotId: number): Action[] {
        return this.collection.filter(a => a.robotId === robotId);
    }

    public clashingRobots(): number[] {
        const topActions = this.getRobotIds()
            .map(id => this.getHighestValueAction(id))
            .filter((a): a is Action => a !== null);

        const keyToRobotIds = new Map<string, number[]>();
        for (const action of topActions) {
            const key = action.uniqueKey();
            if (key === null) {
                continue;
            }
            const list = keyToRobotIds.get(key);
            if (list) {
                list.push(action.robotId);
            } else {
                keyToRobotIds.set(key, [action.robotId]);
            }
        }

        const clashes = new Set<number>();
        for (const ids of keyToRobotIds.values()) {
            if (ids.length > 1) {
                ids.forEach(id => clashes.add(id));
            }
        }
        return Array.from(clashes).sort((a, b) => a - b);
    }

    public issueCommands(): void {
        const robotIds = this.getRobotIds();
        for (const robotId of robotIds) {
            const action = this.getHighestValueAction(robotId);
            if (!action) {
                console.log("WAIT");
                continue;
            }
            const note = action.note ? ` ${action.note}` : "";
            console.log(`${action.command()}${note}`);
        }
    }

    public digTargetsForRobot(robotId: number): Coordinate[] {
        return this.collection
            .filter(a => a.robotId === robotId && a.type === ActionType.dig && a.target !== null)
            .map(a => a.target as Coordinate);
    }

    public hasAction(robotId: number, type: ActionType): boolean {
        return this.collection.some(a => a.robotId === robotId && a.type === type);
    }

    public highestValueAction(robotId: number): Action | null {
        return this.getHighestValueAction(robotId);
    }

    public resolveClash(): void {
        const bestByRobot = new Map<number, Action>();
        for (const robotId of this.getRobotIds()) {
            const best = this.getHighestValueAction(robotId);
            if (best) {
                bestByRobot.set(robotId, best);
            }
        }

        const keyToRobotIds = new Map<string, number[]>();
        for (const [robotId, action] of bestByRobot.entries()) {
            const key = action.uniqueKey();
            if (key === null) {
                continue;
            }
            const list = keyToRobotIds.get(key);
            if (list) {
                list.push(robotId);
            } else {
                keyToRobotIds.set(key, [robotId]);
            }
        }

        for (const [key, robotIds] of keyToRobotIds.entries()) {
            if (robotIds.length <= 1) {
                continue;
            }

            let bestGap = -Infinity;
            let keepRobotId: number | null = null;
            const topTwoByRobot = new Map<number, { best: Action; second: Action }>();

            for (const robotId of robotIds) {
                const topTwo = this.getTopTwoActions(robotId);
                if (!topTwo) {
                    console.error(`resolveClash: robot ${robotId} lacks 2 non-skipped actions for clash ${key}`);
                    continue;
                }
                topTwoByRobot.set(robotId, topTwo);
                const diff = topTwo.best.value - topTwo.second.value;
                if (diff > bestGap || (diff === bestGap && (keepRobotId === null || robotId < keepRobotId))) {
                    bestGap = diff;
                    keepRobotId = robotId;
                }
            }

            if (keepRobotId === null) {
                console.error(`resolveClash: could not resolve clash ${key}`);
                continue;
            }

            for (const [robotId, topTwo] of topTwoByRobot.entries()) {
                if (robotId === keepRobotId) {
                    continue;
                }
                topTwo.best.skipped = true;
            }
        }
    }

    private getHighestValueAction(robotId: number): Action | null {
        const actions = this.forRobot(robotId).filter(a => !a.skipped);
        if (actions.length === 0) {
            return null;
        }
        let best = actions[0];
        for (const action of actions) {
            if (action.value > best.value) {
                best = action;
            }
        }
        return best;
    }

    private getTopTwoActions(robotId: number): { best: Action; second: Action } | null {
        const actions = this.forRobot(robotId).filter(a => !a.skipped);
        if (actions.length < 2) {
            return null;
        }
        const sorted = actions.sort((a, b) => b.value - a.value);
        return { best: sorted[0], second: sorted[1] };
    }

    private getRobotIds(): number[] {
        const ids = new Set<number>(this.collection.map(a => a.robotId));
        return Array.from(ids).sort((a, b) => a - b);
    }
}

class Robot {
    constructor(id:number, location:Coordinate, allegiance:Allegiance, item:Item){
        this.id = id;
        this.location = location;
        this.allegiance = allegiance;
        this.item = item;
        this.isDestroyed = false;
        this.previousLocation = null;
        this.likelyNoBomb = allegiance === Allegiance.mine ? false : true;
        this.likelyNoRadar = allegiance === Allegiance.mine ? false : true;
    }
    public id: number
    public location:Coordinate;
    public allegiance: Allegiance;
    public item:Item;
    public isDestroyed:Boolean;
    public previousLocation: Coordinate | null;
    public likelyNoBomb: boolean;
    public likelyNoRadar: boolean;
    public isInBase(): boolean {
        return this.location.x === 0;
    }
    public update(robot: Robot){
        const wasInBase = this.isInBase();
        this.previousLocation = this.location;
        this.location = robot.location;
        this.allegiance = robot.allegiance;
        this.item = robot.item;
        this.isDestroyed = robot.isDestroyed;
        const isInBaseNow = this.isInBase();
        if (this.allegiance == Allegiance.enemy1) {
            if (isInBaseNow && wasInBase) {
                this.likelyNoBomb = false;
                this.likelyNoRadar = false;
            }
        }
    }

    private getTrapChain(start: Cell): Cell[] { //todo:J unclear why this is in robot
        const visited = new Set<string>();
        const stack: Cell[] = [start];
        const chain: Cell[] = [];
        while (stack.length) {
            const current = stack.pop()!;
            const key = current.location.print();
            if (visited.has(key)) continue;
            visited.add(key);
            chain.push(current);
            const adjacentTraps = cells.collection.filter(c =>
                c.hasTrap &&
                !visited.has(c.location.print()) &&
                c.location.distance(current.location) <= 1
            );
            stack.push(...adjacentTraps);
        }
        return chain;
    }

    public shouldScuicideBomb(): Coordinate | null {
        const adjacentTraps = cells.collection.filter(c =>
            c.hasTrap &&
            c.location.distance(this.location) <= 1
        );

        let best: { loc: Coordinate; score: number } | null = null;

        adjacentTraps.forEach(trap => {

            const trapChain:Cell[] = this.getTrapChain(trap);

            const killed = new Set<Robot>(
                robots.collection.filter(robot =>
                    trapChain.some(t =>
                        robot.location.distance(t.location) <= 1
                    )
                )
            );

            const score = [...killed].reduce(
                (sum, r) =>
                    sum + (r.allegiance === Allegiance.enemy1 ? 1 : -1),
                0
            );

            if (score > 0 && (!best || score > best.score)) {
                best = { loc: trap.location, score };
            }
        });

        return best?.loc ?? null;
    }
    public scuicideBomb(location:Coordinate){
        if(location.distance(this.location) >1){
            throw new Error("bomb not in range");
        }
        this.digCommand(location, "SCUICIDE", 0)
    }
    public digForRating(banned: Coordinate[] = []){ //todo:J mark a locaiton for wanting to be dug if I am the friendly bot who will get there first, so that other bots can dig with that in mind
        const candidates = cells.thatAreNotBase()
            .filter(c => c.baseDigRating() > 0)
            .filter(c => !banned.some(b => b.equals(c.location)));
        if (candidates.length === 0) {
            throw new Error("No dig candidates");
        }

        const movementCost = 16; // tune this
        const ordered = candidates.sort((a, b) => {
            const stepsA = Math.ceil(Math.max(0, a.location.distance(this.location) - 1) / 4);
            const stepsB = Math.ceil(Math.max(0, b.location.distance(this.location) - 1) / 4);

            return (b.baseDigRating() - stepsB * movementCost)
                - (a.baseDigRating() - stepsA * movementCost);
        });
        const target = ordered[0];
        const rating = target.baseDigRating();
        const message = `dig rating: ${rating}`;
        this.digCommand(target.location, message, rating);
    }
    public requestRadar(){
        actions.add(
            new Action(
                this.id,
                this.location,
                ActionType.requestRadar,
                this.location,
                100000,
                0,
                turn,
                "Looking for RADAR"
            )
        );
        radarCooldown = -1;
    }
    public placeRadar(banned: Coordinate[] = []) {
        const movementCost = 160*(9+7+7+5+5+3+3+1+1) ; // HACK:? need to accoount for all of the cells that make up a radar rating
        const candidates:Cell[] = cells.thatAreNotBase()
            .filter(c => c.radarRating() > 0)
            .filter(c => !banned.some(b => b.equals(c.location)));
        if (candidates.length === 0) {
            //throw new Error("No candidates for radar??")
            // this.digCommand(this.location, "throwing away RADAR"); //instead of throwing away, lets just dig like normal
            this.digForRating(banned);
            return;
        }

        const best = candidates.reduce((bestCell, currentCell) => {

            const bestScore =
                bestCell.radarRating()
                - Math.ceil(Math.max(0, bestCell.location.distance(this.location) - 1) / 4)
                * movementCost;

            const currentScore =
                currentCell.radarRating()
                - Math.ceil(Math.max(0, currentCell.location.distance(this.location) - 1) / 4)
                * movementCost;


            return currentScore > bestScore ? currentCell : bestCell;

        });

        this.digCommand(best.location, "Placing RADAR", best.radarRating()+100000);
    }
    public requestTrap(){
        actions.add(
            new Action(
                this.id,
                this.location,
                ActionType.requestTrap,
                this.location,
                50000,
                0,
                turn,
                "Looking for TRAP"
            )
        );
        trapCooldown = -1;
    }
    public placeTrap(banned: Coordinate[] = []){
        const cellsWithMaxTrapRating:Cell[] = cells.thatAreNotBase()
            .filter((c) => c.trapRating() == cells.maxTrapRating())
            .filter(c => !banned.some(b => b.equals(c.location)));
        if (cellsWithMaxTrapRating.length === 0) {
            this.digForRating(banned);
            return;
        }
        const closestLocationWithMaxTrapRating:Coordinate = this.location.closest(cellsWithMaxTrapRating.map(c => c.location));
        let message = "Placing TRAP";
        if(cells.maxTrapRating() <= 0){
            // message = "Throwing away TRAP"; //instead of throwing away the trap, lets just ignore that we have it and dig for rating
            this.digForRating(actions.digTargetsForRobot(this.id));
            return;
        }
        const closestCell = cells.getByLocation(closestLocationWithMaxTrapRating);
        this.digCommand(closestLocationWithMaxTrapRating, message, closestCell.trapRating()+50000);
    }
    public score(){
        actions.add(
            new Action(
                this.id,
                this.location,
                ActionType.score,
                new Coordinate(0, this.location.y),
                0, //can't clash do it doesn't matter what the value is
                0,
                turn,
                "SCORING"
            )
        );
    }
    private digCommand(location:Coordinate, message:string, value:number = 0){
        actions.add(
            new Action(
                this.id,
                this.location,
                ActionType.dig,
                location,
                0,
                value,
                turn,
                message
            )
        );
        if(this.location.distance(location) <=1 ){
            cells.getByLocation(location).holeMadeByMe = true;
        }
        return;
    }
}

class Robots {
    public collection: Robot[] = []; //todo:J make private?
    private maxSize:number=10;
    private getById(id:number) {
        const robot = this.getMaybeById(id);
        if (!robot) {
            throw new Error("No robot exists with that ID");
        }
        return robot;
    }
    private getMaybeById(id:number){
        return this.collection.find((robot) => robot.id == id);
    }
    public upsert(robot:Robot) {
        const robotToUpdate = this.getMaybeById(robot.id);
        if (!robotToUpdate) { //not found, need to insert
            if(this.collection.length >= this.maxSize) {
                throw new Error ("Can't find robot, but all robots should already exist");
            }
            this.collection.push(robot);
            return;
        } //exists already, update
        robotToUpdate.update(robot);
    }
}

class Cell{
    constructor(location:Coordinate, ore:string, hole:number){
        this.location=location;
        this.ore=ore == '?' ? -1 : Number(ore);
        this.hasHole=hole == 1 ? true : false;
    }
    public location:Coordinate;
    public ore:number;
    public hasHole:Boolean = false;
    public holeMadeByMe:Boolean = false;
    public holeMadeByEnemy:Boolean = false; //traps go off before we dig, so this could be wrong if they place a trap the same turn we dig
    public holeMightHaveEnemyBomb:Boolean = false; //true if enemy robot waited in enemy base and then waited near this cell and this cell now has a hole
    public hasTrap:boolean = false;
    private mightHaveOre:Boolean = true;
    private distanceFromBaseCache:number;

    public distanceFromBase():number{
        if(!this.distanceFromBaseCache){
            this.distanceFromBaseCache = this.location.distance(new Coordinate(0, this.location.y));
        }
        return this.distanceFromBaseCache;
    }

    public isBase(){
        return this.location.x == 0;
    }

    public update(cell:Cell){
        this.location = cell.location;
        this.ore = cell.ore;
        if(cell.ore == 0){
            this.mightHaveOre = false;
        }
        if(this.hasHole == false && cell.hasHole == true){
            this.hasHole = cell.hasHole;
            if(!this.holeMadeByMe){
                this.holeMadeByEnemy=true;
            }
        }

    }

    // public discoverabilityRatingOLD():number{
    //     let rating = 0
    //     if(!this.mightHaveOre || this.ore != -1){
    //         return 0;
    //     }
    //     if(!this.holeMadeByEnemy){
    //         rating +=10
    //     }
    //     if(this.distanceFromBase() > 1){ //LOGIC HACK: balance the fact that closer cells are less likely to have crystals against the fact that they are better
    //         rating += this.distanceFromBase()
    //     }
    //     return rating
    // }
    public discoverabilityRating():number{
        if(!this.mightHaveOre || this.ore != -1){
            return 0;
        }
        return this.baseDigRating(); //todo:J is this really stupid?
        //todo:J yes, I should make a radarless dig rating and use that for this and for a dig fallback
    }
    public radarRating():number{ //todo:j cache //todo:J doesn't value close squares highly enough
        if(this.hasTrap || this.holeMightHaveEnemyBomb){
            return -1;
        }
        const perfectTilingList:Coordinate[] = [new Coordinate(8,3), new Coordinate(8,11), new Coordinate(13,7),new Coordinate(18,3), new Coordinate(18,11), new Coordinate(23,7)]

        const cellsInRange:Cell[] = cells.thatAreNotBase().filter((c) => this.location.inRadarRange(c.location));
        let rating:number = cellsInRange.reduce((sum:number, cell:Cell) => { return sum + cell.discoverabilityRating() }, 0);
        if (rating <=0 ){ //I probably already have a radar here
            return rating;
        }
        if(perfectTilingList.some(c => c.equals(this.location))){
            rating += 1000;
        }
        return rating;
    }
    public printOre():string{
        if(this.ore == -1){
            return "?";
        }
        return this.ore.toString();
    }

    public printHoles():string{
        if(!this.hasHole){
            return '_';
        }
        if(this.holeMightHaveEnemyBomb){
            return 'X';
        }
        if(this.holeMadeByMe){
            return 'O';
        }
        return '?';
    }

    public trapRating():number{
        if(this.hasTrap || this.holeMightHaveEnemyBomb || this.ore <= 1){
            return -1;
        }
        let score = 0;
        if(this.ore==2){
            score += 1
        }
        if(this.hasHole){
            score+=3
        }
        //todo:J try to add to trap chain
        return score;
    }

    public baseDigRating(): number {
        if (this.hasTrap || this.isBase()) return 0;
        const distancePenalty = 50

        let rating = 0;
        if (this.ore > 0) rating += 10000;// + this.ore*distancePenalty*4;
        if (!this.holeMightHaveEnemyBomb) rating += 2000;
        if (!this.hasHole) rating += 300;
        //todo:J figure out how base distance works in aa world where this func is used for radars
        if (this.distanceFromBase() >= 5){ //HACK: we don't want to dig the random crap at the beginning
            rating += 100;
        }
        // rating += (29 - this.distanceFromBase()) * distancePenalty;
        return rating;
    }
}

class Cells{
    public collection:Cell[] = [];
    public maxSize:number = 15*30;

    private nonBaseCells:Cell[];
    private maxRatingCache: Record<string, { value: number; lastCalc: number }> = {};

    private maxRating(key: string, ratingFn: (cell: Cell) => number): number {
        const cached = this.maxRatingCache[key];
        if (!cached || cached.lastCalc < turn) {
            const maxValue = this.thatAreNotBase().reduce(
                (max, cell) => Math.max(max, ratingFn(cell)),
                -Infinity
            );
            this.maxRatingCache[key] = {
                value: maxValue,
                lastCalc: turn
            };
            return maxValue;
        }
        return cached.value;
    }

    public getByLocation(loc:Coordinate) {
        const cell = this.getMaybeByLocation(loc);
        if (!cell) {
            throw new Error("No cell exists with that location");
        }
        return cell;
    }
    private getMaybeByLocation(loc:Coordinate){
        return this.collection.find((cell) => cell.location.equals(loc));
    }
    public upsert(cell:Cell) {
        const cellToUpdate = this.getMaybeByLocation(cell.location);
        if (!cellToUpdate) { //not found, need to insert
            if(this.collection.length >= this.maxSize) {
                throw new Error ("Can't find cell, but all cells should already exist");
            }
            this.collection.push(cell);
            return;
        } //exists already, update
        cellToUpdate.update(cell);
    }

    public withOre(){ //todo:J cache
        return this.collection.filter((x) => x.ore>0);
    }
    public withOreAndNoTrapAndNotEnemy(){
        return this.collection.filter((x) => x.ore>0 && x.hasTrap == false && x.holeMightHaveEnemyBomb == false);
    }

    public withFriendlyTrap(){
        return this.collection.filter((x) => x.hasTrap);
    }

    public withoutHole(){ //todo:J cache
        return this.collection.filter((x) => !x.hasHole && !x.isBase());
    }
    public thatAreNotBase(){
        if(!this.nonBaseCells){
            this.nonBaseCells = this.collection.filter((x) => !x.isBase());
        }
        return this.nonBaseCells;
    }
    public maxRadarRating(): number {
        return this.maxRating("radar", c => c.radarRating());
    }

    public maxTrapRating(): number {
        return this.maxRating("trap", c => c.trapRating());
    }

    public maxDigRating(): number {
        return this.maxRating("dig", c => c.baseDigRating());
    }

    //todo:J puill this into a debugger class??
    public validate(){
        this.collection.forEach(x => {
            const duplicates = this.collection.filter((potentialDuplicate) => potentialDuplicate.location.equals(x.location))
            if (duplicates.length > 1){
                throw new Error("Cells has duplicates");
            }
        });
        console.error("Cells are valid");
    }
    public printOre(){
        console.error('-012345678901234567890123456789');
        for(let i = 0; i<height; i++){
            let debugLine:string = `${i%10}`
            for (let j = 0; j < width; j++) {
                let currLocation:Coordinate = new Coordinate(j,i);
                let currCell:Cell = this.getMaybeByLocation(currLocation);
                debugLine += currCell.printOre();
            }
            console.error(debugLine);
        }
    }

    public printHoles(){
        console.error('-012345678901234567890123456789');
        for(let i = 0; i<height; i++){
            let debugLine:string = `${i%10}`
            for (let j = 0; j < width; j++) {
                let currLocation:Coordinate = new Coordinate(j,i);
                let currCell:Cell = this.getMaybeByLocation(currLocation);
                debugLine += currCell.printHoles();
            }
            console.error(debugLine);
        }
    }
}

function holeCouldBeMadeByBot(robot: Robot, cell: Cell): boolean {
    return robot.location.distance(cell.location) <= 1;
}

function markLikelyEnemyBombHoles(): void {
    robots.collection.forEach((robot) => {
        if (robot.allegiance !== Allegiance.enemy1) {
            return;
        }
        if (robot.likelyNoBomb) {
            return;
        }
        if (!robot.previousLocation) {
            return;
        }
        if(robot.isInBase()){
            return;
        }
        if (!robot.location.equals(robot.previousLocation)) {
            return;
        }
        let markedAny = false;
        cells.collection.forEach((cell) => {
            if (!cell.hasHole) {
                return;
            }
            if (holeCouldBeMadeByBot(robot, cell)) {
                cell.holeMightHaveEnemyBomb = true;
                markedAny = true;
            }
        });
        if (markedAny) {
            robot.likelyNoBomb = true;
            robot.likelyNoRadar = true;
        }
    });
}

function debugEnemyBombCandidates(): void {
    const candidates = robots.collection
        .filter(r => r.allegiance === Allegiance.enemy1 && !r.likelyNoBomb)
        .map(r => `${r.id}@${r.location.print()}`);
    console.error(`enemy bomb candidates: ${candidates.length > 0 ? candidates.join(", ") : "none"}`);
}

/**
 * Deliver more ore to hq (left side of the map) than your opponent. Use radars to find ore but beware of traps!
 **/

var inputs: string[] = readline().split(' ');
const width: number = parseInt(inputs[0]);
const height: number = parseInt(inputs[1]); // size of the map
const robots: Robots = new Robots;
const cells: Cells = new Cells;
let actions: Actions = new Actions();
let turn:number = 0;
let trapCooldown = 0;
let radarCooldown = 0;
let trapsHidden:number = 0;
let robotDecisionRuns: Record<number, number> = {};

function runRobotDecision(robot: Robot): void {
    robotDecisionRuns[robot.id] = (robotDecisionRuns[robot.id] ?? 0) + 1;
    const topAction = actions.highestValueAction(robot.id);
    const key = topAction?.uniqueKey() ?? "none";
    const topActionInfo = topAction ? `${topAction.type} ${key} v=${topAction.value}` : "none";
    //console.error(`runRobotDecision: robot ${robot.id} count ${robotDecisionRuns[robot.id]} top=${topActionInfo}`);
    let needMoreRadars:Boolean = cells.withOreAndNoTrapAndNotEnemy().length < 40;

    let needMoreTraps:Boolean = cells.withFriendlyTrap().length < 10;

    if(robot.allegiance != Allegiance.mine){
        return;
    }
    let scuicideLocation:Coordinate = robot.shouldScuicideBomb();
    if(scuicideLocation){
        robot.scuicideBomb(scuicideLocation);
        return;
    }
    if(robot.item == Item.empty && radarCooldown == 0 && robot.location.x == 0 && cells.maxRadarRating() > 0 && needMoreRadars && !actions.hasAction(robot.id, ActionType.requestRadar)){
        robot.requestRadar();
        return;
    }
    if(robot.item == Item.empty && trapCooldown == 0 && robot.location.x == 0 && cells.maxTrapRating() > 0 && needMoreTraps && !actions.hasAction(robot.id, ActionType.requestTrap)){
        robot.requestTrap();
        trapsHidden += 1;
        return;
    }
    if(robot.item == Item.trap){
        robot.placeTrap(actions.digTargetsForRobot(robot.id));
        return;
    }
    if(robot.item == Item.radar){
        robot.placeRadar(actions.digTargetsForRobot(robot.id));
        return;
    }
    if(robot.item == Item.ore){
        robot.score();
        return;
    }
    if(cells.withOreAndNoTrapAndNotEnemy().length == 0){
        const withoutHole = cells.withoutHole();
        if(withoutHole.length == 0){
            throw new Error("No logic provided for this situation");
        }
        if(radarCooldown == 0 && needMoreRadars){
            actions.add(
                new Action(
                    robot.id,
                    robot.location,
                    ActionType.move,
                    new Coordinate(0, robot.location.y),
                    0,
                    0,
                    turn,
                    "Move to base"
                )
            );
            return;
        }
        robot.digForRating(actions.digTargetsForRobot(robot.id))
        return;
    }
    robot.digForRating(actions.digTargetsForRobot(robot.id));
}

// game loop
while (true) {
    turn+=1; //1 based
    actions = new Actions();
    robotDecisionRuns = {};
    var inputs: string[] = readline().split(' ');
    const myScore: number = parseInt(inputs[0]); // Amount of ore delivered
    const opponentScore: number = parseInt(inputs[1]);
    for (let i = 0; i < height; i++) {
        var inputs: string[] = readline().split(' ');
        for (let j = 0; j < width; j++) {
            const ore: string = inputs[2*j];// amount of ore or "?" if unknown
            const hole: number = parseInt(inputs[2*j+1]);// 1 if cell has a hole
            cells.upsert(new Cell(new Coordinate(j,i), ore, hole));
        }
    }

    var inputs: string[] = readline().split(' ');
    const entityCount: number = parseInt(inputs[0]); // number of entities visible to you
    radarCooldown = parseInt(inputs[1]); // turns left until a new radar can be requested
    trapCooldown = parseInt(inputs[2]); // turns left until a new trap can be requested
    for (let i = 0; i < entityCount; i++) {
        var inputs: string[] = readline().split(' ');
        const entityId: number = parseInt(inputs[0]); // unique id of the entity
        const entityType: number = parseInt(inputs[1]); // 0 for your robot, 1 for other robot, 2 for radar, 3 for trap
        const x: number = parseInt(inputs[2]);
        const y: number = parseInt(inputs[3]); // position of the entity
        const item: number = parseInt(inputs[4]); // if this entity is a robot, the item it is carrying (-1 for NONE, 2 for RADAR, 3 for TRAP, 4 for ORE)
        if (entityType == 3) {
            cells.getByLocation(new Coordinate(x,y)).hasTrap = true;
            continue;
        }
        if(entityType == 2){ //radar
            continue;
        }
        if(entityType ==0 || entityType == 1){
            var newRobot = new Robot(entityId, new Coordinate(x,y), entityType, item);
            robots.upsert(newRobot);
            continue;
        }
    }

    markLikelyEnemyBombHoles();

    cells.printOre();
    cells.validate();
    debugEnemyBombCandidates();

    robots.collection.forEach((robot) => {
        runRobotDecision(robot);
    });

    let clashingRobotIds = actions.clashingRobots();
    while (clashingRobotIds.length > 0) {
        clashingRobotIds.forEach((robotId) => {
            const robot = robots.collection.find(r => r.id === robotId);
            if (robot) {
                runRobotDecision(robot);
            }
        });

        actions.resolveClash();

        clashingRobotIds = actions.clashingRobots();
    }

    actions.issueCommands();
}
