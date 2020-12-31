import { random, shuffle } from "../utils/utils";
import { List } from "immutable";

enum CardSide {
  Word = 'word',
  Translation = 'translation'
}

interface CardState {
  isActive: boolean,
  isOpen: boolean,
}

interface WordCard {
  word: string,
  side: CardSide,
  counterpart: string,
}

const initialCardState = {
  isActive: true,
  isOpen: false,
}

export enum ActionType {
  Flip = 'flip card',
  Deactivate = 'deactivate card',
}

export interface ICardAction {
  type: ActionType;
  position: number;
  player: string;
  roomCode: string;
}

export class Game {
  private wordPool: [string, string][];
  private seedGenerator: Generator<number>;
  private wordNumber = 8;
  private selectedWords: [string, string][];
  shuffledWords: List<WordCard>;
  cardStates: List<CardState>;

  constructor(wordPool: [string, string][], seedNumber: number) {
    this.seedGenerator = this.seedNumberIncrementer(seedNumber);
    const currentSeedNumber = this.seedGenerator.next().value;
    this.wordPool = wordPool;
    this.selectedWords = this.sampleCards(currentSeedNumber);
    this.shuffledWords = this.shuffleCards(currentSeedNumber);
    this.cardStates = List(this.createInitialCardStates(this.wordNumber*2));
  }

  private createInitialCardStates = (cardNumber: number) => Array(cardNumber).fill(initialCardState);

  private seedNumberIncrementer = function* (originalSeedNumber: number): Generator<number> {
    while (true) yield originalSeedNumber++;
  }

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

  public updateCardStates = (position: number, action: ActionType): void => {
      const currentState = this.cardStates && this.cardStates.get(position);
      if (!this.cardStates || !currentState || !currentState.isActive) return;

      switch (action) {
        case ActionType.Flip:
          this.cardStates = this.cardStates.set(position, {
            isActive: true,
            isOpen: true,
          })
          break;
        case ActionType.Deactivate:
          this.cardStates = this.cardStates.set(position, {
            isActive: false,
            isOpen: true,
          })
          break;
        default:
          console.log(`Action ${action} is not recognizable`);
      }
    }
  
}
