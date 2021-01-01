import { Map, List } from 'immutable';
import { Game, WordCard, CardState, ICardAction, IResponseAction, ActionType, IMember } from './Game';
import { numberIncrementer } from '../utils/utils';

export enum RoomState {
  Open = 'open',
  Locked = 'locked',
}

class GameRoom {
  private members: Map<string, IMember>;
  private roomName: string;
  public game: Game | undefined;
  public roomState: RoomState;
  public currentPlayer: IMember | undefined;

  constructor (roomName: string) {
    this.roomName = roomName;
    this.members = Map();
    this.roomState = RoomState.Open;
  }

  public addMember = (socketId: string, playerName: string, playerRole: string): void => {
    if (this.roomState === RoomState.Open) {
      this.members = this.members.set(socketId, {
        name: playerName,
        role: playerRole,
        socketId: socketId
      });
    }
  }

  public removeMember = (socketId: string): void => {
    if (this.roomState === RoomState.Open) {
      this.members = this.members.remove(socketId);
    }

    // TODO: update current player
  }

  private getNextPlayer = (): IMember | undefined => {
    const memberSeq = this.members.keySeq();
    const currIndex = memberSeq.findIndex(key => this.currentPlayer !== undefined && key === this.currentPlayer.socketId);

    console.log('currIndex: ', currIndex);

    if (!this.currentPlayer || currIndex + 1 === memberSeq.size) return this.members && this.members.valueSeq().first();

    const nextKey = memberSeq.get(currIndex + 1) as string;
    return this.members.get(nextKey);
  }

  public isEmpty = (): boolean => this.members.size > 0;

  public getAllMemberNames = (): List<string> => List(this.members.values()).map((member => member.name));

  public createNewGame = (words: [string, string][], seedNumber: number): {
    shuffledWords: List<WordCard>,
    cardStates: List<CardState>,
  } => {
    this.game = new Game(words, seedNumber);
    return {
      shuffledWords: this.game.shuffledWords,
      cardStates: this.game.cardStates,
    }
  }

  public implementGameAction = (action: ICardAction): IResponseAction[] => {
    if (!this.game) throw Error('Game does not exist.');

    const { actions, changeTurns } = this.game.updateCardStates(action);
    let finalActions: IResponseAction[] = actions;

    if (changeTurns) {
      this.currentPlayer = this.getNextPlayer();
      if (!this.currentPlayer) throw Error('No player left in the game');

      finalActions.push({
        type: ActionType.ChangeTurns,
        payload: this.currentPlayer,
      } as IResponseAction)
    }
    
    return finalActions;
  }
}

export default GameRoom;
