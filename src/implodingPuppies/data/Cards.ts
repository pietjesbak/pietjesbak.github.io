import { wait } from 'src/Helpers';
import { Announcement, AnnouncementTypes } from './Announcement';
import { Game } from './Game';
import { Player } from './Player';

/**
 * All possible card types.
 */
export enum CardTypes {
    BOMB = 'bomb',
    DEFUSE = 'defuse',
    SHUFFLE = 'shuffle',
    NOPE = 'nope',
    SKIP = 'skip',
    ATTACK = 'attack',
    FAVOR = 'favor',
    FUTURE = 'future',
    PUPPY_1 = 'puppy 1',
    PUPPY_2 = 'puppy 2',
    PUPPY_3 = 'puppy 3',
    PUPPY_4 = 'puppy 4',
    PUPPY_5 = 'puppy 5'
}

export interface CardPrototype {
    /**
     * The card type / identifier.
     */
    type: CardTypes;

    /**
     * Card icon.
     */
    icon: string;

    /**
     * Card color.
     */
    color: string;

    /**
     * Card name.
     */
    name: string;

    /**
     * Card description.
     */
    description: string;

    /**
     * The number of cards to start with or a function that returns that number.
     */
    count: ((playerCount: number) => number) | number;

    /**
     * Does this card require the player to select a player when using?
     */
    requireTarget: boolean;

    /**
     * Creates a custom announcement for when this card is played.
     */
    announce?: (player: Player, game: Game, target?: Player) => Announcement;

    /**
     * Function that returns true for cards that can be played during this turn.
     */
    playTest: (player: Player, selection: Card[]) => boolean;

    /**
     * Function that executes the effect when a player plays this card.
     */
    playEffect?: (player: Player, game: Game, target?: Player) => Promise<void>;

    /**
     * Function that executes when a player draws this card.
     */
    drawEffect?: (player: Player, game: Game) => Promise<boolean>;

    /**
     * Function give a value to the card, used by the bots.
     */
    score: (hand: CardTypes[], game: Game) => number;
}

/**
 * Get the amount of cards that are usable for the `5 different rule`.
 * @param types The cards.
 */
const getApplicableCount = (types: Card[]) => {
    return new Set(types.filter(card => card.prototype.type !== CardTypes.DEFUSE)).size;
}

/**
 * Checks if this card can be selected to take a card from the discard pile.
 * @param player The current player.
 * @param selection The currently selected cards.
 * @param type The type of the card that's being checked.
 */
const fiveDifferent = (player: Player, selection: Card[], type: CardTypes) => {
    return getApplicableCount(player.cards) >= 5 &&
        selection.length < 5 &&
        selection.find(card => card.prototype.type === type) === undefined;
}

/**
 * Checks if this card can be selected to steal a card from another player.
 * @param player The current player.
 * @param selection The currently selected cards.
 * @param type The type of the card that's being checked.
 */
const twoOrThreeSame = (player: Player, selection: Card[], type: CardTypes) => {
    return player.cards.filter(card => card.prototype.type === type).length >= 2 &&
        selection.length < 3 &&
        selection.every(card => card.prototype.type === type);
}

/**
 * Counts the amount of cards a player has of a given type.
 * @param hand The other cards the player has.
 * @param type The type of the card that's being checked.
 */
const count = (hand: CardTypes[], type: CardTypes) => {
    return hand.filter(card => card === type).length;
}

export const cards = new Map<CardTypes, CardPrototype>();

