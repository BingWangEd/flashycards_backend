import { random, shuffle, numberIncrementer } from "../utils/utils";
import { List } from "immutable";

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
  // number[] for card actions; string for change turns
  payload: number[] | IMember;
  player?: string;
  timeout?: number;
}

export class Game {
  private wordPool: [string, string][];
  private seedGenerator: Generator<number>;
  private wordNumber = 8;
  private selectedWords: [string, string][];
  shuffledWords: List<WordCard>;
  cardStates: List<CardState>;
  flippedCard: (WordCard & { position: number }) | undefined;
  private matchedPairs: number = 0;
  gameOver = this.matchedPairs === this.wordNumber;

  constructor(wordPool: [string, string][], seedNumber: number) {
    this.seedGenerator = numberIncrementer(seedNumber);
    const currentSeedNumber = this.seedGenerator.next().value;
    this.wordPool = wordPool;
    this.selectedWords = this.sampleCards(currentSeedNumber);
    this.shuffledWords = this.shuffleCards(currentSeedNumber);
    this.cardStates = List(this.createInitialCardStates(this.wordNumber*2));
  }

  private createInitialCardStates = (cardNumber: number) => Array(cardNumber).fill(initialCardState);

  private sampleCards = (seedNumber: number): [string, string][] => {
    const allNumber = this.wordPool.length;

    const startPosition = Math.floor(allNumber * random(seedNumber));
    const endPosition = startPosition + this.wordNumber;

    const slicedWords = endPosition > allNumber-1 ?
      this.wordPool.slice(0, endPosition%allNumber).concat(this.wordPool.slice(startPosition)) : this.wordPool.slice(startPosition, endPosition);

    return slicedWords;
  }

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

  public printCurrentWordsAndOrder = (): void => {
    console.log('Current words: ', this.shuffledWords);
  }

  public updateCardStates = (action: ICardAction): { actions: IResponseAction[], changeTurns: boolean } => {
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
            console.log('this.flippedCard: ', this.flippedCard);
            return {
              actions: [{
                type,
                payload: [position],
                player,
              }],
              changeTurns: false,
            };
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
            const action1 = {
              type,
              payload: [position],
              player,
            }
            const action2 = {
              type: ActionType.Deactivate,
              payload: [this.flippedCard.position, position],
              player,
            }

            // Increment matchedPairs
            this.matchedPairs = this.matchedPairs + 1;

            // Clean up flippedCard
            this.flippedCard = undefined;

            return {
              actions: [action1, action2],
              changeTurns: false,
            };
          } else { // No match
            // Flip existing open card over
            this.cardStates = this.cardStates.set(
              this.flippedCard.position,
              {
                isActive: false,
                isOpen: false,
              }
            );

            // Define two actions for front-end
            const action1 = {
              type,
              payload: [position],
              player,
            }

            const action2 = {
              type: ActionType.Close,
              payload: [this.flippedCard.position, position],
              player,
            }

            // Clean up flippedCard
            this.flippedCard = undefined;

            return {
              actions: [action1, action2],
              changeTurns: true, // Change turns
            };
          }

        default:
          throw Error(`Action ${action} is not recognizable`);
      }
    }
  
}
