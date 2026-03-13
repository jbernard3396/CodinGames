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
    console.error('TEMP_DEBUG: ' + message);
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

const DIRECTION_LABELS: string[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];

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

class Snake {
    constructor(id: number, allegiance: Allegiance, body: SnakeSegment[], isCopy: boolean = false, simulatedFrame: number = 0) {
        this.id = id;
        this.allegiance = allegiance;
        this.body = body;
        this.isCopy = isCopy;
        this.simulatedFrame = simulatedFrame;
    }
    public id: number;
    public allegiance: Allegiance;
    public body: SnakeSegment[];
    public isCopy: boolean;
    public simulatedFrame: number;
    public currentDirection: directionEnum = directionEnum.up;
    public get head(): Coordinate {
        return this.body[0].coordinate;
    }


    public update(snake: Snake) {
        this.allegiance = snake.allegiance;
        this.body = snake.body;
        this.isCopy = snake.isCopy;
        this.simulatedFrame = snake.simulatedFrame;
    }

    public deepCopy(): Snake {
        const newBody = this.body.map(segment => new SnakeSegment(new Coordinate(segment.coordinate.x, segment.coordinate.y)));
        const copy = new Snake(this.id, this.allegiance, newBody, true, this.simulatedFrame);
        copy.currentDirection = this.currentDirection;
        return copy;
    }
}

class Snakes {
    public collection: Snake[] = [];

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

    public mine(mySnakeBotIds: number[]): Snake[] {
        const mySnakeBotIdSet = new Set<number>(mySnakeBotIds);
        return this.collection.filter((snake) => mySnakeBotIdSet.has(snake.id));
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
    public mySnakeBotIds: number[] = [];
    public snakeBotsPerPlayer: number = 0;
    public snakeIdToDebug: number = 6;
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
                tempDebug(`cell ${currentCell.coordinate} explored falling off grid`);
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
        maxExploredStates: number = 100
    ): directionEnum | null {
        const isDebugSnake = snake.id === state.snakeIdToDebug;
        const energyCoordinates = state.cells.powerCells().map((cell) => cell.coordinate);

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

        const enqueueSortedCandidate = (
            candidates: { direction: directionEnum, movedSnake: Snake }[],
            candidate: { direction: directionEnum, movedSnake: Snake }
        ) => {
            candidates.push(candidate);
            candidates.sort((a, b) => b.movedSnake.body.length - a.movedSnake.body.length);
        };

        while (queue.length > 0 && visited.size < maxExploredStates) {
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
                if (visited.size >= maxExploredStates) {
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

        if (isDebugSnake) {
            tempDebug(`snake ${snake.id} flood fill evaluated states: ${visited.size}, best move: ${bestMove}`);
        }
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
            tempDebug(`snake ${snake.id} explored falling off grid from cell ${snake.head.print()}`);
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

    public chooseDirection(state: GameState, snake: Snake): directionEnum {
        const powerCells = state.cells.powerCells();
        if (powerCells.length === 0) {
            return directionEnum.up;
        }

        if (snake.id === state.snakeIdToDebug) {
            tempDebug(`snake ${snake.id} is being debugged`);
        }

        const floodFillDirection = this.simulator.findFloodFillMoveToEnergyCell(state, snake);
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
            state.mySnakeBotIds.push(mySnakeBotId);
        }
        for (let i = 0; i < state.snakeBotsPerPlayer; i++) {
            parseInt(readline());
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
        for (let i = 0; i < snakeBotCount; i++) {
            const inputs: string[] = readline().split(' ');
            const snakeBotId: number = parseInt(inputs[0]);
            const body: string = inputs[1];
            const allegiance: Allegiance = state.mySnakeBotIds.indexOf(snakeBotId) >= 0 ? Allegiance.mine : Allegiance.enemy1;
            const snake: Snake = new Snake(snakeBotId, allegiance, parseSnakeBody(body));
            state.snakes.upsert(snake);
        }
        return state.snakes.mine(state.mySnakeBotIds);
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
        private strategyManager: StrategyManager
    ) {}

    public initialize(): void {
        this.inputParser.initializeState(this.state);
    }

    public run(): void {
        // noinspection InfiniteLoopJS
        while (true) {
            const mySnakes = this.inputParser.parseTurn(this.state);
            const commandString = this.buildCommandString(mySnakes);
            console.log(commandString);
        }
    }

    private buildCommandString(mySnakes: Snake[]): string {
        let commandString = '';
        mySnakes.forEach((snake) => {
            const chosenDirection = this.strategyManager.chooseDirection(this.state, snake);
            snake.currentDirection = chosenDirection;
            commandString += `${snake.id} ${DIRECTION_LABELS[chosenDirection]};`;
        });
        return commandString;
    }
}

class GameManager {
    public state: GameState = new GameState();
    public simulator: Simulator = new Simulator();
    public strategyManager: StrategyManager = new StrategyManager(this.simulator);
    public inputParser: InputParser = new InputParser();
    public turnEngine: TurnEngine = new TurnEngine(this.state, this.inputParser, this.strategyManager);

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
