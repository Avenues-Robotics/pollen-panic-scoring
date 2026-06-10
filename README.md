# pollen-panic-scoring

## Run

```bash
npm install
npm run dev
```

Open the local URL shown in the terminal:

```text
http://localhost:3000
```

Other people on the same WiFi should open the LAN URL printed by the server, for example:

```text
http://192.168.x.x:3000
```

## Room Sync

Enter the same room number on every device and click `Join`. Everyone in that room shares the same score state. A different room number gets a separate score state.

The server keeps the latest state for each room in memory while `npm run dev` is running, so late-joining devices catch up right away. Restarting the server clears the room states.
