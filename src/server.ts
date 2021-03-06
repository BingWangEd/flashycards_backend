import { Map } from 'immutable';
import MatchCardSession from "./class/MatchCardSession";
import { RoomState, ICardAction, ClientActionType } from './class/CardSession';
import FreeCardSession, { ICardLayoutRules } from './class/FreeCardSession';
import * as http from 'http';
import socketIO from 'socket.io';
import dotenv from 'dotenv';

const ENV = process.env.NODE_ENV || 'development'

if (ENV === 'development') dotenv.config();

export enum WebSocketEvent {
  CreateRoom = 'create room',
  EnterRoom = 'enter room',
  SubmitName = 'submit name',
  SetWords = 'set words',
  ConfirmCardsLayout = 'confirm cards layout',
  SendAction = 'send action',
}

enum WebSocketEmissionEvent {
  Connect = 'connected to web socket',
  GetNewMember = 'got new member',
  ConfirmRoom = 'confirmed room exists',
  RejectRoom = 'rejected room exists',
  JoinRoom = 'joined room',
  ChangeName = 'need to change name',
  MismatchGameMode = 'mismatched game mode',
  CreateNewRoom = 'created new room',
  ReadyToSetLayout = 'ready to set layout',
  StartGame = 'started game',
  UpdateGameState = 'update gaem state',
  LeftRoom = 'member left room',
}

export enum Mode {
  Free = 'free',
  Game = 'game',
}

const PORT = process.env.PORT;
console.log(`Port: ${PORT}`);

let CurrentRooms = Map<string, MatchCardSession | FreeCardSession>();

const RoomNames = ['APPLE', 'WATERMELON', 'ORANGE', 'STRAWBERRY', 'GRAPE', 'BLUEBERRY', 'LYCHEE', 'PEAR', 'BANANA', 'TANGERINE'];

const server = http.createServer();
const io = socketIO(server, {
  /**
   * override the default pingTimeout on your server to a large value.
   * There is a change for the default pingTimeout from 60000
   * (v2.0.4) to 5000 (v2.1.0+) which is not enough for some browsers like Chrome
   * */
  pingTimeout: 30000,
});

