import MatrixClient from "../client/client";
import { pixelCircle } from "../library";
import MatrixServer from "../server/server";
import { standardBlockShaders } from "../standard/standard-shaders";
import { standardBlockTypes } from "../standard/standard-types";
import { CheckerGen } from "../standard/standard-terrain-gen";
import { NPoint } from "../lib/NLib/npoint";

const parts: [MatrixServer | null, MatrixClient | null] = [null, null];

const server: MatrixServer = new MatrixServer(
  (coord, chunkData, lighting) => {
    parts[1]?.sendChunkData(coord, chunkData, lighting);
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

const displayContainer = document.getElementById("display");
if (displayContainer === null) {
  throw "no container";
}
mainDisplay.canvas.style.height = "100%";
mainDisplay.canvas.style.width = "100%";

// mainDisplay.canvas.style.background = "linear-gradient(0deg, #0F0 0%, #040 100%)";
displayContainer.appendChild(mainDisplay.canvas);

mainDisplay.startDrawLoop();
server.performGlobalTick();

window.setInterval(() => {
  server.performGlobalTick();
  // }
  server.performLightTick();
  server.performLightTick();
}, ~~(1000 / 20));
// window.setTimeout(() => server.performGlobalTick(), 500);

let leftKeyDown = false;
let rightKeyDown = false;
let upKeyDown = false;
let downKeyDown = false;
let shiftKeyDown = false;

const panSpeed = -64;
let drawRadius = 3;
let drawType1 = standardBlockTypes.findIndex((bt) => bt.name === "Dirt") + 1;
let drawType2 = standardBlockTypes.findIndex((bt) => bt.name === "Air") + 1;

document.addEventListener("keydown", (e) => {
  switch (e.key) {
    case "ArrowLeft":
      leftKeyDown = true;
      mainDisplay.setViewOrigin(mainDisplay.getViewOrigin().add2(-panSpeed, 0));
      break;
    case "ArrowRight":
      rightKeyDown = true;
      mainDisplay.setViewOrigin(mainDisplay.getViewOrigin().add2(panSpeed, 0));
      break;
    case "ArrowUp":
      upKeyDown = true;
      mainDisplay.setViewOrigin(mainDisplay.getViewOrigin().add2(0, -panSpeed));
      break;
    case "ArrowDown":
      downKeyDown = true;
      mainDisplay.setViewOrigin(mainDisplay.getViewOrigin().add2(0, panSpeed));
      break;
    case "Shift":
      shiftKeyDown = true;
      break;
    case "0":
      drawRadius = 0;
      break;
    case "1":
      drawRadius = 1;
      break;
    case "2":
      drawRadius = 3;
      break;
    case "3":
      drawRadius = 5;
      break;
    case "4":
      drawRadius = 7;
      break;
    case "5":
      drawRadius = 10;
      break;
    case "6":
      drawRadius = 15;
      break;
    case "7":
      drawRadius = 20;
      break;
    case "8":
      drawRadius = 30;
      break;
    case "9":
      drawRadius = 40;
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

// window.setInterval(() => {
//   if (shiftKeyDown) {
//     panSpeed = -100;
//   } else {
//     panSpeed = -10;
//   }
//   if (leftKeyDown) {
//     mainDisplay.setViewOrigin(mainDisplay.getViewOrigin().add2(-panSpeed, 0));
//   }
//   if (rightKeyDown) {
//     mainDisplay.setViewOrigin(mainDisplay.getViewOrigin().add2(panSpeed, 0));
//   }
//   if (upKeyDown) {
//     mainDisplay.setViewOrigin(mainDisplay.getViewOrigin().add2(0, -panSpeed));
//   }
//   if (downKeyDown) {
//     mainDisplay.setViewOrigin(mainDisplay.getViewOrigin().add2(0, panSpeed));
//   }
//   // console.log(mainDisplay.getViewOrigin());
// }, (1000 / 60));

let mouse1Down = false;
let mouse2Down = false;
mainDisplay.canvas.addEventListener("mousedown", (e) => {
  switch (e.button) {
    case 0:
      mouse1Down = true;
      break;
    case 2:
      mouse2Down = true;
      break;
  }
  drawFunc(e);
});
document.addEventListener("mouseup", (e) => {
  switch (e.button) {
    case 0:
      mouse1Down = false;
      break;
    case 2:
      mouse2Down = false;
      break;
  }
});

mainDisplay.canvas.oncontextmenu = (e) => {
  e.preventDefault();
  return false;
};

const drawFunc = (e: MouseEvent) => {
  if (mouse1Down || mouse2Down) {
    const pos = mainDisplay.offsetPosToBlockPos(e.offsetX, e.offsetY);
    const drawMat = (mouse1Down && mouse2Down)
      ? (Math.random() > 0.5 ? drawType1 : drawType2)
      : (mouse1Down ? drawType1 : drawType2);
    if (pos !== null) {
      const requests: Array<[number, number, number]> = [];
      switch (drawRadius) {
        case 0:
          requests.push([pos.x, pos.y, drawMat]);
          break;
        case 1:
          for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
              requests.push([pos.x + dx, pos.y + dy, drawMat]);
            }
          }
          break;
        default:
          pixelCircle(pos.x, pos.y, drawRadius, (x, y) => requests.push([x, y, drawMat]));
          break;
      }
      server.forwardSetBlockRequests(requests);
    }
  }
};

mainDisplay.canvas.addEventListener("mousemove", (e) => {
  drawFunc(e);
});

const blocktypeContainer = document.getElementById("block-type-list");
if (blocktypeContainer === null) {
  throw "no container";
}

const buttons: Array<HTMLElement> = [];
for (let i = 0; i < standardBlockTypes.length; i++) {
  const btype = standardBlockTypes[i];
  const button = document.createElement("div");
  buttons.push(button);
  button.classList.add("block-type-button");
  button.style.backgroundColor = btype.color.toHex();
  button.innerHTML = btype.name;
  button.addEventListener("mouseup", (e) => {
    if (e.button === 0) {
      for (const other of buttons) {
        other.classList.remove("selected-primary");
      }
      button.classList.add("selected-primary");
      drawType1 = i + 1;
    } else if (e.button === 2) {
      for (const other of buttons) {
        other.classList.remove("selected-secondary");
      }
      button.classList.add("selected-secondary");
      drawType2 = i + 1;
    }
  });
  if (drawType1 - 1 === i) {
    button.classList.add("selected-primary");
  }
  if (drawType2 - 1 === i) {
    button.classList.add("selected-secondary");
  }
  button.oncontextmenu = (e) => {
    e.preventDefault();
    return false;
  };
}

buttons.sort((a, b) => a.innerHTML.localeCompare(b.innerHTML));
for (const button of buttons) {
  blocktypeContainer.appendChild(button);
}

mainDisplay.setViewOrigin(new NPoint(0, 640));
