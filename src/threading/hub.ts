import MatrixClient from "../client/client";

const serverWorker = new Worker("./server-worker.ts");
const client: MatrixClient = new MatrixClient(
  (toLoads) => {
    serverWorker.postMessage(["loadChunks", toLoads]);
  },
  (toUnloads) => {
    serverWorker.postMessage(["unloadChunks", toUnloads]);
  },
);

onmessage = (e) => {
  const msg = e.data;
  switch (msg[0]) {
    case "blockNamesEstablished":
      client.blockNamesEstablished(msg[1]);
      break;
    case "chunkDataUpdate":
      client.sendChunkData(msg[1], msg[2]);
      break;
  }
};