io.on('connection', (client: SocketIO.Socket) => {
  console.log(`User joined: ${client.id}`);
  const printClientAllInfo = () => Object.keys(io.sockets).forEach((key) => console.log(key));
  
  client.emit(WebSocketEmissionEvent.Connect);

  client.on('disconnecting', () => {
    console.log(`User disconnecting: ${client.id}`);
    const clientRoom = Object.keys(client.rooms)[1];
    const room = CurrentRooms.get(clientRoom);
    if (!room) return;

    const member = room.members.get(client.id);
    const actions = room.removeMember(client.id);
    if (room.members.size === 0) {
      CurrentRooms = CurrentRooms.delete(clientRoom);
    } else {
      io.to(clientRoom).emit(WebSocketEmissionEvent.LeftRoom, {
        name: member ? member.name : '',
        actions,
      });
    }
  });

  client.on('error', (error) => {
    console.log(error);
  });

  client.on(WebSocketEvent.CreateRoom, ({ mode }: { mode: Mode}) => {
    let selectedRoom = null;

    // TODO: create a system to ensure infinite number of rooms can be created
    RoomNames.some((name) => {
      if (!CurrentRooms.has(name)) {
        selectedRoom = name;
        return true;
      }
    })

    if (selectedRoom) {
      client.join(selectedRoom);
      CurrentRooms = CurrentRooms.set(selectedRoom, mode === Mode.Game ? new MatchCardSession(1, 8) : new FreeCardSession(1, 8));
      client.emit(WebSocketEmissionEvent.CreateNewRoom, { roomCode: selectedRoom });
    }
  });

  client.on(WebSocketEvent.EnterRoom, ({roomCode, gameMode}) => {
    const room = CurrentRooms.get(roomCode);
    if (io.sockets.adapter.rooms[roomCode] && room && room.roomState === RoomState.Open)
    {
      if ((gameMode === Mode.Free && !(room instanceof FreeCardSession)) || (gameMode === Mode.Game && !(room instanceof MatchCardSession))) {
        client.emit(WebSocketEmissionEvent.MismatchGameMode, { roomCode, gameMode });
      } else {
        client.emit(WebSocketEmissionEvent.ConfirmRoom, { roomCode });
      }
    } else {
      client.emit(WebSocketEmissionEvent.RejectRoom, { roomCode });
    }
  });

  client.on(WebSocketEvent.SubmitName, ({ playerName, roomCode, playerRole }: { playerName: string, roomCode: string, playerRole: string }) => {
    const room  = CurrentRooms.get(roomCode);
    if (io.sockets.adapter.rooms[roomCode] && room && room.roomState === RoomState.Open)
    {
      client.join(roomCode);
      if (room.checkNameExists(playerName)) {
        client.emit(WebSocketEmissionEvent.ChangeName, { playerName });
        return;
      }
      const actions = room.addMember(client.id, playerName, playerRole);

      if (actions === undefined) return; // don't send out signal
      client.emit(WebSocketEmissionEvent.JoinRoom, { playerName });

      io.to(roomCode).emit(WebSocketEmissionEvent.GetNewMember, {
        roomCode,
        actions,
      });
    } else {
      client.emit(WebSocketEmissionEvent.RejectRoom, { roomCode });
    }
  });

  client.on(WebSocketEvent.SetWords, ({ words, roomCode }: { words: [string, string][], roomCode: string }) => {
    const room = CurrentRooms.get(roomCode);
    if (!io.sockets.adapter.rooms[roomCode] || !room) throw Error(`${roomCode} does not exist`);
    
    if (room) {
      const gameSetup = room.createNewGame(words);

      if (room instanceof MatchCardSession) {
        room.roomState = RoomState.Locked;
        io.to(roomCode).emit(WebSocketEmissionEvent.StartGame, gameSetup);
      } else {
        io.to(roomCode).emit(WebSocketEmissionEvent.ReadyToSetLayout);
      }
    }
  });

  client.on(WebSocketEvent.SendAction, (action: ICardAction<ClientActionType>) => {
    // TODO: always send some response back
    const room = CurrentRooms.get(action.roomCode);

    if (!io.sockets.adapter.rooms[action.roomCode] || !room) return; // TODO: error handling
    
    // TODO: automate the process. let implementGameAction takes care of all??
    switch (action.type) {
      case ClientActionType.Open: {
        const flipCardAction = room.openCard(action as ICardAction<ClientActionType.Open>);
        client.to(action.roomCode).emit(WebSocketEmissionEvent.UpdateGameState, flipCardAction);
        break;
      }
      case ClientActionType.Move: {
        if (!(room instanceof FreeCardSession)) return;
        const moveCardAction = room.moveCard(action as ICardAction<ClientActionType.Move>);
        client.to(action.roomCode).emit(WebSocketEmissionEvent.UpdateGameState, moveCardAction);
        break;
      }
      case ClientActionType.Drop: {
        if (!(room instanceof FreeCardSession)) return;
        const dropCardAction = room.dropCard(action as ICardAction<ClientActionType.Drop>);
        client.to(action.roomCode).emit(WebSocketEmissionEvent.UpdateGameState, dropCardAction);
        break;
      }
    }

    const actions = room.implementGameAction(action);
    actions && io.to(action.roomCode).emit(WebSocketEmissionEvent.UpdateGameState, actions);
  });

  client.on(WebSocketEvent.ConfirmCardsLayout, ({ roomCode, layoutRules, groupWordsBySet }: {
    words: [string, string][];
    layoutRules: ICardLayoutRules[];
    roomCode: string;
    groupWordsBySet: boolean;
  }) => {
    const room = CurrentRooms.get(roomCode);
    if (!io.sockets.adapter.rooms[roomCode] || !room) throw Error(`${roomCode} does not exist`); // TODO: more elegant error handling 

    if (!(room instanceof FreeCardSession)) throw Error(`Expecting ${roomCode} to be a FreeCardGame room, but it's a ${room.constructor.name} room`);

    const gameSetup = room.createInitialCardStates(layoutRules, groupWordsBySet);
    io.to(roomCode).emit(WebSocketEmissionEvent.StartGame, gameSetup);
    room.roomState = RoomState.Locked;
  });
});

server.listen(PORT, () => {
  console.log(`listening on port ${PORT}`);
});
