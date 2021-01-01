import { Map, List } from 'immutable';
import { Game } from './Game';

interface IMember {
  playerName: string,
  playerRole: string,
}

export enum RoomState {
  Open = 'open',
  Locked = 'locked',
}

class GameRoom {
  private members: Map<string, IMember>;
  private roomName: string;
  public game: Game | undefined;
  public roomState: RoomState;

  constructor (roomName: string) {
    this.roomName = roomName;
    this.members = Map();
    this.roomState = RoomState.Open;
  }

  public addMember = (socketId: string, playerName: string, playerRole: string): void => {
    if (this.roomState === RoomState.Open) {
      this.members = this.members.set(socketId, { playerName, playerRole });
    }
  }

  public removeMember = (socketId: string): void => {
    if (this.roomState === RoomState.Open) {
      this.members = this.members.remove(socketId);
    }
  }

  public isEmpty = (): boolean => this.members.size > 0;

  public getAllMemberNames = (): List<string> => List(this.members.values()).map((member => member.playerName));

  public createNewGame = (words: [string, string][], seedNumber: number): void => {
    this.game = new Game(words, seedNumber);
  }
}

export default GameRoom;
