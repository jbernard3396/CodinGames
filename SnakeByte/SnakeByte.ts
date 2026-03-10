/*
Helpers
 */
function debug(message: string) {
    console.error('DEBUG: ' + message);
}

const myId: number = parseInt(readline());
const width: number = parseInt(readline());
const height: number = parseInt(readline());
for (let i = 0; i < height; i++) {
    const row: string = readline();
}
const snakebotsPerPlayer: number = parseInt(readline());
for (let i = 0; i < snakebotsPerPlayer; i++) {
    const mySnakebotId: number = parseInt(readline());
}
for (let i = 0; i < snakebotsPerPlayer; i++) {
    const oppSnakebotId: number = parseInt(readline());
}

// game loop
while (true) {
    const powerSourceCount: number = parseInt(readline());
    for (let i = 0; i < powerSourceCount; i++) {
        var inputs: string[] = readline().split(' ');
        const x: number = parseInt(inputs[0]);
        const y: number = parseInt(inputs[1]);
    }
    const snakebotCount: number = parseInt(readline());
    for (let i = 0; i < snakebotCount; i++) {
        var inputs: string[] = readline().split(' ');
        const snakebotId: number = parseInt(inputs[0]);
        const body: string = inputs[1];
    }


    console.log('WAIT');
}
