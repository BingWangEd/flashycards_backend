import { Map, List } from 'immutable';

interface IMember {
  name: string,
  playerRole: string
};

class GameRoom {
  private members: Map<string, IMember>;
  private roomName: string;

  constructor (roomName: string) {
    this.roomName = roomName;
    this.members = Map();
  }

  public addMember = (socketId: string, name: string, playerRole: string) => {
    this.members = this.members.set(socketId, { name, playerRole });
  }

  public removeMember = (socketId: string) => {
    this.members = this.members.remove(socketId);
  }

  public isEmpty = () => this.members.size > 0;

  public getAllMemberNames = () => List(this.members.values()).map((member => member.name));
}

export default GameRoom;
