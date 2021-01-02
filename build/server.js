"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketEvent = void 0;
var Room_1 = __importStar(require("./src/class/Room"));
var immutable_1 = require("immutable");
var http = require('http');
var socketIO = require('socket.io');
var dotenv = require('dotenv');
var ENV = process.env.NODE_ENV || 'development';
if (ENV === 'development')
    dotenv.config();
var WebSocketEvent;
(function (WebSocketEvent) {
    WebSocketEvent["CreateRoom"] = "create room";
    WebSocketEvent["EnterRoom"] = "enter room";
    WebSocketEvent["SubmitName"] = "submit name";
    WebSocketEvent["SetWords"] = "set words";
    WebSocketEvent["SendAction"] = "send action";
})(WebSocketEvent = exports.WebSocketEvent || (exports.WebSocketEvent = {}));
var WebSocketEmissionEvent;
(function (WebSocketEmissionEvent) {
    WebSocketEmissionEvent["Connect"] = "connected to web socket";
    WebSocketEmissionEvent["GetNewMember"] = "got new member";
    WebSocketEmissionEvent["ConfirmRoom"] = "confirmed room exists";
    WebSocketEmissionEvent["RejectRoom"] = "rejected room exists";
    WebSocketEmissionEvent["JoinRoom"] = "joined room";
    WebSocketEmissionEvent["CreateNewRoom"] = "created new room";
    WebSocketEmissionEvent["StartGame"] = "started game";
    WebSocketEmissionEvent["ReceiveAction"] = "received action";
})(WebSocketEmissionEvent || (WebSocketEmissionEvent = {}));
var PORT = process.env.PORT;
console.log("Port: " + PORT);
var CurrentRooms = immutable_1.Map();
var RoomNames = ['Apple', 'Watermelon', 'Orange', 'Strawberry', 'Grape', 'Blueberry', 'Lychee', 'Pear', 'Banana', 'Tangerine'];
var server = http.createServer();
var io = socketIO(server, {
    /**
     * override the default pingTimeout on your server to a large value.
     * There is a change for the default pingTimeout from 60000
     * (v2.0.4) to 5000 (v2.1.0+) which is not enough for some browsers like Chrome
     * */
    pingTimeout: 30000,
});
io.on('connection', function (client) {
    console.log("User joined: " + client.id);
    var printClientAllInfo = function () { return Object.keys(io.sockets).forEach(function (key) { return console.log(key); }); };
    client.emit(WebSocketEmissionEvent.Connect);
    client.on('disconnect', function () {
        console.log("User disconnected: " + client.id);
    });
    client.on('error', function (error) {
        console.log(error);
    });
    client.on(WebSocketEvent.CreateRoom, function () {
        var selectedRoom = null;
        // TODO: create a system to ensure infinite number of rooms can be created
        RoomNames.some(function (name) {
            if (!CurrentRooms.has(name)) {
                selectedRoom = name;
                return true;
            }
        });
        if (selectedRoom) {
            client.join(selectedRoom);
            CurrentRooms = CurrentRooms.set(selectedRoom, new Room_1.default(1));
            client.emit(WebSocketEmissionEvent.CreateNewRoom, { roomCode: selectedRoom });
        }
    });
    client.on(WebSocketEvent.EnterRoom, function (_a) {
        var roomCode = _a.roomCode;
        var room = CurrentRooms.get(roomCode);
        if (io.sockets.adapter.rooms[roomCode] && room && room.roomState === Room_1.RoomState.Open) {
            client.emit(WebSocketEmissionEvent.ConfirmRoom, { roomCode: roomCode });
        }
        else {
            client.emit(WebSocketEmissionEvent.RejectRoom, { roomCode: roomCode });
        }
    });
    client.on(WebSocketEvent.SubmitName, function (_a) {
        var playerName = _a.playerName, roomCode = _a.roomCode, playerRole = _a.playerRole;
        var room = CurrentRooms.get(roomCode);
        if (io.sockets.adapter.rooms[roomCode] && room && room.roomState === Room_1.RoomState.Open) {
            client.join(roomCode);
            room.addMember(client.id, playerName, playerRole);
            client.emit(WebSocketEmissionEvent.JoinRoom, { playerName: playerName });
            var allMembers = room.getAllMemberNames();
            io.to(roomCode).emit(WebSocketEmissionEvent.GetNewMember, {
                roomCode: roomCode,
                allMembers: allMembers,
            });
        }
        else {
            client.emit(WebSocketEmissionEvent.RejectRoom, { roomCode: roomCode });
        }
        client.on(WebSocketEvent.SetWords, function (_a) {
            var words = _a.words, roomCode = _a.roomCode;
            var room = CurrentRooms.get(roomCode);
            if (room) {
                var _b = room.createNewGame(words), shuffledWords = _b.shuffledWords, cardStates = _b.cardStates;
                io.to(roomCode).emit(WebSocketEmissionEvent.StartGame, {
                    shuffledWords: shuffledWords,
                    cardStates: cardStates,
                });
            }
        });
    });
    client.on(WebSocketEvent.SendAction, function (action) {
        var room = CurrentRooms.get(action.roomCode);
        if (!io.sockets.adapter.rooms[action.roomCode] || !room)
            return; // TODO: error handling
        var actions = room.implementGameAction(action);
        io.to(action.roomCode).emit(WebSocketEmissionEvent.ReceiveAction, actions);
    });
});
server.listen(PORT, function (error) {
    if (error)
        throw error;
    console.log("listening on port " + PORT);
});
