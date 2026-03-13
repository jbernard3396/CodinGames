// noinspection DuplicatedCode

declare function readline(): string;

/**
 * ============================================================================
 * Helpers
 * ============================================================================
 */
function throwWarning(message: string) {
    console.error(`WARNING: ${message}`);
}

function tempDebug(message: string) {
    console.error(message);
}

/**
 * ============================================================================
 * Enums And Constants
 * ============================================================================
 */
enum Allegiance {
    mine = 0,
    enemy1 = 1
}

enum CellObject {
    offGrid = -1,
    empty = 0,
    platform = 1,
    energyCell = 2
}

enum directionEnum {
    up = 0,
    down = 1,
    left = 2,
    right = 3
}

enum FloodFillExitReason {
    notRun = 'not_run',
    ranOutOfTime = 'ran_out_of_time',
    visitedEveryState = 'visited_every_state',
    hitMaxVisited = 'hit_max_visited',
    ranOutOfTurnTime = 'ran_out_of_turn_time'
}

const DIRECTION_LABELS: string[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
const theoretical_time_limit = 50
const additional_time_that_I_cannot_explain = 10
const TURN_TIME_LIMIT_MS = theoretical_time_limit + additional_time_that_I_cannot_explain;
const MS_RESERVED_FOR_BUFFER = 5;

/**
 * ============================================================================
 * Domain Objects
 * ============================================================================
 */

class Coordinate {
    constructor(x:number, y:number){
        this.x=x;
        this.y=y;
    }

    public x: number;
    public y: number;
    // noinspection JSUnusedGlobalSymbols
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
    public getCoordinateInDirection(direction:directionEnum):Coordinate {
        switch(direction){
            case directionEnum.up:
                return new Coordinate(this.x, this.y-1);
            case directionEnum.down:
                return new Coordinate(this.x, this.y+1);
            case directionEnum.left:
                return new Coordinate(this.x-1, this.y);
            case directionEnum.right:
                return new Coordinate(this.x+1, this.y);
        }
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
}

class SnakeSegment {
    constructor(coordinate:Coordinate){
        this.coordinate = coordinate;
    }
    public coordinate: Coordinate;
}

class SnakeMessage {
    public snakeId: number = -1;
    public turnStartMs: number = 0;
    public turnEndMs: number = 0;
    public floodFillBudgetMs: number = 0;
    public floodFillStatesVisited: number = 0;
    public floodFillMaxVisited: number = 0;
    public floodFillExitReason: FloodFillExitReason = FloodFillExitReason.notRun;
    public floodFillBestMove: directionEnum | null = null;
    public chosenDirection: directionEnum | null = null;

    public reset(): void {
        this.turnStartMs = 0;
        this.turnEndMs = 0;
        this.floodFillBudgetMs = 0;
        this.floodFillStatesVisited = 0;
        this.floodFillMaxVisited = 0;
        this.floodFillExitReason = FloodFillExitReason.notRun;
        this.floodFillBestMove = null;
        this.chosenDirection = null;
    }

    public getMessage(): string {
        const snakeDurationMs = this.turnEndMs - this.turnStartMs;
        // noinspection JSUnusedLocalSymbols
        const floodFillBestMoveLabel = this.floodFillBestMove === null
            ? 'none'
            : DIRECTION_LABELS[this.floodFillBestMove];
        // noinspection JSUnusedLocalSymbols
        const chosenLabel = this.chosenDirection === null
            ? 'none'
            : DIRECTION_LABELS[this.chosenDirection];

        return (
            `snake ${this.snakeId} summary: ` +
            // `start=${this.turnStartMs.toFixed(2)}ms, ` +
            // `end=${this.turnEndMs.toFixed(2)}ms, ` +
            `duration=${snakeDurationMs.toFixed(2)}ms, ` +
            // `budget=${this.floodFillBudgetMs.toFixed(2)}ms, ` +
            `floodVisited=${this.floodFillStatesVisited}, ` +
            `floodExit=${this.floodFillExitReason}, `
            // `floodBest=${floodFillBestMoveLabel}, ` +
            // `chosen=${chosenLabel}`
        );
    }
}

class Snake {
    constructor(
        id: number,
        allegiance: Allegiance,
        body: SnakeSegment[],
        isCopy: boolean = false,
        simulatedFrame: number = 0,
        moveChosen: boolean = false
    ) {
        this.id = id;
        this.allegiance = allegiance;
        this.body = body;
        this.isCopy = isCopy;
        this.simulatedFrame = simulatedFrame;
        this.moveChosen = moveChosen;
        this.snakeMessage.snakeId = id;
    }
    public id: number;
    public allegiance: Allegiance;
    public body: SnakeSegment[];
    public isCopy: boolean;
    public simulatedFrame: number;
    public moveChosen: boolean;
    public snakeMessage: SnakeMessage = new SnakeMessage();
    public currentDirection: directionEnum = directionEnum.up;
    public get head(): Coordinate {
        return this.body[0].coordinate;
    }


    public update(snake: Snake) {
        this.allegiance = snake.allegiance;
        this.body = snake.body;
        this.isCopy = snake.isCopy;
        this.simulatedFrame = snake.simulatedFrame;
        this.moveChosen = snake.moveChosen;
        this.snakeMessage.reset();
    }

    public deepCopy(): Snake {
        const newBody = this.body.map(segment => new SnakeSegment(new Coordinate(segment.coordinate.x, segment.coordinate.y)));
        const copy = new Snake(this.id, this.allegiance, newBody, true, this.simulatedFrame, this.moveChosen);
        copy.currentDirection = this.currentDirection;
        return copy;
    }
}

class Snakes {
    public collection: Snake[] = [];
    private allegianceById: Map<number, Allegiance> = new Map<number, Allegiance>();//todo:J tf is this

    private getMaybeById(id:number) {
        return this.collection.find((snake) => snake.id == id);
    }

    public upsert(snake: Snake) {
        const snakeToUpdate = this.getMaybeById(snake.id);
        if (!snakeToUpdate) {
            this.collection.push(snake);
            return;
        }
        snakeToUpdate.update(snake);
    }

    public willThereBeASegmentHereInFrames(coordinate: Coordinate, futureFrames: number, ignoredSnakeId: number | null = null): boolean {
        const normalizedFutureFrames = Math.max(0, futureFrames);
        for (const snake of this.collection) {
            if (ignoredSnakeId !== null && snake.id === ignoredSnakeId) {
                continue;
            }
            for (let i = 0; i < snake.body.length; i++) {
                const segment = snake.body[i];
                if (!segment.coordinate.equals(coordinate)) {
                    continue;
                }

                const framesUntilCoordinateIsVacated = snake.body.length - i;
                if (normalizedFutureFrames < framesUntilCoordinateIsVacated) {
                    return true;
                }
            }
        }
        return false;
    }

    public registerAllegiance(snakeId: number, allegiance: Allegiance): void {
        this.allegianceById.set(snakeId, allegiance); //todo:J all this allegiance crap can be removed, allegiances don't change
    }

    public getAllegianceById(snakeId: number): Allegiance {
        const allegiance = this.allegianceById.get(snakeId);
        if (allegiance === undefined) {
            throw new Error(`Unknown snake id: ${snakeId}`);
        }
        return allegiance;
    }

    public mine(): Snake[] {
        return this.collection.filter((snake) => snake.allegiance === Allegiance.mine);
    }

    public removeMissingById(aliveSnakeIds: number[]): void {
        const aliveSnakeIdSet = new Set<number>(aliveSnakeIds);
        this.collection = this.collection.filter((snake) => aliveSnakeIdSet.has(snake.id));
    }
}

class Cell {
    constructor(coordinate:Coordinate, cellObject:CellObject){
        this.coordinate = coordinate;
        this.cellObject = cellObject;
    }
    public coordinate: Coordinate;
    public cellObject: CellObject;
}

class Cells {
    public collection: Cell[] = [];

    public clearPowerCells() {
        this.collection.forEach((cell) => {
            if (cell.cellObject == CellObject.energyCell) {
                cell.cellObject = CellObject.empty;
            }
        });
    }

    public getMaybeByCoordinate(coordinate:Coordinate) {
        return this.collection.find((c) => c.coordinate.equals(coordinate));
    }

    public getByCoordinate(coordinate:Coordinate) {
        const existingCell = this.getMaybeByCoordinate(coordinate);
        if (existingCell) {
            return existingCell;
        }

        const offGridCell = new Cell(
            new Coordinate(coordinate.x, coordinate.y),
            CellObject.offGrid
        );
        this.collection.push(offGridCell);
        return offGridCell;
    }

    public markPowerCell(coordinate:Coordinate) {
        this.getByCoordinate(coordinate).cellObject = CellObject.energyCell;
    }

    public powerCells(): Cell[] {
        return this.collection.filter((cell) => cell.cellObject == CellObject.energyCell);
    }
}

/**
 * ============================================================================
 * State
 * ============================================================================
 */
class GameState {
    public myId: number = -1;
    public width: number = 0;
    public height: number = 0;
    public cells: Cells = new Cells();
    public snakes: Snakes = new Snakes();
    public snakeBotsPerPlayer: number = 0;
}

class TurnTimer {
    private turnStartMs: number = 0;
    private snakeTurnStartMs: number = 0;

    public startTurn(): void {
        this.turnStartMs = Date.now();
        this.snakeTurnStartMs = this.turnStartMs;
    }

    public startSnakeTurn(): void {
        this.snakeTurnStartMs = Date.now();
    }

    public msElapsedThisTurn(): number {
        return Date.now() - this.turnStartMs;
    }

    public msElapsedThisSnakeTurn(): number {
        return Date.now() - this.snakeTurnStartMs;
    }

    public msUntilTurnEnds(): number {
        return TURN_TIME_LIMIT_MS - this.msElapsedThisTurn();
    }

    public msUntilBufferDeadline(): number {
        return this.msUntilTurnEnds() - MS_RESERVED_FOR_BUFFER;
    }

    public msBudgetForNextSnake(mySnakes: Snake[]): number {
        const snakesWithoutMoveChosen = mySnakes.filter((snake) => !snake.moveChosen).length;
        if (snakesWithoutMoveChosen <= 0) {
            return 0;
        }

        const msAvailable = Math.max(0, this.msUntilBufferDeadline());
        return msAvailable / snakesWithoutMoveChosen;
    }
}

/**
 * ============================================================================
 * Simulation
 * ============================================================================
 */
class Simulator {
    private stateKey(snake: Snake): string {
        return snake.body
            .map(segment => `${segment.coordinate.x},${segment.coordinate.y}`)
            .join('|');
    }

    private distanceDropToPlatform(
        state: GameState,
        startCoordinate: Coordinate,
        futureFrames: number = 0,
        ignoredSnakeId: number | null = null
    ): number {
        let distance = 0;
        let currentCell: Cell = state.cells.getByCoordinate(startCoordinate.getCoordinateInDirection(directionEnum.down));
        while (
            currentCell.cellObject != CellObject.platform &&
            currentCell.cellObject != CellObject.energyCell &&
            !state.snakes.willThereBeASegmentHereInFrames(currentCell.coordinate, futureFrames, ignoredSnakeId)
        ) {
            if (currentCell.cellObject == CellObject.offGrid && currentCell.coordinate.y > 0) {
                return -1;
            }
            currentCell = state.cells.getByCoordinate(new Coordinate(currentCell.coordinate.x, currentCell.coordinate.y + 1));
            distance++;
        }
        return distance;
    }

    public findFloodFillMoveToEnergyCell(
        state: GameState,
        snake: Snake,
        turnTimer: TurnTimer,
        maxSnakeBudgetMs: number,
        maxExploredStates: number = 10000
    ): directionEnum | null {
        const energyCoordinates = state.cells.powerCells().map((cell) => cell.coordinate);
        snake.snakeMessage.floodFillBudgetMs = maxSnakeBudgetMs;
        snake.snakeMessage.floodFillMaxVisited = maxExploredStates;
        snake.snakeMessage.floodFillStatesVisited = 0;
        snake.snakeMessage.floodFillBestMove = null;
        snake.snakeMessage.floodFillExitReason = FloodFillExitReason.notRun;

        type FloodNode = { snake: Snake, firstMove: directionEnum | null };
        const queue: FloodNode[] = [{ snake, firstMove: null }];
        const visited = new Set<string>();
        let bestMove: directionEnum | null = null;
        let bestLength = -1;
        let bestDistance = Number.MAX_SAFE_INTEGER;

        const updateBestMove = (candidateSnake: Snake, firstMove: directionEnum) => {
            const length = candidateSnake.body.length;
            const distanceToClosestEnergy = energyCoordinates.length > 0
                ? candidateSnake.head.distance(candidateSnake.head.closest(energyCoordinates))
                : Number.MAX_SAFE_INTEGER;

            if (length > bestLength || (length === bestLength && distanceToClosestEnergy < bestDistance)) {
                bestLength = length;
                bestDistance = distanceToClosestEnergy;
                bestMove = firstMove;
            }
        };

        const shouldStopFloodFill = () =>
            visited.size >= maxExploredStates ||
            turnTimer.msUntilBufferDeadline() <= 0 ||
            turnTimer.msElapsedThisSnakeTurn() >= maxSnakeBudgetMs;

        const enqueueSortedCandidate = (
            candidates: { direction: directionEnum, movedSnake: Snake }[],
            candidate: { direction: directionEnum, movedSnake: Snake }
        ) => {
            candidates.push(candidate);
            candidates.sort((a, b) => b.movedSnake.body.length - a.movedSnake.body.length);
        };

        while (queue.length > 0 && !shouldStopFloodFill()) {
            const current = queue.shift()!;

            const candidates: { direction: directionEnum, movedSnake: Snake }[] = [];
            for (let i = 0; i < 4; i++) {
                const direction = i as directionEnum;
                const movedSnake = this.simulateMove(state, current.snake, direction);
                if (movedSnake) {
                    enqueueSortedCandidate(candidates, { direction, movedSnake });
                }
            }

            for (const candidate of candidates) {
                if (shouldStopFloodFill()) {
                    break;
                }

                const key = this.stateKey(candidate.movedSnake);
                if (visited.has(key)) {
                    continue;
                }

                const firstMove = current.firstMove === null ? candidate.direction : current.firstMove;
                visited.add(key);
                updateBestMove(candidate.movedSnake, firstMove);
                queue.push({ snake: candidate.movedSnake, firstMove });
            }
        }

        let floodFillExitReason: FloodFillExitReason = FloodFillExitReason.visitedEveryState;
        if (turnTimer.msUntilBufferDeadline() <= 0) {
            floodFillExitReason = FloodFillExitReason.ranOutOfTurnTime;
        } else if (turnTimer.msElapsedThisSnakeTurn() >= maxSnakeBudgetMs) {
            floodFillExitReason = FloodFillExitReason.ranOutOfTime;
        } else if (visited.size >= maxExploredStates) {
            floodFillExitReason = FloodFillExitReason.hitMaxVisited;
        }

        snake.snakeMessage.floodFillStatesVisited = visited.size;
        snake.snakeMessage.floodFillBestMove = bestMove;
        snake.snakeMessage.floodFillExitReason = floodFillExitReason;

        return bestMove;
    }

    public positionsICanMoveTo(state: GameState, snake: Snake): { direction: directionEnum, snake: Snake }[] {
        const possibleMoves: { direction: directionEnum, snake: Snake }[] = [];
        for (let i = 0; i < 4; i++) {
            const direction = i as directionEnum;
            const possibleMove = this.simulateMove(state, snake, direction);
            if (possibleMove) {
                possibleMoves.push({ direction, snake: possibleMove });
            }
        }
        return possibleMoves;
    }

    public simulateMove(state: GameState, currentSnake: Snake, direction: directionEnum): Snake | null {
        const snake = currentSnake.deepCopy();
        snake.simulatedFrame++;
        const targetCoordinate = snake.head.getCoordinateInDirection(direction);
        if (snake.body.length > 1 && targetCoordinate.equals(snake.body[1].coordinate)) {
            return null;
        }
        const targetCell = state.cells.getMaybeByCoordinate(targetCoordinate);
        const hasFutureSnakeSegment = state.snakes.willThereBeASegmentHereInFrames(targetCoordinate, snake.simulatedFrame);
        if ((targetCell && targetCell.cellObject == CellObject.platform) || hasFutureSnakeSegment) {
            return this.simulateDamage(state, snake);
        }
        const movedSnake = this.iterateMovements(state, snake, direction);
        return this.simulateFall(state, movedSnake);
    }

    public simulateFall(state: GameState, currentSnake: Snake): Snake | null {
        const snake = currentSnake.deepCopy();
        if (snake.body.length === 0) {
            return snake;
        }

        let smallestDropDistance = Number.MAX_SAFE_INTEGER;
        for (const segment of snake.body) {
            const dropDistance = this.distanceDropToPlatform(state, segment.coordinate, snake.simulatedFrame, snake.id);

            if (dropDistance < smallestDropDistance) {
                smallestDropDistance = dropDistance;
            }
        }

        if (smallestDropDistance == -1) {
            return null;
        }

        if (!Number.isFinite(smallestDropDistance) || smallestDropDistance <= 0) {
            return snake;
        }

        for (const segment of snake.body) {
            segment.coordinate = new Coordinate(
                segment.coordinate.x,
                segment.coordinate.y + smallestDropDistance
            );
        }

        return snake;
    }

    public simulateDamage(state: GameState, currentSnake: Snake): Snake | null {
        const snake = currentSnake.deepCopy();
        snake.body.pop();
        if (snake.body.length <= 2) {
            return null;
        }
        return this.simulateFall(state, snake);
    }

    public iterateMovements(state: GameState, currentSnake: Snake, direction: directionEnum): Snake {
        const snake = currentSnake.deepCopy();
        const newBody: SnakeSegment[] = [];
        const newHeadCoordinate = snake.body[0].coordinate.getCoordinateInDirection(direction);
        newBody.push(new SnakeSegment(newHeadCoordinate));

        for (let i = 0; i < snake.body.length - 1; i++) {
            newBody.push(new SnakeSegment(snake.body[i].coordinate));
        }

        const energyCellEaten = state.cells.powerCells().find(cell => cell.coordinate.equals(newHeadCoordinate));
        if (energyCellEaten) {
            newBody.push(new SnakeSegment(snake.body[snake.body.length - 1].coordinate));
        }

        return new Snake(snake.id, snake.allegiance, newBody, true, snake.simulatedFrame);
    }
}

/**
 * ============================================================================
 * Strategy
 * ============================================================================
 */
class StrategyManager {
    constructor(private simulator: Simulator) {}

    public chooseDirection(
        state: GameState,
        snake: Snake,
        turnTimer: TurnTimer,
        maxSnakeBudgetMs: number
    ): directionEnum {
        const powerCells = state.cells.powerCells();
        if (powerCells.length === 0) {
            return directionEnum.up;
        }

        const floodFillDirection = this.simulator.findFloodFillMoveToEnergyCell(
            state,
            snake,
            turnTimer,
            maxSnakeBudgetMs
        );
        if (floodFillDirection !== null) {
            return floodFillDirection;
        }

        const closestPowerCell: Coordinate = snake.head.closest(powerCells.map(pc => pc.coordinate));
        const currentDistance: number = snake.head.distance(closestPowerCell);

        const possibleMoves = this.simulator.positionsICanMoveTo(state, snake);
        let bestMove: { direction: directionEnum, snake: Snake } | null = null;
        let minDistance = currentDistance;

        // 1. Try to find a move that gets us closer.
        for (const move of possibleMoves) {
            const newDistance = move.snake.head.distance(closestPowerCell);
            if (newDistance < minDistance) {
                minDistance = newDistance;
                bestMove = move;
            }
        }

        // 2. If no move is closer, pick a move that preserves length.
        if (!bestMove) {
            const lengthPreservingMoves = possibleMoves.filter(m => m.snake.body.length === snake.body.length);
            if (lengthPreservingMoves.length > 0) {
                throwWarning(`${snake.id} is making length preserving move - not great`);
                bestMove = lengthPreservingMoves[0];
            } else if (possibleMoves.length > 0) {
                throwWarning(`${snake.id} is making desperation move - scary!`);
                bestMove = possibleMoves[0];
            }
        }

        return bestMove ? bestMove.direction : directionEnum.up;
    }
}

/**
 * ============================================================================
 * Parsing
 * ============================================================================
 */
function parseSnakeBody(rawBody: string): SnakeSegment[] {
    const segments: SnakeSegment[] = [];
    const coordinateParts = rawBody.match(/-?\d+,-?\d+/g);
    if (!coordinateParts) {
        return segments;
    }
    coordinateParts.forEach((part) => {
        const [xString, yString] = part.split(',');
        segments.push(new SnakeSegment(new Coordinate(parseInt(xString), parseInt(yString))));
    });
    return segments;
}

class InputParser {
    private parseCellObject(rawCell: string): CellObject {
        return rawCell == '#' ? CellObject.platform : CellObject.empty;
    }

    public initializeState(state: GameState): void {
        state.myId = parseInt(readline());
        state.width = parseInt(readline());
        state.height = parseInt(readline());

        for (let y = 0; y < state.height; y++) {
            const row: string = readline();
            for (let x = 0; x < state.width; x++) {
                const cellObject = this.parseCellObject(row[x]);
                state.cells.collection.push(new Cell(new Coordinate(x, y), cellObject));
            }
        }

        state.snakeBotsPerPlayer = parseInt(readline());
        for (let i = 0; i < state.snakeBotsPerPlayer; i++) {
            const mySnakeBotId: number = parseInt(readline());
            state.snakes.registerAllegiance(mySnakeBotId, Allegiance.mine);
        }
        for (let i = 0; i < state.snakeBotsPerPlayer; i++) {
            const oppSnakeBotId: number = parseInt(readline());
            state.snakes.registerAllegiance(oppSnakeBotId, Allegiance.enemy1);
        }
    }

    public parseTurn(state: GameState): Snake[] {
        const powerSourceCount: number = parseInt(readline());
        state.cells.clearPowerCells();
        for (let i = 0; i < powerSourceCount; i++) {
            const inputs: string[] = readline().split(' ');
            const x: number = parseInt(inputs[0]);
            const y: number = parseInt(inputs[1]);
            state.cells.markPowerCell(new Coordinate(x, y));
        }

        const snakeBotCount: number = parseInt(readline());
        const snakeIdsSeenThisTurn: number[] = [];
        for (let i = 0; i < snakeBotCount; i++) {
            const inputs: string[] = readline().split(' ');
            const snakeBotId: number = parseInt(inputs[0]);
            const body: string = inputs[1];
            const allegiance: Allegiance = state.snakes.getAllegianceById(snakeBotId);
            const snake: Snake = new Snake(snakeBotId, allegiance, parseSnakeBody(body));
            state.snakes.upsert(snake);
            snakeIdsSeenThisTurn.push(snakeBotId);
        }
        state.snakes.removeMissingById(snakeIdsSeenThisTurn);
        return state.snakes.mine();
    }
}

/**
 * ============================================================================
 * Application
 * ============================================================================
 */
class TurnEngine {
    constructor(
        private state: GameState,
        private inputParser: InputParser,
        private strategyManager: StrategyManager,
        private turnTimer: TurnTimer
    ) {}

    public initialize(): void {
        this.inputParser.initializeState(this.state);
    }

    public run(): void {
        // noinspection InfiniteLoopJS
        while (true) {
            const mySnakes = this.inputParser.parseTurn(this.state);
            this.turnTimer.startTurn();
            const commandString = this.buildCommandString(mySnakes);
            console.log(commandString);
        }
    }

    private buildCommandString(mySnakes: Snake[]): string {
        let commandString = '';
        mySnakes.forEach((snake) => {
            snake.moveChosen = false;
            snake.snakeMessage.reset();
        });

        mySnakes.forEach((snake) => {
            snake.snakeMessage.turnStartMs = this.turnTimer.msElapsedThisTurn();
            const maxSnakeBudgetMs = this.turnTimer.msBudgetForNextSnake(mySnakes);
            snake.snakeMessage.floodFillBudgetMs = maxSnakeBudgetMs;
            this.turnTimer.startSnakeTurn();
            const chosenDirection = this.strategyManager.chooseDirection(
                this.state,
                snake,
                this.turnTimer,
                maxSnakeBudgetMs
            );
            snake.currentDirection = chosenDirection;
            snake.moveChosen = true;
            snake.snakeMessage.chosenDirection = chosenDirection;
            snake.snakeMessage.turnEndMs = this.turnTimer.msElapsedThisTurn();
            commandString += `${snake.id} ${DIRECTION_LABELS[chosenDirection]};`;
            tempDebug(snake.snakeMessage.getMessage());
        });
        return commandString;
    }
}

class GameManager {
    public state: GameState = new GameState();
    public simulator: Simulator = new Simulator();
    public strategyManager: StrategyManager = new StrategyManager(this.simulator);
    public inputParser: InputParser = new InputParser();
    public turnTimer: TurnTimer = new TurnTimer();
    public turnEngine: TurnEngine = new TurnEngine(
        this.state,
        this.inputParser,
        this.strategyManager,
        this.turnTimer
    );

    public initialize() {
        this.turnEngine.initialize();
    }

    public runGameLoop() {
        this.turnEngine.run();
    }
}

const gameManager: GameManager = new GameManager();
gameManager.initialize();
gameManager.runGameLoop();
