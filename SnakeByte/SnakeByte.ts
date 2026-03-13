// noinspection DuplicatedCode

/**
 * ============================================================================
 * Helpers
 * ============================================================================
 */
function debug(message: string) {
    console.error('DEBUG: ' + message);
}

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
    public adjacentCoordinates(): Coordinate[] {
        return [
            this.getCoordinateInDirection(directionEnum.right),
            this.getCoordinateInDirection(directionEnum.left),
            this.getCoordinateInDirection(directionEnum.up),
            this.getCoordinateInDirection(directionEnum.down)
        ];
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

    private stateKey(): string {
        return this.body
            .map(segment => `${segment.coordinate.x},${segment.coordinate.y}`)
            .join('|');
    }

    public findFloodFillMoveToEnergyCell(maxExploredStates: number = 100): directionEnum | null {
        const isDebugSnake = this.id === gameManager.snakeIdToDebug;
        const energyCoordinates = gameManager.cells.powerCells().map((cell) => cell.coordinate);

        type FloodNode = { snake: Snake, firstMove: directionEnum };
        const queue: FloodNode[] = [];
        const visited = new Set<string>();
        let bestMove: directionEnum | null = null;
        let bestLength = -1;
        let bestDistance = Number.MAX_SAFE_INTEGER;

        const updateBestMove = (snake: Snake, firstMove: directionEnum) => {
            const length = snake.body.length;
            const distanceToClosestEnergy = energyCoordinates.length > 0
                ? snake.head.distance(snake.head.closest(energyCoordinates))
                : Number.MAX_SAFE_INTEGER;

            if (length > bestLength || (length === bestLength && distanceToClosestEnergy < bestDistance)) {
                bestLength = length;
                bestDistance = distanceToClosestEnergy;
                bestMove = firstMove;
            }
        };

        const initialCandidates: { direction: directionEnum, movedSnake: Snake }[] = [];
        for (let i = 0; i < 4; i++) {
            const direction = i as directionEnum;
            const movedSnake = this.simulateMove(direction, this);
            if (!movedSnake) {
                continue;
            }
            initialCandidates.push({ direction, movedSnake });
        }
        initialCandidates.sort((a, b) => b.movedSnake.body.length - a.movedSnake.body.length);

        for (const candidate of initialCandidates) {
            if (visited.size >= maxExploredStates) {
                break;
            }

            const direction = candidate.direction;
            const movedSnake = candidate.movedSnake;

            const key = movedSnake.stateKey();
            if (visited.has(key)) {
                continue;
            }
            visited.add(key);
            updateBestMove(movedSnake, direction);
            queue.push({ snake: movedSnake, firstMove: direction });
        }

        let nextIndex = 0;
        while (nextIndex < queue.length && visited.size < maxExploredStates) {
            const current = queue[nextIndex];
            nextIndex++;

            const candidates: { movedSnake: Snake }[] = [];
            for (let i = 0; i < 4; i++) {
                const direction = i as directionEnum;
                const movedSnake = current.snake.simulateMove(direction, current.snake);
                if (!movedSnake) {
                    continue;
                }
                candidates.push({ movedSnake });
            }
            candidates.sort((a, b) => b.movedSnake.body.length - a.movedSnake.body.length);

            for (const candidate of candidates) {
                if (visited.size >= maxExploredStates) {
                    break;
                }

                const movedSnake = candidate.movedSnake;

                const key = movedSnake.stateKey();
                if (visited.has(key)) {
                    continue;
                }
                visited.add(key);
                updateBestMove(movedSnake, current.firstMove);
                queue.push({ snake: movedSnake, firstMove: current.firstMove });
            }
        }

        if (isDebugSnake) {
            tempDebug(`snake ${this.id} flood fill evaluated states: ${visited.size}, best move: ${bestMove}`);
        }
        return bestMove;
    }

    public positionsICanMoveTo(): { direction: directionEnum, snake: Snake }[] {
        const possibleMoves: { direction: directionEnum, snake: Snake }[] = [];
        for (let i = 0; i < 4; i++) {
            const direction = i as directionEnum;
            const possibleMove = this.simulateMove(direction, this);
            if (possibleMove) {
                possibleMoves.push({ direction, snake: possibleMove });
            }
        }
        return possibleMoves;
    }

    //todo:J this should be somewhere else? maybe a static game simulator?
    public simulateMove(direction: directionEnum, currentSnake: Snake): Snake | null {
        const snake = currentSnake.deepCopy();
        snake.simulatedFrame++;
        const targetCoordinate = snake.head.getCoordinateInDirection(direction);
        if (snake.body.length > 1 && targetCoordinate.equals(snake.body[1].coordinate)) {
            return null;
        }
        const cellAbove = gameManager.cells.getMaybeByCoordinate(targetCoordinate);
        const hasFutureSnakeSegment = gameManager.snakes.willThereBeASegmentHereInFrames(targetCoordinate, snake.simulatedFrame);
        if ((cellAbove && cellAbove.cellObject == CellObject.platform) || hasFutureSnakeSegment) {
            return snake.simulateDamage(snake);
        }
        const movedSnake = snake.iterateMovements(direction, snake);
        return movedSnake.simulateFall(movedSnake);
    }

    public simulateFall(currentSnake: Snake): Snake {
        const snake = currentSnake.deepCopy();
        if (snake.body.length === 0) {
            return snake;
        }

        let smallestDropDistance = Number.MAX_SAFE_INTEGER;
        for (const segment of snake.body) {
            const cell = gameManager.cells.getByCoordinate(segment.coordinate);
            const dropDistance = cell.distanceDropToPlatform(snake.simulatedFrame, snake.id);

            if (dropDistance < smallestDropDistance) {
                smallestDropDistance = dropDistance;
            }
        }

        if(smallestDropDistance == -1){ //snake fell off grid
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

    public simulateDamage(currentSnake: Snake): Snake {
        const snake = currentSnake.deepCopy();
        snake.body.pop();
        if (snake.body.length <= 2) {
            return null;
        }
        return snake.simulateFall(snake);
    }

    public iterateMovements(direction: directionEnum, currentSnake: Snake): Snake {
        const snake = currentSnake.deepCopy();
        const newBody: SnakeSegment[] = [];
        const newHeadCoordinate = snake.body[0].coordinate.getCoordinateInDirection(direction);
        newBody.push(new SnakeSegment(newHeadCoordinate));

        for (let i = 0; i < snake.body.length - 1; i++) {
            newBody.push(new SnakeSegment(snake.body[i].coordinate));
        }

        //if there is a energy cell where the new head is, add the last segment as well
        const energyCellEaten = gameManager.cells.powerCells().find(cell => cell.coordinate.equals(newHeadCoordinate));
        if(energyCellEaten){
            newBody.push(new SnakeSegment(snake.body[snake.body.length - 1].coordinate));
        }

        return new Snake(snake.id, snake.allegiance, newBody, true, snake.simulatedFrame);
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
}

class Cell {
    constructor(coordinate:Coordinate, cellObject:CellObject){
        this.coordinate = coordinate;
        this.cellObject = cellObject;
    }
    public coordinate: Coordinate;
    public cellObject: CellObject;

    public distanceDropToPlatform(futureFrames: number = 0, ignoredSnakeId: number | null = null):number {
        //iterate down through cells until we reach a platform, return that distance
        let distance = 0;
        let currentCell: Cell = gameManager.cells.getByCoordinate(this.coordinate.getCoordinateInDirection(directionEnum.down));
        while (
            currentCell.cellObject != CellObject.platform &&
            currentCell.cellObject != CellObject.energyCell &&
            !gameManager.snakes.willThereBeASegmentHereInFrames(currentCell.coordinate, futureFrames, ignoredSnakeId)
        ) {
            if(currentCell.cellObject == CellObject.offGrid && currentCell.coordinate.y > 0){
                tempDebug(`cell ${currentCell.coordinate} explored falling off grid`);
                return -1
            }
            currentCell = gameManager.cells.getByCoordinate(new Coordinate(currentCell.coordinate.x, currentCell.coordinate.y+1));
            distance++;
        }
        return distance;
    }
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

    public platforms(): Cell[] {
        return this.collection.filter((cell) => cell.cellObject == CellObject.platform);
    }

    // public shortestPathBetweenCellsWithoutInterference(startCell: Cell, endCell: Cell): Coordinate[] {
    //     var shortestPath: Coordinate[] = [];
    //     //this is a recursive path finding function
    //     //baseCase
    //     if (startCell.coordinate.equals(endCell.coordinate)) {
    //         return shortestPath;
    //     }
    //     //if the end cell is in an adjacent coordinate to a coordinate in the list
    //
    // }

}

/**
 * ============================================================================
 * Simulation
 * ============================================================================
 */
class Simulator {
    public findFloodFillMoveToEnergyCell(snake: Snake, maxExploredStates: number = 100): directionEnum | null {
        return snake.findFloodFillMoveToEnergyCell(maxExploredStates);
    }

    public positionsICanMoveTo(snake: Snake): { direction: directionEnum, snake: Snake }[] {
        return snake.positionsICanMoveTo();
    }
}

/**
 * ============================================================================
 * Strategy
 * ============================================================================
 */
class StrategyManager {
    constructor(private simulator: Simulator) {}

    public chooseDirection(snake: Snake, cells: Cells, snakeIdToDebug: number): directionEnum {
        const powerCells = cells.powerCells();
        if (powerCells.length === 0) {
            return directionEnum.up;
        }

        if (snake.id === snakeIdToDebug) {
            tempDebug(`snake ${snake.id} is being debugged`);
        }

        const floodFillDirection = this.simulator.findFloodFillMoveToEnergyCell(snake);
        if (floodFillDirection !== null) {
            return floodFillDirection;
        }

        const closestPowerCell: Coordinate = snake.head.closest(powerCells.map(pc => pc.coordinate));
        const currentDistance: number = snake.head.distance(closestPowerCell);

        const possibleMoves = this.simulator.positionsICanMoveTo(snake);
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
                throwWarning(`${snake.id} is makeing length preserving move - not great`);
                bestMove = lengthPreservingMoves[0];
            } else if (possibleMoves.length > 0) {
                throwWarning(`${snake.id} is making desperation move - AHHH`);
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

/**
 * ============================================================================
 * Application
 * ============================================================================
 */
class GameManager {
    public myId: number = -1;
    public width: number = 0;
    public height: number = 0;
    public cells: Cells = new Cells();
    public snakes: Snakes = new Snakes();
    public mySnakeBotIds: number[] = [];
    public snakeBotsPerPlayer: number = 0;
    public snakeIdToDebug: number = 6;
    public simulator: Simulator = new Simulator();
    public strategyManager: StrategyManager = new StrategyManager(this.simulator);

    public initialize() {
        this.myId = parseInt(readline());
        this.width = parseInt(readline());
        this.height = parseInt(readline());

        for (let y = 0; y < this.height; y++) {
            const row: string = readline();
            for (let x = 0; x < this.width; x++) {
                const cellObject = row[x] == '#' ? CellObject.platform : CellObject.empty;
                this.cells.collection.push(new Cell(new Coordinate(x, y), cellObject));
            }
        }

        this.snakeBotsPerPlayer = parseInt(readline());
        for (let i = 0; i < this.snakeBotsPerPlayer; i++) {
            const mySnakeBotId: number = parseInt(readline());
            this.mySnakeBotIds.push(mySnakeBotId);
        }
        for (let i = 0; i < this.snakeBotsPerPlayer; i++) {
            const oppSnakeBotId: number = parseInt(readline());
        }
    }

    public runGameLoop() {
        while (true) {
            var commandString: string = "";
            const powerSourceCount: number = parseInt(readline());
            this.cells.clearPowerCells();
            for (let i = 0; i < powerSourceCount; i++) {
                var inputs: string[] = readline().split(' ');
                const x: number = parseInt(inputs[0]);
                const y: number = parseInt(inputs[1]);
                this.cells.markPowerCell(new Coordinate(x, y));
            }

            const snakeBotCount: number = parseInt(readline());
            const mySnakes: Snake[] = [];
            for (let i = 0; i < snakeBotCount; i++) {
                var inputs: string[] = readline().split(' ');
                const snakeBotId: number = parseInt(inputs[0]);
                const body: string = inputs[1];
                const allegiance: Allegiance = this.mySnakeBotIds.includes(snakeBotId) ? Allegiance.mine : Allegiance.enemy1;
                const snake: Snake = new Snake(snakeBotId, allegiance, parseSnakeBody(body));
                this.snakes.upsert(snake);
                if (allegiance === Allegiance.mine) {
                    mySnakes.push(this.snakes.collection.find(s => s.id === snakeBotId)!); //todo:J this is stupid we should just pull this from snakes.mine or whatever
                }
            }


            mySnakes.forEach((snake) => {
                const chosenDirection = this.strategyManager.chooseDirection(snake, this.cells, this.snakeIdToDebug);
                snake.currentDirection = chosenDirection;
                commandString += `${snake.id} ${DIRECTION_LABELS[chosenDirection]};`;
            });
            console.log(commandString);

            
        }
    }
}

const gameManager: GameManager = new GameManager();
gameManager.initialize();
gameManager.runGameLoop();
