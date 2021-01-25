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

enum CardSide {
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
  // Flattened word list for reshuffling
  public shuffledWords: List<WordCard> = List();

  // Score boards
  public scores: Map<string, number> = Map();

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

  public shuffleCards = (seedNumber: number, wordNumber: number): List<WordCard> => {
    const arrayInOrder = Array.from(Array(wordNumber * 2).keys());
    const arrayShuffled = shuffle(arrayInOrder, seedNumber);
    const result: WordCard[] = new Array(wordNumber * 2);

    let selectedWords: string[] = [];
    this.selectedWords.forEach((wordPair) => {
      selectedWords = selectedWords.concat(wordPair);
    });

    arrayShuffled.forEach((newPosition, currentPosition) => {
      let word: WordCard;
      if (currentPosition % 2 === 0) {
        word = {
          word: selectedWords[currentPosition],
          side: CardSide.Word,
          counterpart: selectedWords[currentPosition+1],
        }
      } else {
        word = {
          word: selectedWords[currentPosition],
          side: CardSide.Translation,
          counterpart: selectedWords[currentPosition-1],
        }
      }
      
      result[newPosition] = word;
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

  public printCurrentWordsAndOrder = (): void => {
    console.log('Current words: ', this.shuffledWords);
  }
  
  public createInitialMatchCardStates = (wordNumber: number, initialCardState: CardState): CardState[] => Array(wordNumber*2).fill(initialCardState);
}

export default CardSession;
