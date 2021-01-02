import { Map, List } from 'immutable';
import { random, shuffle, numberIncrementer } from "../utils/utils";

const CLOSE_CARD_DELAY_MS = 3000;

export enum RoomState {
  Open = 'open',
  Locked = 'locked',
}

enum CardSide {
  Word = 'word',
  Translation = 'translation'
}

export interface CardState {
  isActive: boolean,
  isOpen: boolean,
}

export interface WordCard {
  word: string,
  side: CardSide,
  counterpart: string,
}

const initialCardState = {
  isActive: true,
  isOpen: false,
}

export enum ActionType {
  Open = 'open card',
  Close = 'close card',
  Deactivate = 'deactivate card',
  ChangeTurns = 'change turns',
  ChangeScore = 'change score',
}

export interface ICardAction {
  type: ActionType;
  position: number;
  player: string;
  roomCode: string;
}

export interface IMember {
  name: string,
  role: string,
  socketId: string,
}

export type IResponseAction = {
  type: ActionType;
  payload: IMember | number | number[];
  player: string;
  timeout?: number;
}

// export type IResponseAction<T extends ActionType> = {
//   type: T;
//   payload: T extends ActionType.ChangeTurns ? IMember : (
//     T extends ActionType.IncrementScore ? string : number[]);
//   player?: string;
//   timeout?: number;
// }

class GameRoom {
  private members: Map<string, IMember> = Map();
  public roomState: RoomState = RoomState.Open;
  
  // All of the words that the user input to practice
  private wordPool: List<[string, string]> = List();
  // When user chose to reset the game, create a new seed for randomization
  private seedGenerator: Generator<number>;
  // Matching card game takes 8 words => 16 cards
  private wordNumber = 3;
  // The 8 words selected from the wordPool
  private selectedWords: List<[string, string]> = List();
  // Flattened word list for reshuffling
  public shuffledWords: List<WordCard> = List();
  // Current state of each card
  public cardStates: List<CardState> = List();
  // Score boards
  public scores: Map<string, number> = Map();

  constructor(seedNumber: number) {
    this.seedGenerator = numberIncrementer(seedNumber);
  }

  // Current player's turn
  public currentPlayer: IMember | undefined;
  // Current opened card. Undefined means no card is open
  private flippedCard: (WordCard & { position: number }) | undefined;
  // Current number of matched pairs
  private matchedPairs: number = 0;

