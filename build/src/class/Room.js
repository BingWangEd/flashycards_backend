"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActionType = exports.RoomState = void 0;
var immutable_1 = require("immutable");
var utils_1 = require("../utils/utils");
var CLOSE_CARD_DELAY_MS = 3000;
var RoomState;
(function (RoomState) {
    RoomState["Open"] = "open";
    RoomState["Locked"] = "locked";
})(RoomState = exports.RoomState || (exports.RoomState = {}));
var CardSide;
(function (CardSide) {
    CardSide["Word"] = "word";
    CardSide["Translation"] = "translation";
})(CardSide || (CardSide = {}));
var initialCardState = {
    isActive: true,
    isOpen: false,
};
var ActionType;
(function (ActionType) {
    ActionType["Open"] = "open card";
    ActionType["Close"] = "close card";
    ActionType["Deactivate"] = "deactivate card";
    ActionType["ChangeTurns"] = "change turns";
    ActionType["IncrementScore"] = "increment score";
})(ActionType = exports.ActionType || (exports.ActionType = {}));
// export type IResponseAction<T extends ActionType> = {
//   type: T;
//   payload: T extends ActionType.ChangeTurns ? IMember : (
//     T extends ActionType.IncrementScore ? string : number[]);
//   player?: string;
//   timeout?: number;
// }
var GameRoom = /** @class */ (function () {
    function GameRoom(seedNumber) {
        var _this = this;
        this.members = immutable_1.Map();
        this.roomState = RoomState.Open;
        // All of the words that the user input to practice
        this.wordPool = immutable_1.List();
        // Matching card game takes 8 words => 16 cards
        this.wordNumber = 3;
        // The 8 words selected from the wordPool
        this.selectedWords = immutable_1.List();
        // Flattened word list for reshuffling
        this.shuffledWords = immutable_1.List();
        // Current state of each card
        this.cardStates = immutable_1.List();
        // Score boards
        this.scores = immutable_1.Map();
        // Current number of matched pairs
        this.matchedPairs = 0;
        this.addMember = function (socketId, playerName, playerRole) {
            if (_this.roomState === RoomState.Open) {
                _this.members = _this.members.set(socketId, {
                    name: playerName,
                    role: playerRole,
                    socketId: socketId,
                });
                _this.scores = _this.scores.set(playerName, 0);
            }
        };
        this.removeMember = function (socketId) {
            if (_this.roomState === RoomState.Open) {
                _this.members = _this.members.remove(socketId);
            }
            // TODO: update current player
        };
        this.getNextPlayer = function () {
            var memberSeq = _this.members.keySeq();
            var currIndex = memberSeq.findIndex(function (key) { return _this.currentPlayer !== undefined && key === _this.currentPlayer.socketId; });
            if (!_this.currentPlayer || currIndex + 1 === memberSeq.size)
                return _this.members && _this.members.valueSeq().first();
            var nextKey = memberSeq.get(currIndex + 1);
            return _this.members.get(nextKey);
        };
        this.isEmpty = function () { return _this.members.size > 0; };
        this.getAllMemberNames = function () { return immutable_1.List(_this.members.values()).map((function (member) { return member.name; })); };
        this.createInitialCardStates = function (cardNumber) { return Array(cardNumber).fill(initialCardState); };
        this.shuffleCards = function (seedNumber) {
            var arrayInOrder = Array.from(Array(_this.wordNumber * 2).keys());
            var arrayShuffled = utils_1.shuffle(arrayInOrder, seedNumber);
            var result = new Array(_this.wordNumber * 2);
            var selectedWords = [];
            _this.selectedWords.forEach(function (wordPair) {
                selectedWords = selectedWords.concat(wordPair);
            });
            arrayShuffled.forEach(function (newPosition, currentPosition) {
                var word;
                if (currentPosition % 2 === 0) {
                    word = {
                        word: selectedWords[currentPosition],
                        side: CardSide.Word,
                        counterpart: selectedWords[currentPosition + 1],
                    };
                }
                else {
                    word = {
                        word: selectedWords[currentPosition],
                        side: CardSide.Translation,
                        counterpart: selectedWords[currentPosition - 1],
                    };
                }
                result[newPosition] = word;
            });
            return immutable_1.List(result);
        };
        this.sampleCards = function (seedNumber) {
            var allNumber = _this.wordPool.size;
            var startPosition = Math.floor(allNumber * utils_1.random(seedNumber));
            var endPosition = startPosition + _this.wordNumber;
            var slicedWords = endPosition > allNumber - 1 ?
                _this.wordPool.slice(0, endPosition % allNumber).concat(_this.wordPool.slice(startPosition)) : _this.wordPool.slice(startPosition, endPosition);
            return immutable_1.List(slicedWords);
        };
        this.printCurrentWordsAndOrder = function () {
            console.log('Current words: ', _this.shuffledWords);
        };
        this.createNewGame = function (wordPool) {
            _this.wordPool = immutable_1.List(wordPool);
            var currentSeedNumber = _this.seedGenerator.next().value;
            _this.currentPlayer = _this.getNextPlayer();
            _this.selectedWords = _this.sampleCards(currentSeedNumber);
            _this.shuffledWords = _this.shuffleCards(currentSeedNumber);
            _this.cardStates = immutable_1.List(_this.createInitialCardStates(_this.wordNumber * 2));
            return {
                shuffledWords: _this.shuffledWords,
                cardStates: _this.cardStates,
            };
        };
        this.implementGameAction = function (action) {
            var position = action.position, type = action.type, player = action.player;
            var currentState = _this.cardStates && _this.cardStates.get(position);
            var currentCard = _this.shuffledWords.get(action.position);
            if (!_this.cardStates || !currentState || !currentState.isActive || !currentCard)
                throw Error('Card does not exist');
            switch (type) {
                case ActionType.Open:
                    if (!_this.flippedCard) {
                        _this.flippedCard = __assign({ position: position }, currentCard);
                        _this.cardStates = _this.cardStates.set(position, {
                            isActive: true,
                            isOpen: true,
                        });
                        console.log('this.flippedCard: ', _this.flippedCard);
                        var openCard = {
                            type: type,
                            payload: [position],
                            player: player,
                        };
                        return [openCard];
                    }
                    // Two flipped cards match
                    if (_this.flippedCard.counterpart === currentCard.word) {
                        // Lock the two cards' states
                        _this.cardStates = _this.cardStates.set(position, {
                            isActive: false,
                            isOpen: true,
                        });
                        _this.cardStates = _this.cardStates.set(_this.flippedCard.position, {
                            isActive: false,
                            isOpen: true,
                        });
                        // Define two actions for front-end
                        var openCard = {
                            type: type,
                            payload: [position],
                            player: player,
                        };
                        var deactivateCards = {
                            type: ActionType.Deactivate,
                            payload: [_this.flippedCard.position, position],
                            player: player,
                        };
                        // Increment matchedPairs and player score
                        _this.matchedPairs = _this.matchedPairs + 1;
                        var currentScore = _this.scores.get(player);
                        if (currentScore === undefined)
                            throw Error("Failed to update score. Player " + player + " does not exist.");
                        _this.scores = _this.scores.set(player, currentScore + 1);
                        // Clean up flippedCard
                        _this.flippedCard = undefined;
                        var incrementPlayerScore = {
                            type: ActionType.IncrementScore,
                            payload: player,
                            player: player,
                        };
                        return [openCard, deactivateCards, incrementPlayerScore];
                    }
                    else { // No match
                        // Flip existing open card over
                        _this.cardStates = _this.cardStates.set(_this.flippedCard.position, {
                            isActive: true,
                            isOpen: false,
                        });
                        // Define two actions for front-end
                        var openCard = {
                            type: type,
                            payload: [position],
                            player: player,
                        };
                        var closeCard = {
                            type: ActionType.Close,
                            payload: [_this.flippedCard.position, position],
                            player: player,
                            timeout: CLOSE_CARD_DELAY_MS,
                        };
                        _this.currentPlayer = _this.getNextPlayer();
                        if (!_this.currentPlayer)
                            throw Error('Next player does not exist. Cannot change turns');
                        var changeTurn = {
                            type: ActionType.ChangeTurns,
                            payload: _this.currentPlayer,
                        };
                        // Clean up flippedCard
                        _this.flippedCard = undefined;
                        return [openCard, closeCard, changeTurn];
                    }
                default:
                    throw Error("Action " + action + " is not recognizable");
            }
        };
        this.seedGenerator = utils_1.numberIncrementer(seedNumber);
    }
    return GameRoom;
}());
exports.default = GameRoom;
