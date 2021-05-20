# Matrix 3

## Network Structure Overview
(World ⭤ )Server ⭤  Client( ⭤ [GridDisplay,])

A `World` instance handles the entire simulation—block updates, lighting, temperature, etc.

A `MatrixServer` contains and runs the **World** instance. 
It also sends information about the state of the **World** to connected **MatrixClients**.
It also receives input information from **MatrixClients** and forwards it to the **World** instance.

A `MatrixClient` contains one or more **GridDisplay**(s).
It receives information about from a **MatrixServer** about a **World**, and forwards it to its **GridDisplays**.
It also handles client input information and sends it to the **MatrixServer**.
It also asks the **MatrixServer** to keep certain chunks loaded.

A `GridDisplay` is spawned from a **MatrixClient**, and displays information about a **World**.

