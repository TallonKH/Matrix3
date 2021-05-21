import MatrixServer from "../server/server";
import { standardBlockTypes } from "../standard/block-types";
import { CheckerGen } from "../standard/terrain-generator";

const server: MatrixServer = new MatrixServer(
  (coord, chunkData) => {
    postMessage(["chunkDataUpdate", coord, chunkData]);
  },
  standardBlockTypes,
  (world) => new CheckerGen(world),
);
postMessage(["blockNamesEstablished", standardBlockTypes.map((t) => t.name)]);

onmessage = (e) => {
  const msg = e.data;

  switch (msg[0]) {
    case "loadChunks":
      server.requestChunkLoads(msg[1]);
      break;
    case "unloadChunks":
      server.requestChunkLoads(msg[1]);
      break;
  }
};