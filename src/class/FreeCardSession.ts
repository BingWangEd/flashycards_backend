import CardSession, { AllServerActionType, IResponseAction, ServerActionType, ICardAction, ClientActionType } from './CardSession';
import { List } from 'immutable';
import { Mode } from '~src/server';

const CARD_WIDTH = 150;
const CARD_HEIGHT = 150;
const MARGIN_PX = 20;
const SET_SPACE_PX = 20;
const SET_PER_ROW = 2;

export enum Content {
  Word = 'word',
  Translation = 'translation',
  None = 'none',
}

export interface IFreeCardState {
  // id: number;
  isFaceUp?: boolean;
  isActive?: boolean;
  position: {
    x: number, 
    y: number
  };
}

export interface IFreeCard {
  id: number;
  faceUp: Content;
  faceDown: Content;
  content: [string, string];
}

export interface ICardLayoutRules {
  faceUp: Content;
  faceDown: Content;
  isRandomized: boolean;
}

class FreeCardSession extends CardSession<Mode.Free> {
  // Flattened card list for reshuffling
  public shuffledCards: List<IFreeCard> = List();
  // Current state of each card
  public cardStates: List<IFreeCardState> = List();
  // Matching card game takes 8 words => 16 cards
  private wordNumber = 8;

  constructor(seedNumber: number, wordNumber: number) {
    super(seedNumber);
    this.wordNumber = wordNumber;
  }
  
  public createNewGame = (wordPool: [string, string][]): void => {
    this.wordPool = List(wordPool);
    const currentSeedNumber = this.seedGenerator.next().value;
    this.currentPlayer = this.getNextPlayer();
    
    this.selectedWords = this.sampleCards(currentSeedNumber, this.wordNumber);
  }

  private getPositions = (overallSetNumber: number, setIndex: number, wordIndex: number, groupWordsBySet: boolean) => {
    if (overallSetNumber === 1) {
      return {
        x: (wordIndex%SET_PER_ROW)*(CARD_WIDTH+MARGIN_PX),
        y: Math.floor(wordIndex/SET_PER_ROW)*(CARD_HEIGHT+MARGIN_PX),
      }
    }

    if (overallSetNumber >= 2) {
      if (groupWordsBySet) {
        return {
          x: setIndex*(overallSetNumber*(CARD_WIDTH+MARGIN_PX)+SET_SPACE_PX)+(wordIndex%SET_PER_ROW)*(CARD_WIDTH+MARGIN_PX),
          y: Math.floor(wordIndex/SET_PER_ROW)*(CARD_HEIGHT+MARGIN_PX),
        }
      } else {
        const columnWidth = overallSetNumber * (CARD_WIDTH + MARGIN_PX) + SET_SPACE_PX;

        return {
          x: setIndex*(CARD_WIDTH+MARGIN_PX)+columnWidth*(wordIndex%SET_PER_ROW),
          y: Math.floor(wordIndex/SET_PER_ROW)*(CARD_HEIGHT+MARGIN_PX),
        }
      }
    }
  };

  public createInitialCardStates = (layoutRules: ICardLayoutRules[], groupWordsBySet: boolean): {
    shuffledCards: List<IFreeCard>
    cardStates: List<IFreeCardState>,
    actions: AllServerActionType<Mode.Free>[],
  } => {
    let finalCards: List<IFreeCard> = List([]);
    let finalCardStates: List<IFreeCardState> = List([]);
    layoutRules.forEach((rule, setNumber) => {
      let cards: List<IFreeCard> = List([]);
      let cardStates: List<IFreeCardState> = List([]);
      const { faceUp, faceDown, isRandomized } = rule;

      cards = this.selectedWords.map((content, wordNumber) => {
        return {
          id: this.wordNumber * setNumber + wordNumber,
          faceUp,
          faceDown,
          content,
        }
      });
      finalCards = finalCards.concat(isRandomized ? this.shuffleCards(this.getSeed(), cards) : cards);

      cardStates = this.selectedWords.map((content, wordNumber) => {
        return {
          id: this.wordNumber * setNumber + wordNumber,
          isFaceUp: true,
          isActive: true,
          position: this.getPositions(layoutRules.length, setNumber, wordNumber, groupWordsBySet) || { x: 0, y: 0 },
        }
      });

      finalCardStates = finalCardStates.concat(cardStates);
    });

    this.shuffledCards = finalCards;
    this.cardStates = finalCardStates;

    return {
      shuffledCards: finalCards,
      cardStates: finalCardStates,
      actions: []
    }
  }

  public openCard = (action: ICardAction): [IResponseAction<ServerActionType.UpdateCardStates, Mode.Free>]=> {
    const { position, player } = action;
    const currentCard = this.shuffledCards.get(position);
    if (action.type !== ClientActionType.Open) throw Error(`Error: trying to open card ${action.position} when card action is not matched.`);

    if (!currentCard) throw Error(`Error: card ${action.position} does not exist.`);

    const currentCardState = this.cardStates.get(position);
    if (!currentCardState) throw Error('Error: card ' + position + ' does not exist.');
    this.cardStates = this.cardStates.set(position, {
      ...currentCardState,
      isFaceUp: !currentCardState.isFaceUp,
    });

    const openCard: IResponseAction<ServerActionType.UpdateCardStates, Mode.Free> = {
      type: ServerActionType.UpdateCardStates,
      payload: this.cardStates,
      player,
    };

    return [openCard];
  }

  public implementGameAction = (): void => {
    console.log('free card mode implementGameAction');
  };
}

export default FreeCardSession;
