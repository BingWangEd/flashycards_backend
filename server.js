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

  client.on('Enter Room', ({roomName}) => {
    console.log('Enter Room - all rooms', io.sockets.adapter.rooms);

    console.log('Enter Room - room: ', roomName);
    if (io.sockets.adapter.rooms[roomName])
    {
      client.join(roomName);
      io.to(roomName).emit('new member');
      //console.log('all rooms', io.sockets.adapter.rooms);
      console.log(`client entered room: ${roomName}`);
      CurrentRooms.push(roomName);
      client.emit(`joined room`, { room: roomName });
    } else {
      client.emit('room does not exist', { room: roomName });
    }
  });

  client.on('Create Room', () => {
    let selectedRoom = null;

    // TODO: create a system to ensure infinite number of rooms can be created
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

    console.log('Create Room - all rooms', io.sockets.adapter.rooms);
  });
});

server.listen(PORT, (error) => {
  if (error) throw error;
  console.log(`listening on port ${PORT}`);
});
