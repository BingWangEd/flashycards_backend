const http = require('http');
const socketIO = require('socket.io');

const PORT = 3030;

const CurrentRooms = [];

const RoomNames = ['Apple', 'Watermelon', 'Orange', 'Strawberry', 'Grape'];

const server = http.createServer();
const io = socketIO(server, {
  /**
   * override the default pingTimeout on your server to a large value.
   * There is a change for the default pingTimeout from 60000
   * (v2.0.4) to 5000 (v2.1.0+) which is not enough for some browsers like Chrome
   * */
  pingTimeout: 30000,
});

io.on('connection', (client) => {
  const printClientAllInfo = () => Object.keys(io.sockets).forEach((key) => console.log(key));
  
  client.on('disconnect', () => {
    console.log(`User disconnected: ${client.id}`);
  });

  client.on('error', (error) => {
    console.log(error);
  });

  client.on('Enter Room', (room) => {
    console.log('room: ', room);
    client.join(room);
    io.to(room).emit('new member');

    console.log('all rooms', io.sockets.adapter.rooms);

    CurrentRooms.push(room);
  });

  client.on('Create Room', () => {
    let selectedRoom = null;
    RoomNames.some((name) => {
      if (!CurrentRooms.includes(name)) {
        selectedRoom = name;
        return true;
      }
    })

    client.join(selectedRoom);
    CurrentRooms.push(selectedRoom);
    client.emit(`joined room`, { room: selectedRoom });
    io.to(selectedRoom).emit('new member');

    // console.log('all rooms', io.sockets.adapter.rooms);
  });
});

server.listen(PORT, (error) => {
  if (error) throw error;
  console.log(`listening on port ${PORT}`);
});
