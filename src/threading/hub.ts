import MatrixClient from "../client/client";
import { pixelCircle } from "../library";
import MatrixServer from "../server/server";
import { standardBlockShaders } from "../standard/standard-shaders";
import { standardBlockTypes } from "../standard/standard-types";
import { CheckerGen } from "../standard/standard-terrain-gen";
import { NPoint } from "../lib/NLib/npoint";
import BlockType from "../simulation/matrix-blocktype";

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
    // case "=":
    //   mainDisplay.setPixelsPerBlock(mainDisplay.getPixelsPerBlock() + 1);
    //   break;
    // case "-":
    //   mainDisplay.setPixelsPerBlock(mainDisplay.getPixelsPerBlock() - 1);
    //   break;

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

const toolbarOuter = document.getElementById("toolbar-outer");
if (toolbarOuter === null) {
  throw "no outer toolbar";
}

const toolbarInner = document.getElementById("toolbar-inner");
if (toolbarInner === null) {
  throw "no inner toolbar";
}

const blocktypeContainer = document.getElementById("block-type-list");
if (blocktypeContainer === null) {
  throw "no container";
}


let mouse1Down = false;
let mouse2Down = false;
mainDisplay.canvas.addEventListener("mousedown", (e) => {
  switch (e.button) {
    case 0:
      mouse1Down = true;
      toolbarOuter.classList.add("muted");
      break;
    case 2:
      mouse2Down = true;
      toolbarOuter.classList.add("muted");
      break;
  }
  drawFunc(e);
});
document.addEventListener("mouseup", (e) => {
  switch (e.button) {
    case 0:
      mouse1Down = false;
      if (!mouse2Down) {
        toolbarOuter.classList.remove("muted");
      }
      break;
    case 2:
      mouse2Down = false;
      if (!mouse1Down) {
        toolbarOuter.classList.remove("muted");
      }
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

const buttons: Array<[BlockType, HTMLElement]> = [];
for (let i = 0; i < standardBlockTypes.length; i++) {
  const btype = standardBlockTypes[i];
  const button = document.createElement("div");
  buttons.push([btype, button]);
  button.classList.add("block-type-button");
  button.style.backgroundColor = btype.color.toHex();
  button.innerHTML = btype.name;
  button.addEventListener("mouseup", (e) => {
    if (e.button === 0) {
      for (const [_, other] of buttons) {
        other.classList.remove("selected-primary");
      }
      button.classList.add("selected-primary");
      drawType1 = i + 1;
    } else if (e.button === 2) {
      for (const [_, other] of buttons) {
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

buttons.sort(([a, _], [b, __]) => {
  const aHSL = a.color.toHSL();
  const bHSL = b.color.toHSL();
  const h = aHSL[0] - bHSL[0];
  const s = aHSL[1] - bHSL[1];
  const l = aHSL[2] - bHSL[2];
  return Math.round(h * 7) || s || l;
});

for (const [_, button] of buttons) {
  blocktypeContainer.appendChild(button);
}

mainDisplay.setViewOrigin(new NPoint(0, 640));

// window.setTimeout(() => server.performGlobalLightTick(), 400);

window.setInterval(() => {
  server.performGlobalTick();
  server.performGlobalLightTick();
  let newViewOrigin = mainDisplay.getViewOrigin();
  if (leftKeyDown) {
    newViewOrigin = newViewOrigin.add2(-panSpeed, 0);
  }
  if (rightKeyDown) {
    newViewOrigin = newViewOrigin.add2(panSpeed, 0);
  }
  if (upKeyDown) {
    newViewOrigin = newViewOrigin.add2(0, -panSpeed);
  }
  if (downKeyDown) {
    newViewOrigin = newViewOrigin.add2(0, panSpeed);
  }
  if (!newViewOrigin.equals(mainDisplay.getViewOrigin())) {
    mainDisplay.setViewOrigin(newViewOrigin);
  }
}, ~~(1000 / 30));