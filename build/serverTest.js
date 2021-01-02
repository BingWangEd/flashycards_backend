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
var Room_1 = __importStar(require("./src/class/Room"));
var http = require('http');
var PORT = process.env.PORT;
console.log("Port: " + PORT);
var server = http.createServer();
server.listen(PORT, function (error) {
    if (error)
        throw error;
    console.log("listening on port " + PORT);
    var gameRoom = new Room_1.default(1);
    gameRoom.addMember('a01', 'bee', 'teacher');
    gameRoom.addMember('b02', 'bing', 'student');
    gameRoom.createNewGame([['apple', 'リンゴ'], ['pear', '桃'], ['strawberry', 'イチゴ'], ['banana', 'バナナ']]);
    var printGameStates = function () {
        console.log('cards: ', gameRoom.shuffledWords.forEach(function (word, i) { return console.log(i + ": " + word.word); }));
        console.log('card states: ', gameRoom.cardStates.forEach(function (state, i) { return console.log(i + ": isActive - " + state.isActive + "; isOpen - " + state.isOpen); }));
        console.log("Game score: ", gameRoom.scores);
        console.log('current player: ', gameRoom.currentPlayer);
    };
    var result1 = gameRoom.implementGameAction({
        type: Room_1.ActionType.Open,
        position: 0,
        player: 'bee',
        roomCode: 'aaa',
    });
    console.log('result1: ', result1);
    // printGameStates();
    var result2 = gameRoom.implementGameAction({
        type: Room_1.ActionType.Open,
        position: 5,
        player: 'bee',
        roomCode: 'aaa',
    });
    console.log('result2: ', result2);
    // printGameStates();
    var result3 = gameRoom.implementGameAction({
        type: Room_1.ActionType.Open,
        position: 1,
        player: 'bing',
        roomCode: 'aaa',
    });
    console.log('result3: ', result3);
    // printGameStates();
    var result4 = gameRoom.implementGameAction({
        type: Room_1.ActionType.Open,
        position: 3,
        player: 'bing',
        roomCode: 'aaa',
    });
    console.log('result4: ', result4);
    // printGameStates();
    var result5 = gameRoom.implementGameAction({
        type: Room_1.ActionType.Open,
        position: 0,
        player: 'bee',
        roomCode: 'aaa',
    });
    console.log('result5: ', result5);
    // printGameStates();
    var result6 = gameRoom.implementGameAction({
        type: Room_1.ActionType.Open,
        position: 5,
        player: 'bee',
        roomCode: 'aaa',
    });
    console.log('result2: ', result);
    // printGameStates();
});
