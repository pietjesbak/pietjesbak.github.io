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

export const enum AnnouncementSubject {
    TEXT,
    PLAYER,
    ACTION
}

export class Announcement {

    get message() {
        return this.formattedMessage.map(([subject, text]) => text).join('');
    }

    get formattedMessage(): Array<[AnnouncementSubject, string]> {
        switch (this.type_) {
            case AnnouncementTypes.DRAW_CARD:
                return [
                    [AnnouncementSubject.PLAYER, this.source_!.name],
                    [AnnouncementSubject.TEXT, ' draws a '],
                    [AnnouncementSubject.TEXT, this.cardName],
                    [AnnouncementSubject.TEXT, '!']
                ];

            case AnnouncementTypes.PLAY_CARD:
                return [
                    [AnnouncementSubject.PLAYER, this.source_!.name],
                    [AnnouncementSubject.TEXT, ' plays a '],
                    [AnnouncementSubject.ACTION, this.cardName],
                    [AnnouncementSubject.TEXT, '!']
                ];

            case AnnouncementTypes.FAVOR_FROM:
                return [
                    [AnnouncementSubject.PLAYER, this.source_!.name],
                    [AnnouncementSubject.TEXT, ' wants a favor from '],
                    [AnnouncementSubject.PLAYER, this.target_!.name],
                    [AnnouncementSubject.TEXT, '!']
                ];

            case AnnouncementTypes.SHUFFLE:
                return [
                    [AnnouncementSubject.PLAYER, this.source_!.name],
                    [AnnouncementSubject.TEXT, ' shuffles the deck!']
                ];

            case AnnouncementTypes.TWO_OF_A_KIND:
                return [
                    [AnnouncementSubject.PLAYER, this.source_!.name],
                    [AnnouncementSubject.TEXT, ' plays two of a kind to steal a random card from '],
                    [AnnouncementSubject.PLAYER, this.target_!.name],
                    [AnnouncementSubject.TEXT, '!']
                ];

            case AnnouncementTypes.THREE_OF_A_KIND:
                return [
                    [AnnouncementSubject.PLAYER, this.source_!.name],
                    [AnnouncementSubject.TEXT, ' plays three of a kind to steal a specific card from '],
                    [AnnouncementSubject.PLAYER, this.target_!.name],
                    [AnnouncementSubject.TEXT, '!']
                ];

            case AnnouncementTypes.WANTS:
                return [
                    [AnnouncementSubject.PLAYER, this.source_!.name],
                    [AnnouncementSubject.TEXT, ' wants to steal a '],
                    [AnnouncementSubject.ACTION, this.cardName],
                    [AnnouncementSubject.TEXT, ' from '],
                    [AnnouncementSubject.PLAYER, this.target!.name],
                    [AnnouncementSubject.TEXT, '!']
                ];

            case AnnouncementTypes.FIVE_DIFFERENT:
                return [
                    [AnnouncementSubject.PLAYER, this.source_!.name],
                    [AnnouncementSubject.TEXT, ' plays 5 different cards to take from the discard pile!']
                ];


            case AnnouncementTypes.TAKE:
                let bits: Array<[AnnouncementSubject, string]> = [];
                if (this.target_ !== undefined) {
                    bits = [
                        [AnnouncementSubject.TEXT, ' from '],
                        [AnnouncementSubject.PLAYER, this.target_!.name]
                    ];
                }
                return [
                    [AnnouncementSubject.PLAYER, this.source_!.name],
                    [AnnouncementSubject.TEXT, ' takes a '],
                    [AnnouncementSubject.ACTION, this.cardName],
                    ...bits,
                    [AnnouncementSubject.TEXT, '!']
                ];

            case AnnouncementTypes.PUT_BOMB:
                return [
                    [AnnouncementSubject.PLAYER, this.source_!.name],
                    [AnnouncementSubject.TEXT, ' defused and puts the bomb back in the deck!']
                ];

            case AnnouncementTypes.NOPE:
                return [
                    [AnnouncementSubject.PLAYER, this.source_!.name],
                    [AnnouncementSubject.TEXT, ' nopes '],
                    [AnnouncementSubject.PLAYER, this.target_!.name],
                    [AnnouncementSubject.TEXT, '\'s '],
                    [AnnouncementSubject.ACTION, this.cardName],
                    [AnnouncementSubject.TEXT, '!'],
                    [AnnouncementSubject.ACTION, ' -- NOPE']
                ];

            case AnnouncementTypes.YUP:
                return [
                    [AnnouncementSubject.PLAYER, this.source_!.name],
                    [AnnouncementSubject.TEXT, ' nopes '],
                    [AnnouncementSubject.PLAYER, this.target_!.name],
                    [AnnouncementSubject.TEXT, '\'s '],
                    [AnnouncementSubject.ACTION, this.cardName],
                    [AnnouncementSubject.TEXT, '!'],
                    [AnnouncementSubject.ACTION, ' -- YUP']
                ];

            case AnnouncementTypes.FUTURE:
                return [
                    [AnnouncementSubject.PLAYER, this.source_!.name],
                    [AnnouncementSubject.TEXT, ' sees the future!']
                ];

            case AnnouncementTypes.DIE:
                return [
                    [AnnouncementSubject.PLAYER, this.source_!.name],
                    [AnnouncementSubject.TEXT, ' explodes!']
                ];

            case AnnouncementTypes.GAME_OVER:
                return [
                    [AnnouncementSubject.ACTION, 'Game over! '],
                    [AnnouncementSubject.PLAYER, this.source_!.name],
                    [AnnouncementSubject.TEXT, ' wins the game!']
                ];

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
