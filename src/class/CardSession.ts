import { Map, List } from 'immutable';
import { random, shuffle, numberIncrementer } from "../utils/utils";

export enum RoomState {
  Open = 'open',
  Locked = 'locked',
}

export interface MatchCardState {
  isActive: boolean,
  isOpen: boolean,
}

export enum ClientActionType {
  Open = 'open',
}

export enum CardSide {
  Word = 'word',
  Translation = 'translation'
}

export interface WordCard {
  word: string,
  side: CardSide,
  counterpart: string,
}

export enum ServerActionType {
  UpdateCardStates = 'update card states',
  ChangeTurns = 'change turns',
  SetScores = 'set scores',
  SetMembers = 'set members',
  EndGame = 'end game',
}

export type AllServerActionType =
  | IResponseAction<ServerActionType.UpdateCardStates>
  | IResponseAction<ServerActionType.ChangeTurns>
  | IResponseAction<ServerActionType.SetScores>
  | IResponseAction<ServerActionType.SetMembers>
  | IResponseAction<ServerActionType.EndGame>
;

export interface IMember {
  name: string,
  role: string,
  socketId: string,
}

export interface ICardAction {
  type: ClientActionType;
  position: number;
  player: string;
  roomCode: string;
}

type CardState = MatchCardState;

export type IResponseAction<T extends ServerActionType> = {
  type: T;
  payload: T extends ServerActionType.ChangeTurns ? IMember :
    T extends ServerActionType.EndGame ? string[] :
    T extends ServerActionType.SetScores ? Map<string, number> : 
    T extends ServerActionType.SetMembers ? List<string> :
    List<CardState>; // when ActionType is `UpdateCardStates`, return cardStates directly
  player?: string;
  timeout?: number;
}

class CardSession {
  // All of the words that the user input to practice
  public wordPool: List<[string, string]> = List();

  public roomState: RoomState = RoomState.Open;
  // When user chose to reset the game, create a new seed for randomization
  public seedGenerator: Generator<number>;
  
  // The 8 words selected from the wordPool
  public selectedWords: List<[string, string]> = List();

  public members: Map<string, IMember> = Map();
  // Current player's turn
  public currentPlayer: IMember | undefined;
  
  constructor(seedNumber: number) {
    this.seedGenerator = numberIncrementer(seedNumber);
  }

  public getSeed = (): number => this.seedGenerator.next().value;

  public addMember = (socketId: string, playerName: string, playerRole: string): AllServerActionType[] | undefined => {
    if (this.roomState === RoomState.Open) {
      const member = {
        name: playerName,
        role: playerRole,
        socketId: socketId,
      };

      this.members = this.members.set(socketId, member);

      const setMembers: IResponseAction<ServerActionType.SetMembers> = {
        type: ServerActionType.SetMembers,
        payload: this.getAllMemberNames(),
      }

      return [setMembers];
    }
  }

  public removeMember = (socketId: string): AllServerActionType[] | undefined => {
    const member = this.members.get(socketId);

    if (!member) return;

    this.members = this.members.remove(socketId);
    const setMembers: IResponseAction<ServerActionType.SetMembers> = {
      type: ServerActionType.SetMembers,
      payload: this.getAllMemberNames(),
    }

    if (this.members.size === 0) {
      return [setMembers];
    }

    this.currentPlayer = this.getNextPlayer();

    if (!this.currentPlayer) throw Error(`Failed to start game. No player exists in the room.`);

    const changeTurn: IResponseAction<ServerActionType.ChangeTurns> = {
      type: ServerActionType.ChangeTurns,
      payload: this.currentPlayer,
      player: this.currentPlayer.name,
    }

    return [changeTurn, setMembers];
  }

  public getNextPlayer = (): IMember | undefined => {
    const memberSeq = this.members.keySeq();
    const currIndex = memberSeq.findIndex(key => this.currentPlayer !== undefined && key === this.currentPlayer.socketId);

    if (!this.currentPlayer || currIndex + 1 === memberSeq.size) return this.members && this.members.valueSeq().first();

    const nextKey = memberSeq.get(currIndex + 1) as string;
    return this.members.get(nextKey);
  }

  public isEmpty = (): boolean => this.members.size > 0;

  public getAllMemberNames = (): List<string> => List(this.members.values()).map((member => member.name));

  public shuffleCards = <T>(seedNumber: number, selectedWords: List<T>): List<T> => {
    const arrayInOrder = Array.from(Array(selectedWords.size).keys());
    const arrayShuffled = shuffle(arrayInOrder, seedNumber);
    const result: T[] = new Array(selectedWords.size);

    arrayShuffled.forEach((newPosition, currentPosition) => {
      const value = selectedWords.get(currentPosition)
      if (value) result[newPosition] = value;
    });
    return List(result);
  }

  public sampleCards = (seedNumber: number, wordNumber: number): List<[string, string]> => {
    const allNumber = this.wordPool.size;

    const startPosition = Math.floor(allNumber * random(seedNumber));
    const endPosition = startPosition + wordNumber;

    const slicedWords = endPosition > allNumber-1 ?
      this.wordPool.slice(0, endPosition%allNumber).concat(this.wordPool.slice(startPosition)) : this.wordPool.slice(startPosition, endPosition);

    return List(slicedWords);
  }
  
  public createInitialMatchCardStates = (wordNumber: number, initialCardState: CardState): List<CardState> => List(Array(wordNumber*2).fill(initialCardState));
}

export default CardSession;
