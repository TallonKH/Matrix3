import MatrixClient from "../client/client";
import MatrixServer from "../server/server";
import { standardBlockShaders } from "../standard/block-shaders";
import { standardBlockTypes } from "../standard/block-types";
import { CheckerGen } from "../standard/terrain-generator";

const parts: [MatrixServer | null, MatrixClient | null] = [null, null];

const server: MatrixServer = new MatrixServer(
  (coord, chunkData) => {
    parts[1]?.sendChunkData(coord, chunkData);
  },
  standardBlockTypes,
  (world) => new CheckerGen(world)
);
parts[0] = server;

const client: MatrixClient = new MatrixClient(
  (toLoads) => {
    server.requestChunkLoads(toLoads);
  },
  (toUnloads) => {
    server.requestChunkUnloads(toUnloads);
  },
);
parts[1] = client;

client.sendBlockNames(standardBlockTypes.map((t) => t.name));

const mainDisplay = client.createDisplay();
for (const [name, shader] of standardBlockShaders) {
  mainDisplay.registerBlockShader(name, shader);
}

const container = document.getElementById("inner-container");
if (container === null) {
  throw "no container";
}
mainDisplay.canvas.style.height = "100%";
mainDisplay.canvas.style.width = "100%";
mainDisplay.canvas.style.border = "2px solid black";
// mainDisplay.canvas.style.background = "linear-gradient(0deg, #0F0 0%, #040 100%)";
container.appendChild(mainDisplay.canvas);

mainDisplay.startDrawLoop();
server.performGlobalTick();
window.setInterval(() => server.performGlobalTick(), ~~(1000 / 30));
// window.setTimeout(() => server.performGlobalTick(), 500);

let leftKeyDown = false;
let rightKeyDown = false;
let upKeyDown = false;
let downKeyDown = false;
let shiftKeyDown = false;

let panSpeed = -10;

document.addEventListener("keydown", (e) => {
  switch (e.key) {
    case "ArrowLeft":
      leftKeyDown = true;
      break;
    case "ArrowRight":
      rightKeyDown = true;
      break;
    case "ArrowUp":
      upKeyDown = true;
      break;
    case "ArrowDown":
      downKeyDown = true;
      break;
    case "Shift":
      shiftKeyDown = true;
      break;
  }
});

document.addEventListener("keyup", (e) => {
  switch (e.key) {
    case "ArrowLeft":
      leftKeyDown = false;
      break;
    case "ArrowRight":
      rightKeyDown = false;
      break;
    case "ArrowUp":
      upKeyDown = false;
      break;
    case "ArrowDown":
      downKeyDown = false;
      break;
    case "Shift":
      shiftKeyDown = false;
      break;
  }
});

window.setInterval(() => {
  if(shiftKeyDown){
    panSpeed = -100;
  }else{
    panSpeed = -10;
  }
  if (leftKeyDown) {
    mainDisplay.setViewOrigin(mainDisplay.getViewOrigin().add2(-panSpeed, 0));
  }
  if (rightKeyDown) {
    mainDisplay.setViewOrigin(mainDisplay.getViewOrigin().add2(panSpeed, 0));
  }
  if (upKeyDown) {
    mainDisplay.setViewOrigin(mainDisplay.getViewOrigin().add2(0, -panSpeed));
  }
  if (downKeyDown) {
    mainDisplay.setViewOrigin(mainDisplay.getViewOrigin().add2(0, panSpeed));
  }
  // console.log(mainDisplay.getViewOrigin());
}, (1000 / 30));

//height: 171 blocks
// ~75 blocks y=~19200 = 256 | 300
// ~40 blocks y=~9980 = 249.5 | 155
// ~23 blocks y=~4880 = 212.1 | 76.25
// 0 blocks y=~ 0
// ~-19 blocks y=~ -3930 = 206
// ~-43 blocks y=~ -10580 = 246
// ~-78 blocks y=~ -19310 = 247