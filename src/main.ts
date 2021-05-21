
// const a = false;
// const container = document.getElementById("inner-container");
// if (container === null) {
//   throw "no container";
// }

// const mainDisplay = new GridDisplay();
// mainDisplay.canvas.style.height = "100%";
// mainDisplay.canvas.style.width = "100%";
// mainDisplay.canvas.style.border = "2px solid black";
// // mainDisplay.canvas.style.background = "linear-gradient(0deg, #0F0 0%, #040 100%)";
// container.appendChild(mainDisplay.canvas);
// mainDisplay.link(world);
// for (const shader of shaderData) {
//   mainDisplay.registerBlockShader(shader[0], shader[1]);
// }

// world.startTickLoop(30);

// mainDisplay.startDrawLoop();

// let leftKeyDown = false;
// let rightKeyDown = false;
// let upKeyDown = false;
// let downKeyDown = false;
// document.addEventListener("keydown", (e) => {
//   switch (e.key) {
//     case "ArrowLeft":
//       leftKeyDown = true;
//       break;
//     case "ArrowRight":
//       rightKeyDown = true;
//       break;
//     case "ArrowUp":
//       upKeyDown = true;
//       break;
//     case "ArrowDown":
//       downKeyDown = true;
//       break;
//   }
// });

// document.addEventListener("keyup", (e) => {
//   switch (e.key) {
//     case "ArrowLeft":
//       leftKeyDown = false;
//       break;
//     case "ArrowRight":
//       rightKeyDown = false;
//       break;
//     case "ArrowUp":
//       upKeyDown = false;
//       break;
//     case "ArrowDown":
//       downKeyDown = false;
//       break;
//   }
// });

// const panSpeed = -100;
// window.setInterval(() => {
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
// }, (1000 / 20));

// world.registerBlockType(bt_air);
// world.registerBlockType(bt_cobble);
// world.registerBlockType(bt_stone);
// world.registerBlockType(bt_water);