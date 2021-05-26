import MatrixClient from "../client/client";
import { pixelCircle } from "../library";
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
window.setInterval(() => server.performGlobalTick(), ~~(1000 / 30));
// window.setTimeout(() => server.performGlobalTick(), 500);

let leftKeyDown = false;
let rightKeyDown = false;
let upKeyDown = false;
let downKeyDown = false;
let shiftKeyDown = false;

let panSpeed = -10;
let drawRadius = 3;
let drawType1 = 1;
let drawType2 = 2;

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
      drawRadius = 1;
      break;
    case "1":
      drawRadius = 2;
      break;
    case "2":
      drawRadius = 3;
      break;
    case "3":
      drawRadius = 5;
      break;
    case "4":
      drawRadius = 10;
      break;
    case "5":
      drawRadius = 15;
      break;
    case "6":
      drawRadius = 20;
      break;
    case "7":
      drawRadius = 25;
      break;
    case "8":
      drawRadius = 35;
      break;
    case "9":
      drawRadius = 50;
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
  if (shiftKeyDown) {
    panSpeed = -100;
  } else {
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

mainDisplay.canvas.addEventListener("mousemove", (e) => {
  if (mouse1Down || mouse2Down) {
    const pos = mainDisplay.offsetPosToBlockPos(e.offsetX, e.offsetY);
    if (pos !== null) {
      pixelCircle(pos.x, pos.y, drawRadius,
        (x, y) => server.forwardSetBlockRequests([[x, y,
          (mouse1Down && mouse2Down)
            ? (Math.random() > 0.5 ? drawType1 : drawType2)
            : (mouse1Down ? drawType1 : drawType2)
        ]])
      );
    }
  }
});

const toolbarContainer = document.getElementById("toolbar");
if (toolbarContainer === null) {
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
  toolbarContainer.appendChild(button);
}