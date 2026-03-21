// noinspection DuplicatedCode

/**
 * Future Goals
 * Big
 *  1. Optimize flood fill
 *  2. Coordinate Bots
 *  3. flood fill should prune off of best, not just size?
 *
 * Small
 *  1. there is a bug where snakes just charge off the top of the screen? I think this is caused by the energy cell lookup having overflow?
 *
 *
 */
//Flood Fill Measurement
//1. just added timer - 1128.57 states measured per turn
//2. switch to 1d lookups for great speed - 3960.41 states measured per turn

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
const additional_time_that_I_cannot_explain = 0
const TURN_TIME_LIMIT_MS = theoretical_time_limit + additional_time_that_I_cannot_explain;
const MS_RESERVED_FOR_BUFFER = 10;

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
        return `(${this.x} ${this.y})`
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
        moveChosen: boolean = false,
        theoreticallyConsumedEnergyCells: Set<Coordinate> = new Set<Coordinate>()
    ) {
        this.id = id;
        this.allegiance = allegiance;
        this.body = body;
        this.isCopy = isCopy;
        this.simulatedFrame = simulatedFrame;
        this.moveChosen = moveChosen;
        this.snakeMessage.snakeId = id;
        this.theoreticallyConsumedEnergyCells = theoreticallyConsumedEnergyCells;
    }
    public id: number;
    public allegiance: Allegiance;
    public body: SnakeSegment[];
    public isCopy: boolean;
    public simulatedFrame: number;
    public moveChosen: boolean;
    public headAdjacentToEnergyCell: boolean = false;
    public snakeMessage: SnakeMessage = new SnakeMessage();
    public currentDirection: directionEnum = directionEnum.up;
    public theoreticallyConsumedEnergyCells: Set<Coordinate> = new Set();
    public get head(): Coordinate {
        return this.body[0].coordinate;
    }


    public update(snake: Snake) {
        this.allegiance = snake.allegiance;
        this.body = snake.body;
        this.isCopy = snake.isCopy;
        this.simulatedFrame = snake.simulatedFrame;
        this.moveChosen = snake.moveChosen;
        this.headAdjacentToEnergyCell = snake.headAdjacentToEnergyCell;
        this.snakeMessage.reset();
    }

    public deepCopy(): Snake {
        const newBody = this.body.map(segment => new SnakeSegment(new Coordinate(segment.coordinate.x, segment.coordinate.y)));
        const copy = new Snake(this.id, this.allegiance, newBody, true, this.simulatedFrame, this.moveChosen, this.theoreticallyConsumedEnergyCells);
        copy.currentDirection = this.currentDirection;
        copy.headAdjacentToEnergyCell = this.headAdjacentToEnergyCell;
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

                const framesUntilCoordinateIsVacated = snake.body.length - i + (snake.headAdjacentToEnergyCell ? 1 : 0);
                if (normalizedFutureFrames < framesUntilCoordinateIsVacated) {
                    return true;
                }
            }
        }
        return false;
    }

    public updateHeadAdjacencyToEnergy(cells: Cells): void {
        for (const snake of this.collection) {
            const head = snake.head;
            snake.headAdjacentToEnergyCell =
                cells.isEnergyCellAt(head.getCoordinateInDirection(directionEnum.up)) ||
                cells.isEnergyCellAt(head.getCoordinateInDirection(directionEnum.down)) ||
                cells.isEnergyCellAt(head.getCoordinateInDirection(directionEnum.left)) ||
                cells.isEnergyCellAt(head.getCoordinateInDirection(directionEnum.right));
        }
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
    private width: number = 0;
    private height: number = 0;
    private energyCellIndexes: Set<number> = new Set<number>();

    public initialize(width: number, height: number): void {
        this.width = width;
        this.height = height;
        this.collection = new Array<Cell>(width * height);
        this.energyCellIndexes.clear();

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                this.collection[this.getIndex(x, y)] = new Cell(new Coordinate(x, y), CellObject.empty);
            }
        }
    }

    private getIndex(x: number, y: number): number {
        return y * this.width + x;
    }

    public getIndexByCoordinate(coordinate: Coordinate): number {
        if (
            coordinate.x < 0 ||
            coordinate.y < 0 ||
            coordinate.x >= this.width ||
            coordinate.y >= this.height
        ) {
            return -1;
        }

        return this.getIndex(coordinate.x, coordinate.y);
    }

    public setCellObjectByCoordinate(coordinate: Coordinate, cellObject: CellObject): void {
        const index = this.getIndexByCoordinate(coordinate);
        if (index < 0) {
            return;
        }

        this.setCellObjectByIndex(index, cellObject);
    }

    public setCellObjectByIndex(index: number, cellObject: CellObject): void {
        const cell = this.collection[index];
        if (cell.cellObject === CellObject.energyCell && cellObject !== CellObject.energyCell) {
            this.energyCellIndexes.delete(index);
        }
        if (cellObject === CellObject.energyCell) {
            this.energyCellIndexes.add(index);
        }
        cell.cellObject = cellObject;
    }

    public clearPowerCells(): void {
        this.energyCellIndexes.forEach((index) => {
            this.collection[index].cellObject = CellObject.empty;
        });
        this.energyCellIndexes.clear();
    }

    public getMaybeByCoordinate(coordinate:Coordinate): Cell | null {
        const index = this.getIndexByCoordinate(coordinate);
        if (index < 0) {
            return null;
        }
        return this.collection[index];
    }

    public getByCoordinate(coordinate:Coordinate): Cell {
        const existingCell = this.getMaybeByCoordinate(coordinate);
        if (existingCell) {
            return existingCell;
        }

        return new Cell(new Coordinate(coordinate.x, coordinate.y), CellObject.offGrid);
    }

    public markPowerCell(coordinate:Coordinate): void {
        this.setCellObjectByCoordinate(coordinate, CellObject.energyCell);
    }

    public isEnergyCellAt(coordinate: Coordinate): boolean {
        const index = this.getIndexByCoordinate(coordinate);
        return index >= 0 && this.energyCellIndexes.has(index);
    }

    public isEnergyCellTheoreticallyAt(coordinate: Coordinate, state: GameState, snake: Snake): boolean {
        return !state.energyCellsTheoreticallyConsumedInFutureTurns.has(coordinate) && !snake.theoreticallyConsumedEnergyCells.has(coordinate) && this.isEnergyCellAt(coordinate);
    }

    public powerCells(): Cell[] {
        return Array.from(this.energyCellIndexes, (index) => this.collection[index]);
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
    public energyCellsTheoreticallyConsumedInFutureTurns: Set<Coordinate> = new Set<Coordinate>();
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
        maxExploredStates: number = 10000,
        reservedHeadTargetIndexes: Set<number> | null = null
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
        let bestFinalSnake = null;
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
                bestFinalSnake = candidateSnake;
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
                const movedSnake = this.simulateMove(state, current.snake, direction, reservedHeadTargetIndexes);
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
        gameManager.state.energyCellsTheoreticallyConsumedInFutureTurns = new Set<Coordinate>([...bestFinalSnake?.theoreticallyConsumedEnergyCells??new Set<Coordinate>(), ...gameManager.state.energyCellsTheoreticallyConsumedInFutureTurns??new Set<Coordinate>()]);
        //tempDebug([...gameManager.state.energyCellsTheoreticallyConsumedInFutureTurns].map(c=>c.print()).reduce((a,b)=>a+" "+b,""));

        return bestMove;
    }

    public positionsICanMoveTo(
        state: GameState,
        snake: Snake,
        reservedHeadTargetIndexes: Set<number> | null = null
    ): { direction: directionEnum, snake: Snake }[] {
        const possibleMoves: { direction: directionEnum, snake: Snake }[] = [];
        for (let i = 0; i < 4; i++) {
            const direction = i as directionEnum;
            const possibleMove = this.simulateMove(state, snake, direction, reservedHeadTargetIndexes);
            if (possibleMove) {
                possibleMoves.push({ direction, snake: possibleMove });
            }
        }
        return possibleMoves;
    }

    public simulateMove(
        state: GameState,
        currentSnake: Snake,
        direction: directionEnum,
        reservedHeadTargetIndexes: Set<number> | null = null
    ): Snake | null {
        const isFirstSimulatedMove = currentSnake.simulatedFrame === 0;
        const snake = currentSnake.deepCopy();
        snake.simulatedFrame++;
        const targetCoordinate = snake.head.getCoordinateInDirection(direction);

        if (isFirstSimulatedMove && reservedHeadTargetIndexes) {
            const targetIndex = state.cells.getIndexByCoordinate(targetCoordinate);
            if (targetIndex >= 0 && reservedHeadTargetIndexes.has(targetIndex)) {
                return null;
            }
        }

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

        if (state.cells.isEnergyCellTheoreticallyAt(newHeadCoordinate, state, snake)) {
            snake.theoreticallyConsumedEnergyCells.add(newHeadCoordinate);
            newBody.push(new SnakeSegment(snake.body[snake.body.length - 1].coordinate));
        }

        return new Snake(snake.id, snake.allegiance, newBody, true, snake.simulatedFrame, snake.moveChosen, snake.theoreticallyConsumedEnergyCells);
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
        maxSnakeBudgetMs: number,
        reservedHeadTargetIndexes: Set<number>
    ): directionEnum {
        const powerCells = state.cells.powerCells();
        const possibleMoves = this.simulator.positionsICanMoveTo(state, snake, reservedHeadTargetIndexes);

        if (powerCells.length === 0) {
            if (possibleMoves.length > 0) {
                return possibleMoves[0].direction;
            }
            return directionEnum.up;
        }

        const floodFillDirection = this.simulator.findFloodFillMoveToEnergyCell(
            state,
            snake,
            turnTimer,
            maxSnakeBudgetMs,
            10000,
            reservedHeadTargetIndexes
        );
        if (floodFillDirection !== null) {
            return floodFillDirection;
        }

        const closestPowerCell: Coordinate = snake.head.closest(powerCells.map(pc => pc.coordinate));
        const currentDistance: number = snake.head.distance(closestPowerCell);
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
        state.cells.initialize(state.width, state.height);

        for (let y = 0; y < state.height; y++) {
            const row: string = readline();
            for (let x = 0; x < state.width; x++) {
                const cellObject = this.parseCellObject(row[x]);
                state.cells.setCellObjectByIndex(y * state.width + x, cellObject);
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
        state.snakes.updateHeadAdjacencyToEnergy(state.cells);
        return state.snakes.mine();
    }
}

class GameSummary {
    private turnsProcessed: number = 0;
    private totalFloodFillStatesVisitedAcrossGame: number = 0;
    private totalSnakesProcessedAcrossGame: number = 0;
    private currentTurnAverageStatesPerSnake: number = 0; //todo:J bad name

    public recordTurn(mySnakes: Snake[]): void {
        const totalFloodFillStatesVisitedThisTurn = mySnakes.reduce(
            (sum, snake) => sum + snake.snakeMessage.floodFillStatesVisited,
            0
        );

        this.turnsProcessed++;
        this.totalFloodFillStatesVisitedAcrossGame += totalFloodFillStatesVisitedThisTurn;
        this.totalSnakesProcessedAcrossGame += mySnakes.length;
        this.currentTurnAverageStatesPerSnake = this.totalSnakesProcessedAcrossGame > 0
            ? this.totalFloodFillStatesVisitedAcrossGame / this.totalSnakesProcessedAcrossGame
            : 0;
    }

    public getAverageStatesVisitedPerTurnAcrossGame(): number {
        if (this.turnsProcessed <= 0) {
            return 0;
        }
        return this.totalFloodFillStatesVisitedAcrossGame / this.turnsProcessed;
    }

    public getMessage(): string {
        return (
            `game summary: ` +
            `avg flood-fill states per snake (game)=${this.currentTurnAverageStatesPerSnake.toFixed(2)}, ` +
            `avg flood-fill states per turn (game)=${this.getAverageStatesVisitedPerTurnAcrossGame().toFixed(2)}`
        );
    }
}

/**
 * ============================================================================
 * Validation
 * ============================================================================
 */
// function validateConsumedEnergyCells(state: GameState): void {
//     //check that no two snakes
// }

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
        private turnTimer: TurnTimer,
        private gameSummary: GameSummary
    ) {}

    public initialize(): void {
        this.inputParser.initializeState(this.state);
    }

    public run(): void {
        // noinspection InfiniteLoopJS
        while (true) {
            const mySnakes = this.inputParser.parseTurn(this.state);
            this.state.energyCellsTheoreticallyConsumedInFutureTurns = new Set<Coordinate>();
            this.turnTimer.startTurn();
            const commandString = this.buildCommandString(mySnakes);
            console.log(commandString);
        }
    }

    private buildCommandString(mySnakes: Snake[]): string {
        let commandString = '';
        const reservedHeadTargetIndexes = new Set<number>();
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
                maxSnakeBudgetMs,
                reservedHeadTargetIndexes
            );
            snake.currentDirection = chosenDirection;
            snake.moveChosen = true;
            snake.snakeMessage.chosenDirection = chosenDirection;
            snake.snakeMessage.turnEndMs = this.turnTimer.msElapsedThisTurn();

            const targetCoordinate = snake.head.getCoordinateInDirection(chosenDirection);
            const targetIndex = this.state.cells.getIndexByCoordinate(targetCoordinate);
            if (targetIndex >= 0) {
                reservedHeadTargetIndexes.add(targetIndex);
            }

            commandString += `${snake.id} ${DIRECTION_LABELS[chosenDirection]};`;
            //tempDebug(snake.snakeMessage.getMessage());
        });
        this.gameSummary.recordTurn(mySnakes);
        //tempDebug(this.gameSummary.getMessage());

        return commandString;
    }
}

class GameManager {
    public state: GameState = new GameState();
    public simulator: Simulator = new Simulator();
    public strategyManager: StrategyManager = new StrategyManager(this.simulator);
    public inputParser: InputParser = new InputParser();
    public turnTimer: TurnTimer = new TurnTimer();
    public gameSummary: GameSummary = new GameSummary();
    public turnEngine: TurnEngine = new TurnEngine(
        this.state,
        this.inputParser,
        this.strategyManager,
        this.turnTimer,
        this.gameSummary
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
