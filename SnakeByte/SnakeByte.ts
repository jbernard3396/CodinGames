// noinspection DuplicatedCode

/**
Helpers
 */
function debug(message: string) {
    console.error('DEBUG: ' + message);
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
            new Coordinate(this.x + 1, this.y),
            new Coordinate(this.x - 1, this.y),
            new Coordinate(this.x, this.y + 1),
            new Coordinate(this.x, this.y - 1)
        ];
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
    constructor(id:number, allegiance:Allegiance, body:SnakeSegment[]){
        this.id = id;
        this.allegiance = allegiance;
        this.body = body;
    }
    public id: number;
    public allegiance: Allegiance;
    public body: SnakeSegment[];
    public get head(): Coordinate {
        return this.body[0].coordinate;
    }


    public update(snake: Snake) {
        this.allegiance = snake.allegiance;
        this.body = snake.body;
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
            const powerSourceCount: number = parseInt(readline());
            this.cells.clearPowerCells();
            for (let i = 0; i < powerSourceCount; i++) {
                var inputs: string[] = readline().split(' ');
                const x: number = parseInt(inputs[0]);
                const y: number = parseInt(inputs[1]);
                this.cells.markPowerCell(new Coordinate(x, y));
            }

            const snakeBotCount: number = parseInt(readline());
            for (let i = 0; i < snakeBotCount; i++) {
                var inputs: string[] = readline().split(' ');
                const snakeBotId: number = parseInt(inputs[0]);
                const body: string = inputs[1];
                const allegiance: Allegiance = this.mySnakeBotIds.includes(snakeBotId) ? Allegiance.mine : Allegiance.enemy1;
                const snake: Snake = new Snake(snakeBotId, allegiance, parseSnakeBody(body));
                this.snakes.upsert(snake);
            }

            console.log('WAIT');
        }
    }
}

const gameManager: GameManager = new GameManager();
gameManager.initialize();
gameManager.runGameLoop();