cards.set(CardTypes.BOMB, {
    type: CardTypes.BOMB,
    icon: '💣',
    color: 'rgb(39, 39, 39)',
    name: 'Imploding Puppy',
    description: 'You are out of the game if you draw this card!',
    count: (playerCount) => playerCount - 1,
    requireTarget: false,
    playTest: () => false,
    playEffect: async (player, game) => {
        // A player can only use this card by playing a defuse, so the play effect of this card is just putting it back in the deck.
        await game.insertIntoDeck(CardTypes.BOMB);
    },
    drawEffect: async (player, game) => {
        const defuse = player.find(CardTypes.DEFUSE);
        if (defuse === undefined) {
            await wait(500);
            await player.die();
            game.announce(new Announcement(AnnouncementTypes.DIE, undefined, player));

            for (let i = player.cards.length - 1; i >= 0; i--) {
                player.discardCard(player.cards[i].prototype.type, game)
            }

            return false;
        } else {
            await player.useCard(CardTypes.DEFUSE, game);
        }

        return true;
    },
    score: () => 0
});

cards.set(CardTypes.DEFUSE, {
    type: CardTypes.DEFUSE,
    icon: '🎰',
    color: 'rgb(57, 92, 46)',
    name: 'Defuse',
    description: 'Use this card to put another card back in the deck.',
    count: 6,
    requireTarget: false,
    playTest: () => false,
    playEffect: async (player, game) => {
        // A player can only play this as a result of drawing a bomb, so he must have one in his hand.
        await player.useCard(CardTypes.BOMB, game);
    },
    score: () => 10
});

cards.set(CardTypes.SHUFFLE, {
    type: CardTypes.SHUFFLE,
    icon: '🎲',
    color: 'rgb(92, 64, 46)',
    name: 'Shuffle',
    description: 'Use this card to shuffle the deck.',
    count: 4,
    requireTarget: false,
    playTest: (player, selection) => selection.length === 0 || fiveDifferent(player, selection, CardTypes.SHUFFLE) || twoOrThreeSame(player, selection, CardTypes.SHUFFLE),
    playEffect: async (player, game) => {
        game.announce(new Announcement(AnnouncementTypes.SHUFFLE, undefined, player));
        game.deck.shuffle();
    },
    score: (hand: CardTypes[], game: Game) => Math.floor(game.deck.cards.length / 10) + count(hand, CardTypes.SHUFFLE)
});

cards.set(CardTypes.NOPE, {
    type: CardTypes.NOPE,
    icon: '⛔',
    color: 'rgb(92, 46, 46)',
    name: 'Nope',
    description: 'Use this card to prevent another player\'s action.',
    count: 5,
    requireTarget: false,
    playTest: (player, selection) => fiveDifferent(player, selection, CardTypes.NOPE) || twoOrThreeSame(player, selection, CardTypes.NOPE),
    score: (hand: CardTypes[]) => 4 + count(hand, CardTypes.NOPE)
});

cards.set(CardTypes.SKIP, {
    type: CardTypes.SKIP,
    icon: '🏃',
    color: 'rgb(46, 47, 92)',
    name: 'Skip',
    description: 'Use this card to skip drawing a card.',
    count: 4,
    requireTarget: false,
    playTest: (player, selection) => selection.length === 0 || fiveDifferent(player, selection, CardTypes.SKIP) || twoOrThreeSame(player, selection, CardTypes.SKIP),
    playEffect: async (player, game) => game.processSkip(),
    score: (hand: CardTypes[]) => 3 + count(hand, CardTypes.SKIP)
});

cards.set(CardTypes.ATTACK, {
    type: CardTypes.ATTACK,
    icon: '🚲',
    color: 'rgb(46, 92, 58)',
    name: 'Attack',
    description: 'Use this card to skip drawing a card and make the next player take 2 turns',
    count: 4,
    requireTarget: false,
    playTest: (player, selection) => selection.length === 0 || fiveDifferent(player, selection, CardTypes.ATTACK) || twoOrThreeSame(player, selection, CardTypes.ATTACK),
    playEffect: async (player, game) => game.processAttack(),
    score: (hand: CardTypes[]) => 4 + count(hand, CardTypes.ATTACK)
});

