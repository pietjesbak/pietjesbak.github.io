import { cards, CardTypes } from './Cards';
import { Game } from './Game';
import { Player } from './Player';

export const enum AnnouncementTypes {
    DRAW_CARD,
    PLAY_CARD,
    SHUFFLE,
    FAVOR_FROM,
    TWO_OF_A_KIND,
    THREE_OF_A_KIND,
    WANTS,
    FIVE_DIFFERENT,
    TAKE,
    PUT_BOMB,
    NOPE,
    YUP,
    FUTURE,
    DIE,
    GAME_OVER
}

export class Announcement {

    get message() {
        switch (this.type_) {
            case AnnouncementTypes.DRAW_CARD:
                return `${this.source_!.name} draws a ${this.cardName}!`;

            case AnnouncementTypes.PLAY_CARD:
                return `${this.source_!.name} plays a ${this.cardName}!`;

            case AnnouncementTypes.FAVOR_FROM:
                return `${this.source_!.name} wants a favor from ${this.target_!.name}!`;

            case AnnouncementTypes.SHUFFLE:
                return `${this.source_!.name} shuffles the deck!`;

            case AnnouncementTypes.TWO_OF_A_KIND:
                return `${this.source_!.name} plays two of a kind to steal a random card from ${this.target_!.name}!`;

            case AnnouncementTypes.THREE_OF_A_KIND:
                return `${this.source_!.name} plays three of a kind to steal a specific card from ${this.target_!.name}!`;

            case AnnouncementTypes.WANTS:
                return `${this.source_!.name} wants to steal a ${this.cardName} from ${this.target_!.name}!`;

            case AnnouncementTypes.FIVE_DIFFERENT:
                return `${this.source_!.name} plays 5 different cards to take from the discard pile!`;

            case AnnouncementTypes.TAKE:
                return `${this.source_!.name} takes a ${this.cardName}${this.target_ !== undefined ? ` from ${this.target_.name}` : ''}!`;

            case AnnouncementTypes.PUT_BOMB:
                return `${this.source_!.name} defused and puts a bomb back in the deck!`;

            case AnnouncementTypes.NOPE:
                return `${this.source_!.name} nopes ${this.target_!.name}'s ${this.cardName}! -- NOPE`;

            case AnnouncementTypes.YUP:
                return `${this.source_!.name} nopes ${this.target_!.name}'s ${this.cardName}! -- YUP`;

            case AnnouncementTypes.FUTURE:
                return `${this.source_!.name} sees the future!`;

            case AnnouncementTypes.DIE:
                return `${this.source_!.name} explodes!`;

            case AnnouncementTypes.GAME_OVER:
                return `Game over! ${this.source_!.name} wins the game!`;

            default:
                throw new Error('Incomplete announcement!');
        }
    }

    get source() {
        return this.source_;
    }

    get target() {
        return this.target_;
    }

    get timestamp() {
        return this.timestamp_;
    }

    get isStealAction() {
        return this.target_ !== undefined && (
            this.type_ === AnnouncementTypes.TWO_OF_A_KIND ||
            this.type_ === AnnouncementTypes.THREE_OF_A_KIND ||
            this.type_ === AnnouncementTypes.FAVOR_FROM
        );
    }

    private get cardName() {
        if (this.cards_ === undefined) {
            return 'card';
        }

        if (this.cards_.length === 2) {
            return 'two of a kind';
        }

        if (this.cards_.length === 3) {
            return 'three of a kind';
        }

        if (this.cards_.length === 5) {
            return 'five different cards';
        }

        return cards.get(this.cards_[0])!.name;
    }

    static deserialize(game: Game, data: any) {
        return new Announcement(
            data.type,
            data.cards ? data.cards : undefined,
            typeof data.source === 'number' ? game.players[data.source] : undefined,
            typeof data.target === 'number' ? game.players[data.target] : undefined
        );
    }

    private source_?: Player;

    private target_?: Player;

    private type_: AnnouncementTypes;

    private cards_?: CardTypes[];

    private timestamp_: number;

    constructor(type: AnnouncementTypes, types?: CardTypes[], source?: Player, target?: Player) {
        this.type_ = type;
        this.cards_ = types;
        this.source_ = source;
        this.target_ = target;

        this.timestamp_ = Date.now();
    }

    serialize(game: Game) {
        return {
            type: this.type_,
            source: this.source_ && this.source_.id,
            target: this.target_ && this.target_.id,
            cards: this.cards_ && this.cards_
        };
    }
}
