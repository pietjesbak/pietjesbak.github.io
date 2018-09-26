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
     * Function that returns true for cards that can be played during this turn.
     */
    playTest: (player: Player, selection: Card[]) => boolean;

    /**
     * Function that executes the effect when a player plays this card.
     */
    playEffect: (player: Player, game: Game) => Promise<void>;

    /**
     * Function that executes when a player draws this card.
     */
    drawEffect: (player: Player, game: Game) => Promise<boolean>;
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

export const cards = new Map<CardTypes, CardPrototype>();

cards.set(CardTypes.BOMB, {
    type: CardTypes.BOMB,
    icon: '💣',
    color: 'rgb(39, 39, 39)',
    name: 'Imploding Puppy',
    description: 'You are out of the game if you draw this card!',
    count: (playerCount) => playerCount - 1,
    playTest: () => false,
    playEffect: async (player, game) => {
        // A player can only use this card by playing a defuse, so the play effect of this card is just putting it back in the deck.
        await game.insertIntoDeck(player, CardTypes.BOMB);
    },
    drawEffect: async (player, game) => {
        const defuse = player.find(CardTypes.DEFUSE);
        if (defuse === undefined) {
            await player.die();
            return false;
        } else {
            await player.useCard(CardTypes.DEFUSE, game);
        }

        return true;
    }
});

cards.set(CardTypes.DEFUSE, {
    type: CardTypes.DEFUSE,
    icon: '🎰',
    color: 'rgb(57, 92, 46)',
    name: 'Defuse',
    description: 'Use this card to put another card back in the deck.',
    count: 6,
    playTest: () => false,
    playEffect: async (player, game) => {
        // A player can only play this as a result of drawing a bomb, so he must have one in his hand.
        await player.useCard(CardTypes.BOMB, game);
    },
    drawEffect: async () => true
});

cards.set(CardTypes.SHUFFLE, {
    type: CardTypes.SHUFFLE,
    icon: '🎲',
    color: 'rgb(92, 64, 46)',
    name: 'Shuffle',
    description: 'Use this card to shuffle the deck.',
    count: 4,
    playTest: (player, selection) => selection.length === 0 || fiveDifferent(player, selection, CardTypes.SHUFFLE) || twoOrThreeSame(player, selection, CardTypes.SHUFFLE),
    playEffect: async (player, game) => {
        game.deck.shuffle();
    },
    drawEffect: async () => true
});

cards.set(CardTypes.NOPE, {
    type: CardTypes.NOPE,
    icon: '⛔',
    color: 'rgb(92, 46, 46)',
    name: 'Nope',
    description: 'Use this card to prevent another player\'s action.',
    count: 5,
    playTest: (player, selection) => fiveDifferent(player, selection, CardTypes.NOPE) || twoOrThreeSame(player, selection, CardTypes.NOPE),
    playEffect: async () => undefined,
    drawEffect: async () => true
});

cards.set(CardTypes.SKIP, {
    type: CardTypes.SKIP,
    icon: '🏃',
    color: 'rgb(46, 47, 92)',
    name: 'Skip',
    description: 'Use this card to skip drawing a card.',
    count: 4,
    playTest: (player, selection) => selection.length === 0 || fiveDifferent(player, selection, CardTypes.SKIP) || twoOrThreeSame(player, selection, CardTypes.SKIP),
    playEffect: async (player, game) => game.processSkip(),
    drawEffect: async () => true
});

cards.set(CardTypes.ATTACK, {
    type: CardTypes.ATTACK,
    icon: '🚲',
    color: 'rgb(46, 92, 58)',
    name: 'Attack',
    description: 'Use this card to skip drawing a card and make the next player take 2 turns',
    count: 4,
    playTest: (player, selection) => selection.length === 0 || fiveDifferent(player, selection, CardTypes.ATTACK) || twoOrThreeSame(player, selection, CardTypes.ATTACK),
    playEffect: async (player, game) => game.processAttack(),
    drawEffect: async () => true
});

cards.set(CardTypes.FAVOR, {
    type: CardTypes.FAVOR,
    icon: '🖤',
    color: 'rgb(39, 39, 39)',
    name: 'Favor',
    description: 'Use this card to ask another player\'s card.',
    count: 4,
    playTest: (player, selection) => selection.length === 0 || fiveDifferent(player, selection, CardTypes.FAVOR) || twoOrThreeSame(player, selection, CardTypes.FAVOR),
    playEffect: async (player, game) => {
        const target = await game.choosePlayer(player);
        if (!await game.waitForNopes() && target.cards.length > 0) {
            const card = await target.chooseCard();
            player.cards.push(card);
        }
    },
    drawEffect: async () => true
});

cards.set(CardTypes.FUTURE, {
    type: CardTypes.FUTURE,
    icon: '🔮',
    color: 'rgb(92, 46, 78)',
    name: 'See the future',
    description: 'Use this card to see the top three cards.',
    count: 5,
    playTest: (player, selection) => selection.length === 0 || fiveDifferent(player, selection, CardTypes.FUTURE) || twoOrThreeSame(player, selection, CardTypes.FUTURE),
    playEffect: async (player, game) => {
        // const top = game.deck.seeTop();

        // Todo show the card to the player.
    },
    drawEffect: async () => true
});

const icons = ['🐕', '🐈', '🐦', '🐟', '🐔'];
[CardTypes.PUPPY_1, CardTypes.PUPPY_2, CardTypes.PUPPY_3, CardTypes.PUPPY_4, CardTypes.PUPPY_5].forEach((type, i) => {
    cards.set(type, {
        type,
        icon: icons[i],
        color: 'rgb(92, 91, 46)',
        name: 'Animal',
        description: 'A collectable. Does nothing',
        count: 4,
        playTest: (player, selection) => fiveDifferent(player, selection, CardTypes.ATTACK) || twoOrThreeSame(player, selection, CardTypes.ATTACK),
        playEffect: async () => undefined,
        drawEffect: async () => true
    });
});

let cardCounter = 0;

export enum OwnerType {
    PLAYER = 'player',
    DECK = 'deck',
    DISCARD = 'discard'
}

interface Owner {
    type: OwnerType;
    data?: number;
}

export class Card {
    static sortFn(a: Card, b: Card) {
        return a.prototype.name.localeCompare(b.prototype.name);
    }

    id: number;
    prototype: CardPrototype;
    owner: Owner;

    constructor(proto: CardPrototype, owner?: Owner) {
        this.id = cardCounter++;
        this.prototype = proto;
        this.owner = owner || { type: OwnerType.DECK };
    }
}
