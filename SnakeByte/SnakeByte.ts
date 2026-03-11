// noinspection DuplicatedCode

/**
Helpers
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
 * Enums
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
    constructor(id: number, allegiance: Allegiance, body: SnakeSegment[], isCopy: boolean = false) {
        this.id = id;
        this.allegiance = allegiance;
        this.body = body;
        this.isCopy = isCopy;
    }
    public id: number;
    public allegiance: Allegiance;
    public body: SnakeSegment[];
    public isCopy: boolean;
    public currentDirection: directionEnum = directionEnum.up;
    public get head(): Coordinate {
        return this.body[0].coordinate;
    }


    public update(snake: Snake) {
        this.allegiance = snake.allegiance;
        this.body = snake.body;
        this.isCopy = snake.isCopy;
    }

    public deepCopy(): Snake {
        if (this.isCopy) {
            return this;
        }
        const newBody = this.body.map(segment => new SnakeSegment(new Coordinate(segment.coordinate.x, segment.coordinate.y)));
        const copy = new Snake(this.id, this.allegiance, newBody, true);
        copy.currentDirection = this.currentDirection;
        return copy;
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

    //todo:J super afraid of editing the snakes in place, lets make sure these are deep copies or whatever
    //todo:J this should be somewhere else? maybe a static game simulator?
    public simulateMove(direction: directionEnum, currentSnake: Snake): Snake | null {
        const snake = currentSnake.deepCopy();
        //There are a few cases we need to handle
        // first: if the cell above has my second segment, this is illegal, return null
        if (snake.head.getCoordinateInDirection(direction).equals(snake.body[1].coordinate)) {
            return null;
        }
        //second: if the cell above has a platform I will die and not move
        const cellAbove = gameManager.cells.getMaybeByCoordinate(snake.head.getCoordinateInDirection(direction));
        if (cellAbove && cellAbove.cellObject == CellObject.platform) {
            return snake.simulateDamage(snake);
        }
        //iterate movements and then simulate fall and return
        const movedSnake = snake.iterateMovements(direction, snake);
        return movedSnake.simulateFall(movedSnake);
    }

    public simulateFall(currentSnake: Snake): Snake { //todo:J fill out
        const snake = currentSnake.deepCopy();
        return snake;
    }

    public simulateDamage(currentSnake: Snake): Snake {
        const snake = currentSnake.deepCopy();
        //remove the last segment from the snake and then simulate a fall
        //todo:J if I have three segments, die instead
        snake.body.pop();
        return snake.simulateFall(snake);
    }

    //todo:J holy cow what is THIS function called
    public iterateMovements(direction: directionEnum, currentSnake: Snake): Snake {
        const snake = currentSnake.deepCopy();
        const newBody: SnakeSegment[] = [];
        const newHeadCoordinate = snake.body[0].coordinate.getCoordinateInDirection(direction);
        newBody.push(new SnakeSegment(newHeadCoordinate));

        for (let i = 0; i < snake.body.length - 1; i++) {
            newBody.push(new SnakeSegment(snake.body[i].coordinate));
        }

        return new Snake(snake.id, snake.allegiance, newBody, true);
    }

    public lowestSegmentIndexOverCellObjects(cells: Cells, cellObjects: CellObject[] = [CellObject.platform]): number | null {
        for (let i = 0; i < this.body.length; i++) {
            const segment = this.body[i];
            const lowerCoordinate = new Coordinate(segment.coordinate.x, segment.coordinate.y-1);
            const lowerCell = cells.getByCoordinate(lowerCoordinate);
            if (!lowerCell) {
                continue; //off grid
            }
            if (cellObjects.includes(lowerCell.cellObject)) {
                return i;
            }
        }
        return null;
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
}

class Cell {
    constructor(coordinate:Coordinate, cellObject:CellObject){
        this.coordinate = coordinate;
        this.cellObject = cellObject;
    }
    public coordinate: Coordinate;
    public cellObject: CellObject;

    public distanceDropToPlatform():number {
        //iterate down through cells until we reach a platform, return that distance
        let distance = 0;
        let currentCell: Cell = this;
        while(currentCell.cellObject != CellObject.platform) {
            currentCell = gameManager.cells.getByCoordinate(new Coordinate(currentCell.coordinate.x, currentCell.coordinate.y-1));
            distance++;
        }
        return distance;
    }

    public reachableBySnakeOfLength(length:number):boolean {
        //for now return true if the drop to platform distance is less than the snake length
        return this.distanceDropToPlatform() <= length;  //todo:J off by one??
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
        const cell = this.getMaybeByCoordinate(coordinate);
        if (!cell) {
            throw new Error(`No cell exists at ${coordinate.print()}`);
        }
        return cell;
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

class GameManager {
    public myId: number = -1;
    public width: number = 0;
    public height: number = 0;
    public cells: Cells = new Cells();
    public snakes: Snakes = new Snakes();
    public mySnakeBotIds: number[] = [];
    public snakeBotsPerPlayer: number = 0;

    public initialize() {
        this.myId = parseInt(readline());
        this.width = parseInt(readline());
        this.height = parseInt(readline());

        for (let y = 0; y < this.height; y++) { //todo:J we actually need a bunch more cells to properly handle going off grid.
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


            const directions = ['UP', 'DOWN', 'LEFT', 'RIGHT']; //todo:J  move this to a proper place


            mySnakes.forEach((snake) => { //todo:J move this to a strategy manager?
                // if (snake.id != 1){
                //     return;
                // }
                const powerCells = this.cells.powerCells();
                if (powerCells.length === 0) {
                    commandString += `${snake.id} UP;`
                    return;
                }

                const closestPowerCell:Coordinate = snake.head.closest(powerCells.map(pc => pc.coordinate));
                // tempDebug(`closest power cell to snake ${snake.id}: ${closestPowerCell.print()}`)
                const currentDistance:number = snake.head.distance(closestPowerCell);
                // tempDebug(`distance: ${currentDistance.toString()}`)

                const possibleMoves = snake.positionsICanMoveTo();
                
                let bestMove: { direction: directionEnum, snake: Snake } | null = null;
                let minDistance = currentDistance;

                // 1. Try to find a move that gets us closer
                for (const move of possibleMoves) {
                    tempDebug(`checking move ${move.direction} for snake ${snake.id}`)
                    tempDebug(`new head: ${move.snake.head.print()}`)
                    tempDebug(`closest power cell: ${closestPowerCell.print()}`)
                    tempDebug(`distance: ${move.snake.head.distance(closestPowerCell)}`)
                    const newDistance = move.snake.head.distance(closestPowerCell);
                    if (newDistance < minDistance) {
                        minDistance = newDistance;
                        bestMove = move;
                    }
                }
                // debug(bestMove?.snake.head.print())

                // 2. If no move is closer, pick a random move that preserves length
                if (!bestMove) {
                    const lengthPreservingMoves = possibleMoves.filter(m => m.snake.body.length === snake.body.length);
                    if (lengthPreservingMoves.length > 0) {
                        throwWarning(`${snake.id} is makeing length preserving move - not great`)
                        bestMove = lengthPreservingMoves[0];
                    } else if (possibleMoves.length > 0) {
                        // Desperation move
                        throwWarning(`${snake.id} is making desperation move - AHHH`)
                        bestMove = possibleMoves[0];
                    }
                }

                if (bestMove) {
                    snake.currentDirection = bestMove.direction;
                    commandString += `${snake.id} ${directions[bestMove.direction]};`;
                    return
                } else {
                    commandString += `${snake.id} UP;`
                    return
                }
            });
            console.log(commandString);

            
        }
    }
}

const gameManager: GameManager = new GameManager();
gameManager.initialize();
gameManager.runGameLoop();