cards.set(CardTypes.FAVOR, {
    type: CardTypes.FAVOR,
    icon: '🖤',
    color: 'rgb(39, 39, 39)',
    name: 'Favor',
    description: 'Use this card to ask another player\'s card.',
    count: 4,
    requireTarget: true,
    announce: (player, game, target) => new Announcement(AnnouncementTypes.FAVOR_FROM, undefined, player, target),
    playTest: (player, selection) => selection.length === 0 || fiveDifferent(player, selection, CardTypes.FAVOR) || twoOrThreeSame(player, selection, CardTypes.FAVOR),
    playEffect: async (player, game, target) => {
        if (target!.cards.length > 0) {
            const options = [...new Set(target!.cards.map(card => card.prototype.type))];
            const selectedType = (await game.selectCard(target!, options)).data!.selection;

            const selectedCard = target!.stealCard(selectedType, game);
            if (selectedCard !== undefined) {
                player.addCard(selectedCard, game);
                game.announce(new Announcement(AnnouncementTypes.TAKE, undefined, player, target));
            }
        }
    },
    score: (hand: CardTypes[]) => 1 + count(hand, CardTypes.FAVOR)
});

cards.set(CardTypes.FUTURE, {
    type: CardTypes.FUTURE,
    icon: '🔮',
    color: 'rgb(92, 46, 78)',
    name: 'See the future',
    description: 'Use this card to see the top three cards.',
    count: 5,
    requireTarget: false,
    playTest: (player, selection) => selection.length === 0 || fiveDifferent(player, selection, CardTypes.FUTURE) || twoOrThreeSame(player, selection, CardTypes.FUTURE),
    playEffect: async (player, game) => game.processFuture(),
    score: (hand: CardTypes[]) => 2 + count(hand, CardTypes.SHUFFLE)
});

const icons = ['🐕', '🐈', '🐦', '🐟', '🐔'];
[CardTypes.PUPPY_1, CardTypes.PUPPY_2, CardTypes.PUPPY_3, CardTypes.PUPPY_4, CardTypes.PUPPY_5].forEach((type, i) => {
    cards.set(type, {
        type,
        icon: icons[i],
        color: 'rgb(92, 91, 46)',
        name: 'Animal',
        description: 'A collectable. Combine 2 or 3 of the same type to steal a card.',
        count: 4,
        requireTarget: false,
        playTest: (player, selection) => fiveDifferent(player, selection, type) || twoOrThreeSame(player, selection, type),
        score: (hand: CardTypes[]) => count(hand, type)
    });
});

export enum OwnerType {
    PLAYER = 'player',
    DECK = 'deck',
    DISCARD = 'discard'
}

interface Owner {
    type: OwnerType;
    data?: number;
}

let cardCounter = 0;
export class Card {
    /**
     * A function to sort cards.
     * @param a The left card.
     * @param b The right card.
     */
    static sortFn(a: Card, b: Card) {
        return a.prototype.type.localeCompare(b.prototype.type);
    }

    /**
     * An id used to identify otherwise identical cards.
     */
    id: number;

    /**
     * All data and mechanics of the card.
     */
    prototype: CardPrototype;

    /**
     * The entity that currently holds the card.
     */
    owner: Owner;

    constructor(type: CardTypes, owner?: Owner, id?: number) {
        this.id = id || cardCounter++;
        this.prototype = cards.get(type)!;
        this.owner = owner || { type: OwnerType.DECK };
    }
}

/**
 * Diffs state and props and returns which cards were added / removed.
 * @param state The cards stored in the react component's state.
 * @param props The cards stored in the react component's props.
 */
export function diffCardstate(state: Card[], props: Card[]) {
    const stateMap: {[key: number]: boolean} = {};
    state.forEach(card => stateMap[card.id] = true);
    const propsMap: {[key: number]: boolean} = {};
    props.forEach(card => propsMap[card.id] = true);

    const addedCards = props.filter(card => !stateMap[card.id]);
    const removedCards = state.filter(card => !propsMap[card.id]);
    return { addedCards, removedCards };
}
