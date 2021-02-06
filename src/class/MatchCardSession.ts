import CardSession, { WordCard, AllServerActionType, IResponseAction, ServerActionType, MatchCardState, ICardAction, ClientActionType, CardSide } from './CardSession';
import { Map, List } from 'immutable';

const CLOSE_CARD_DELAY_MS = 1000;
const END_GAME_DEALY_MS = 1000;

const initialCardState = {
  isActive: true,
  isOpen: false,
}

class MatchCardSession extends CardSession {
  // Flattened card list for reshuffling
  public shuffledCards: List<WordCard> = List();
  // Current state of each card
  public cardStates: List<MatchCardState> = List();
  // Current opened card. Undefined means no card is open
  public flippedCard: (WordCard & { position: number }) | undefined;
  // Current number of matched pairs
  private matchedPairs = 0;
  // Matching card game takes 8 words => 16 cards
  private wordNumber = 8;
  // Score boards
  public scores: Map<string, number> = Map();

  constructor(seedNumber: number, wordNumber: number) {
    super(seedNumber);
    this.wordNumber = wordNumber;
  }
  
  public createNewGame = (wordPool: [string, string][]): {
    shuffledCards: List<WordCard>,
    cardStates: List<MatchCardState>,
    actions: AllServerActionType[],
  } => {
    this.wordPool = List(wordPool);
    const currentSeedNumber = this.seedGenerator.next().value;
    this.currentPlayer = this.getNextPlayer();

    this.selectedWords = this.sampleCards(currentSeedNumber, this.wordNumber);

    let wordList: WordCard[] = [];
    this.selectedWords.forEach(([word, translation]) => {
      const word1 = {
        word,
        side: CardSide.Word,
        counterpart: translation,
      };
      const word2 = {
        word: translation,
        side: CardSide.Translation,
        counterpart: word,
      }
      wordList = wordList.concat([word1, word2]);
    });

    this.shuffledCards = this.shuffleCards(currentSeedNumber, List(wordList));
    this.cardStates = this.createInitialMatchCardStates(this.wordNumber, initialCardState);

    if (!this.currentPlayer) throw Error(`Failed to start game. No player exists in the room.`);

    const changeTurn: IResponseAction<ServerActionType.ChangeTurns> = {
      type: ServerActionType.ChangeTurns,
      payload: this.currentPlayer,
      player: this.currentPlayer.name,
    }

    const initialScores: { [key: string]: number} = {}
    this.getAllMemberNames().forEach(name => initialScores[name] = 0);
    this.scores = Map(initialScores);

    const setScores: IResponseAction<ServerActionType.SetScores> = {
      type: ServerActionType.SetScores,
      payload: this.scores,
    }

    return {
      shuffledCards: this.shuffledCards,
      cardStates: this.cardStates,
      actions: [changeTurn, setScores],
    }
  }

  public openCard = (action: ICardAction): [IResponseAction<ServerActionType.UpdateCardStates>]=> {
    const { position, player } = action;
    const currentCard = this.shuffledCards.get(action.position);
    if (action.type !== ClientActionType.Open) throw Error(`Error: trying to open card ${action.position} when card action is not matched.`);

    if (!currentCard) throw Error(`Error: card ${action.position} does not exist.`);

    this.cardStates = this.cardStates.set(position, {
      isActive: true,
      isOpen: true,
    });

    const openCard: IResponseAction<ServerActionType.UpdateCardStates> = {
      type: ServerActionType.UpdateCardStates,
      payload: this.cardStates,
      player,
    };
    return [openCard];
  }

  public implementGameAction = (action: ICardAction): AllServerActionType[] | undefined => {
    const { position, type, player } = action;
    const currentState = this.cardStates && this.cardStates.get(position);
    const currentCard = this.shuffledCards.get(action.position);

    if (!this.cardStates || !currentState || !currentState.isActive || !currentCard) throw Error('Card does not exist');

    switch (type) {
      case ClientActionType.Open:
        if (!this.flippedCard) {
          this.flippedCard = { 
            position,
            ...currentCard
          };
          return;
        } // Open action already sent

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

          const deactivateCard: IResponseAction<ServerActionType.UpdateCardStates> = {
            type: ServerActionType.UpdateCardStates,
            payload: this.cardStates,
            player,
          }

          // Increment matchedPairs and player score
          this.matchedPairs = this.matchedPairs + 1;

          const currentScore = this.scores.get(player);
          if (currentScore === undefined) throw Error(`Failed to update score. Player ${player} does not exist.`)
          this.scores = this.scores.set(player, currentScore + 1);

          // Clean up flippedCard
          this.flippedCard = undefined;

          const setScores: IResponseAction<ServerActionType.SetScores> = {
            type: ServerActionType.SetScores,
            payload: this.scores,
            player,
          }

          let endGame: IResponseAction<ServerActionType.EndGame> | null = null;
          if (this.matchedPairs === this.wordNumber) {
            const maxScore = this.scores.max();
            const winners = this.scores.filter((v) => v === maxScore).keySeq().toArray();

            endGame = {
              type: ServerActionType.EndGame,
              payload: winners,
              player,
              timeout: END_GAME_DEALY_MS,
            };
          }

          return endGame ? [deactivateCard, setScores, endGame] : [deactivateCard, setScores];
        } else { // No match
          // Flip existing open card over
          this.cardStates = this.cardStates.set(
            this.flippedCard.position,
            {
              isActive: true,
              isOpen: false,
            }
          );

          this.cardStates = this.cardStates.set(
            position,
            {
              isActive: true,
              isOpen: false,
            }
          );

          const closeCards: IResponseAction<ServerActionType.UpdateCardStates> = {
            type: ServerActionType.UpdateCardStates,
            payload: this.cardStates,
            player,
            timeout: CLOSE_CARD_DELAY_MS,
          }

          this.currentPlayer = this.getNextPlayer();
          if (!this.currentPlayer) throw Error('Next player does not exist. Cannot change turns');

          const changeTurn: IResponseAction<ServerActionType.ChangeTurns> = {
            type: ServerActionType.ChangeTurns,
            payload: this.currentPlayer,
            player: this.currentPlayer.name,
          }

          // Clean up flippedCard
          this.flippedCard = undefined;

          return [closeCards, changeTurn];
        }

      default:
        throw Error(`Action ${action} is not recognizable`);
    }
  }
}

export default MatchCardSession;