  public addMember = (socketId: string, playerName: string, playerRole: string): void => {
    if (this.roomState === RoomState.Open) {
      this.members = this.members.set(socketId, {
        name: playerName,
        role: playerRole,
        socketId: socketId,
      });
      this.scores = this.scores.set(playerName, 0);
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

    if (!this.currentPlayer || currIndex + 1 === memberSeq.size) return this.members && this.members.valueSeq().first();

    const nextKey = memberSeq.get(currIndex + 1) as string;
    return this.members.get(nextKey);
  }

  public isEmpty = (): boolean => this.members.size > 0;

  public getAllMemberNames = (): List<string> => List(this.members.values()).map((member => member.name));

  private createInitialCardStates = (cardNumber: number) => Array(cardNumber).fill(initialCardState);

  private shuffleCards = (seedNumber: number): List<WordCard> => {
    const arrayInOrder = Array.from(Array(this.wordNumber * 2).keys());
    const arrayShuffled = shuffle(arrayInOrder, seedNumber);
    const result: WordCard[] = new Array(this.wordNumber * 2);

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

  private sampleCards = (seedNumber: number): List<[string, string]> => {
    const allNumber = this.wordPool.size;

    const startPosition = Math.floor(allNumber * random(seedNumber));
    const endPosition = startPosition + this.wordNumber;

    const slicedWords = endPosition > allNumber-1 ?
      this.wordPool.slice(0, endPosition%allNumber).concat(this.wordPool.slice(startPosition)) : this.wordPool.slice(startPosition, endPosition);

    return List(slicedWords);
  }

  public printCurrentWordsAndOrder = (): void => {
    console.log('Current words: ', this.shuffledWords);
  }

  public createNewGame = (wordPool: [string, string][]): {
    shuffledWords: List<WordCard>,
    cardStates: List<CardState>,
    actions: IResponseAction[],
  } => {
    this.wordPool = List(wordPool);
    const currentSeedNumber = this.seedGenerator.next().value;
    this.currentPlayer = this.getNextPlayer();

    this.selectedWords = this.sampleCards(currentSeedNumber);
    this.shuffledWords = this.shuffleCards(currentSeedNumber);
    this.cardStates = List(this.createInitialCardStates(this.wordNumber*2));

    console.log('this.members.size: ', this.members.size);
    console.log('this.currentPlayer: ', this.currentPlayer);

    if (!this.currentPlayer) throw Error(`Failed to start game. No player exists in the room.`);

    const changeTurn = {
      type: ActionType.ChangeTurns,
      payload: this.currentPlayer,
      player: this.currentPlayer.name,
    }

    return {
      shuffledWords: this.shuffledWords,
      cardStates: this.cardStates,
      actions: [changeTurn],
    }
  }

  public implementGameAction = (action: ICardAction): IResponseAction[] => {
    const { position, type, player } = action;
    const currentState = this.cardStates && this.cardStates.get(position);
    const currentCard = this.shuffledWords.get(action.position);

    if (!this.cardStates || !currentState || !currentState.isActive || !currentCard) throw Error('Card does not exist');

    switch (type) {
      case ActionType.Open:
        if (!this.flippedCard) { 
          this.flippedCard = { 
            position,
            ...currentCard
          };

          this.cardStates = this.cardStates.set(position, {
            isActive: true,
            isOpen: true,
          });

          console.log('this.flippedCard: ', this.flippedCard);
          const openCard = {
            type,
            payload: [position],
            player,
          };
          return [openCard];
        }

        // Two flipped cards match
        if (this.flippedCard.counterpart === currentCard.word) {
          // Lock the two cards' states
          this.cardStates = this.cardStates.set(position, {
            isActive: false,
            isOpen: true,
          });

          this.cardStates = this.cardStates.set(
            this.flippedCard.position,
            {
              isActive: false,
              isOpen: true,
            }
          );

          // Define two actions for front-end
          const openCard = {
            type,
            payload: [position],
            player,
          }
          const deactivateCards = {
            type: ActionType.Deactivate,
            payload: [this.flippedCard.position, position],
            player,
          }

          // Increment matchedPairs and player score
          this.matchedPairs = this.matchedPairs + 1;
          const currentScore = this.scores.get(player);

          if (currentScore === undefined) throw Error(`Failed to update score. Player ${player} does not exist.`)
          this.scores = this.scores.set(player, currentScore + 1);

          // Clean up flippedCard
          this.flippedCard = undefined;

          const incrementPlayerScore = {
            type: ActionType.ChangeScore,
            payload: currentScore + 1,
            player,
          }

          return [openCard, deactivateCards, incrementPlayerScore];
        } else { // No match
          // Flip existing open card over
          this.cardStates = this.cardStates.set(
            this.flippedCard.position,
            {
              isActive: true,
              isOpen: false,
            }
          );

          // Define two actions for front-end
          const openCard = {
            type,
            payload: [position],
            player,
          }

          const closeCard = {
            type: ActionType.Close,
            payload: [this.flippedCard.position, position],
            player,
            timeout: CLOSE_CARD_DELAY_MS,
          }

          this.currentPlayer = this.getNextPlayer();
          if (!this.currentPlayer) throw Error('Next player does not exist. Cannot change turns');

          const changeTurn = {
            type: ActionType.ChangeTurns,
            payload: this.currentPlayer,
            player: this.currentPlayer.name,
          }

          // Clean up flippedCard
          this.flippedCard = undefined;

          return [openCard, closeCard, changeTurn];
        }

      default:
        throw Error(`Action ${action} is not recognizable`);
    }
  }
}

export default GameRoom;
