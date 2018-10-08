import { repeat } from '../../Helpers';
import { CardTypes } from './Cards';
import { Game } from './Game';
import { Player } from './Player';

export interface Personality {
    paranoia: number;
    randomness: number;
    generousity: number;
}

export interface WeightedPlay {
    selection: CardTypes[];
    weight: number;
}

export class AIPlayer extends Player {

    static PLAY_DELAY = 500;

    personality_: Personality;

    private bombPosition_ = Infinity;

    private game_: Game;

    private playsThisTurn_: CardTypes[][] = [];

    constructor(game: Game, name?: string, id?: number) {
        super(name, id);

        this.game_ = game;

        this.personality_ = {
            paranoia: Math.random() / 2 + 0.5,
            randomness: Math.random() / 2 * 0.5,
            generousity: Math.random() / 2 + 0.5
        }
    }

    /**
     * Used to draw or play a card.
     * @param drawCallback Callback to draw a card.
     * @param playCallback Callback to play 1 or more cards.
     */
    giveOptions(drawCallback: () => void, playCallback: (selection: CardTypes[]) => void) {
        window.setTimeout(() => {
            let played = false;
            const baseRate = this.find(CardTypes.DEFUSE) ? 0.3 : 0.1;
            if (this.getBombProbability_() > baseRate * (Math.random() / 2 + 0.5)) {
                played = this.tryPlay_(playCallback);
            }

            if (!played) {
                this.playsThisTurn_ = [];
                drawCallback();
            }
        }, AIPlayer.PLAY_DELAY);
    }

    /**
     * Used to nope the currently played card.
     * @param nopeCallback Callback for when the player wants to nope the currently played card.
     */
    allowNope(nopeCallback: () => void) {
        window.setTimeout(() => {
            if (Math.random() > 0.5) {
                nopeCallback();
            }
        }, AIPlayer.PLAY_DELAY);
    };

    /**
     * Used to select a player.
     * @param options All possible players to choose from.
     * @param playerSelectCallback Callback to pass the selected player back to the game logic.
     */
    allowSelectTarget(options: Player[], playerSelectCallback: (player: Player) => void) {
        window.setTimeout(() => {
            const selection = options.slice().sort((a, b) => a.cards.length === 0 ? 1 : a.cards.length - b.cards.length)[0];
            playerSelectCallback(selection);
        }, AIPlayer.PLAY_DELAY);
    }

    /**
     * Used to select a card type.
     * @param options All possible card types to choose from.
     * @param cardSelectCallback Callback to pass the selected type back to the game logic.
     */
    allowSelectCard(options: CardTypes[], cardSelectCallback: (selection: CardTypes) => void) {
        window.setTimeout(() => {
            const scores = this.getCardsScore_().sort((a, b) => a.score - b.score);
            cardSelectCallback(scores[0].type);
        }, AIPlayer.PLAY_DELAY);
    }

    /**
     * Used to select a position to put a card back in the deck.
     * @param maxPosition The size of the deck.
     * @param insertCallback Callback to pass the selected position back to the game logic.
     */
    allowInsertIntoDeck(maxPosition: number, insertCallback: (position: number) => void) {
        window.setTimeout(() => {
            this.bombPosition_ = maxPosition * Math.random();
            insertCallback(this.bombPosition_);
        }, AIPlayer.PLAY_DELAY);
    }

    /**
     * Used to pass show the future to this player.
     * @param cards The future cards.
     * @param confirmCallback Callback when done seeing the future.
     */
    seeFuture(cards: CardTypes[], confirmCallback: () => void) {
        window.setTimeout(() => {
            for (let i = 0; i < cards.length; i++) {
                if (cards[i] === CardTypes.BOMB) {
                    this.bombPosition_ = this.game_.deck.cards.length - i;
                }
            }

            confirmCallback();
        }, AIPlayer.PLAY_DELAY);
    }

    /**
     * Used to reset the player state / clear previous callbacks.
     */
    clearCallbacks() {
        // Callback
    }

