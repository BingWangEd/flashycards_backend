// import GameRoom, { ClientActionType } from "./class/Room";

// const http = require('http');

// const PORT = process.env.PORT;
// console.log(`Port: ${PORT}`);
// const server = http.createServer();
// server.listen(PORT, (error: Error) => {
//   if (error) throw error;
//   console.log(`listening on port ${PORT}`);

//   const gameRoom = new GameRoom(1);
//   gameRoom.addMember('a01', 'bee', 'teacher');
//   gameRoom.addMember('b02', 'bing', 'student');
//   gameRoom.createNewGame([['apple', 'リンゴ'], ['pear', '桃'], ['strawberry', 'イチゴ'], ['banana', 'バナナ']]);

//   const printGameStates = () => {
//     console.log('cards: ', gameRoom.shuffledWords.forEach((word, i) => console.log(`${i}: ${word.word}`)));

//     console.log('card states: ', gameRoom.cardStates.forEach((state, i) => console.log(`${i}: isActive - ${state.isActive}; isOpen - ${state.isOpen}`)));
//     console.log(`Game score: `, gameRoom.scores);
//     console.log('current player: ', gameRoom.currentPlayer);
//   }

//   const result1 = gameRoom.implementGameAction({
//     type: ClientActionType.Open,
//     position: 0,
//     player: 'bee',
//     roomCode: 'aaa',
//   })
//   console.log('result1: ', result1);
//   // printGameStates();

//   const result2 = gameRoom.implementGameAction({
//     type: ClientActionType.Open,
//     position: 5,
//     player: 'bee',
//     roomCode: 'aaa',
//   })
//   console.log('result2: ', result2);
//   // printGameStates();

//   const result3 = gameRoom.implementGameAction({
//     type: ClientActionType.Open,
//     position: 1,
//     player: 'bing',
//     roomCode: 'aaa',
//   })
//   console.log('result3: ', result3);
//   // printGameStates();

//   const result4 = gameRoom.implementGameAction({
//     type: ClientActionType.Open,
//     position: 3,
//     player: 'bing',
//     roomCode: 'aaa',
//   })
//   console.log('result4: ', result4);
//   // printGameStates();

//   const result5 = gameRoom.implementGameAction({
//     type: ClientActionType.Open,
//     position: 0,
//     player: 'bee',
//     roomCode: 'aaa',
//   })
//   console.log('result5: ', result5);
//   printGameStates();

//   const result6 = gameRoom.implementGameAction({
//     type: ClientActionType.Open,
//     position: 5,
//     player: 'bee',
//     roomCode: 'aaa',
//   })
//   console.log('result6: ', result6);
//   printGameStates();
// });