    private getCardsScore_() {
        const scores: { [type in CardTypes]?: number } = {};
        for (let card of this.cards) {
            if (card.prototype.type in scores) {
                continue;
            }

            scores[card.prototype.type] = card.prototype.score(this, this.game_);
        }

        const scoreArr: Array<{ type: CardTypes, score: number }> = [];
        for (let type in scores) {
            scoreArr.push({
                type: type as CardTypes,
                score: scores[type]
            });
        }
        return scoreArr;
    }

    private getActualBombProbability_() {
        const alivePlayers = this.game_.players.filter(player => player.alive).length;
        return ((alivePlayers - 1) / this.game_.deck.cards.length);
    }

    private getBombProbability_() {
        if (this.bombPosition_ === this.game_.deck.cards.length) {
            return 1;
        }

        return this.getActualBombProbability_();
    }

    private tryPlay_(playCallback: (selection: CardTypes[]) => void) {
        const options: WeightedPlay[] = [];

        if (this.find(CardTypes.SHUFFLE) && !this.checkIfPlayedThisRound_(CardTypes.SHUFFLE)) {
            options.push({
                selection: [CardTypes.SHUFFLE],
                weight: (1 - this.getActualBombProbability_()) * (Math.random() / 2 + 0.5)
            });
        }

        if (this.find(CardTypes.FUTURE) && !this.checkIfPlayedThisRound_(CardTypes.FUTURE) && this.bombPosition_ > this.game_.deck.cards.length) {
            options.push({
                selection: [CardTypes.FUTURE],
                weight: 0.6 * (Math.random() / 2 + 0.5)
            });
        }

        if (this.find(CardTypes.SKIP)) {
            options.push({
                selection: [CardTypes.SKIP],
                weight: this.bombPosition_ === this.game_.deck.cards.length ? 0.8 : 0.1
            });
        }

        if (this.find(CardTypes.ATTACK)) {
            options.push({
                selection: [CardTypes.ATTACK],
                weight: this.bombPosition_ === this.game_.deck.cards.length ? 0.6 : 0.1
            });
        }

        if (this.find(CardTypes.FAVOR)) {
            options.push({
                selection: [CardTypes.FAVOR],
                weight: 0.4 * (Math.random() / 2 + 0.5)
            });
        }

        if (this.find(CardTypes.DEFUSE)) {
            options.push({
                selection: [CardTypes.DEFUSE],
                weight: 0.3 * (Math.random() / 2 + 0.5)
            });
        }

        [CardTypes.PUPPY_1, CardTypes.PUPPY_2, CardTypes.PUPPY_3, CardTypes.PUPPY_4, CardTypes.PUPPY_5].forEach((type) => this.addOfAKindOption_(type, 0.3, options));
        [CardTypes.SKIP, CardTypes.ATTACK, CardTypes.NOPE, CardTypes.FAVOR, CardTypes.SHUFFLE].forEach((type) => this.addOfAKindOption_(type, 0.2, options));

        if (this.game_.deck.cards.find(card => card.prototype.type === CardTypes.DEFUSE) !== undefined &&
            new Set(this.cards.filter(card => card.prototype.type !== CardTypes.DEFUSE).map(card => card.prototype.type)).size >= 5) {

            const scores = this.getCardsScore_().sort((a, b) => b.score - a.score);
            const selection: CardTypes[] = [];
            while (selection.length < 5) {
                selection.push(scores.pop()!.type);
            }

            options.push({
                selection,
                weight: 0.2 * (Math.random() / 2 + 0.5)
            });
        }

        options.sort((a, b) => b.weight - a.weight);
        if (options.length > 0 && options[0].selection[0] !== CardTypes.DEFUSE) {
            const choice = options[0].selection;
            this.playsThisTurn_.push(choice);
            playCallback(choice);
            return true;
        }

        return false;
    }

    private addOfAKindOption_(type: CardTypes, weight: number, options: WeightedPlay[]) {
        const count = this.cards.filter(card => card.prototype.type === type).length;
        if (count >= 2) {
            options.push({
                selection: repeat(count > 2 ? 3 : 2).map(() => type),
                weight: weight * (Math.random() / 2 + 0.5)
            });
        }
    }

    private checkIfPlayedThisRound_(type: CardTypes) {
        return this.playsThisTurn_.find(cards => cards.length === 1 && cards[0] === type) !== undefined;
    }

}
