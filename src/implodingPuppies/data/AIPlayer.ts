import { clamp, repeat } from "../../Helpers";
import { Announcement, AnnouncementTypes } from "./Announcement";
import BotConnection from "./BotConnection";
import { getBotName } from "./BotNames";
import { cards, CardTypes } from "./Cards";
import { Game } from "./Game";
import { DataType, PeerData } from "./PeerBase";

export interface Personality {
  paranoia: number;
  randomness: number;
  generousity: number;
}

export interface WeightedPlay {
  selection: CardTypes[];
  weight: number;
}

export const enum Action {
  SKIP,
  ATTACK,
  FAVOR,
  TWO_OF_A_KIND,
  THREE_OF_A_KIND,
  FIVE_DIFFERENT,
}

const cardToAction = (type: CardTypes) => {
  switch (type) {
    case CardTypes.FAVOR:
      return Action.FAVOR;
    case CardTypes.SKIP:
      return Action.SKIP;
    case CardTypes.ATTACK:
      return Action.ATTACK;

    default:
      return undefined;
  }
};

const announcementToAction = (type: AnnouncementTypes) => {
  switch (type) {
    case AnnouncementTypes.TWO_OF_A_KIND:
      return Action.TWO_OF_A_KIND;
    case AnnouncementTypes.THREE_OF_A_KIND:
      return Action.THREE_OF_A_KIND;
    case AnnouncementTypes.FIVE_DIFFERENT:
      return Action.FIVE_DIFFERENT;
    case AnnouncementTypes.FAVOR_FROM:
      return Action.FAVOR;

    default:
      return undefined;
  }
};

export class AIPlayer extends BotConnection {
  static actionThreats = new Map<Action, number>([
    [Action.FAVOR, 1],
    [Action.TWO_OF_A_KIND, 3],
    [Action.THREE_OF_A_KIND, 5],
    [Action.FIVE_DIFFERENT, 8],
  ]);

  private bombPositions_: number[] = [];

  private safePositions_: number[] = [];

  private playerKarma_: Map<number, number>;

  private alivePlayers_: number;

  private ownId_: number;

  private currentTarget_: number = -1;

  private lastBombedPlayer_: number = -1;

  private lastBombDeckSize_: number = -1;

  private currentPlayer_: number;

  private currentNopeResult_: boolean;

  private currentAction_: Action;

  private deckSize_: number;

  private discardPile_: CardTypes[];

  private ownCards_: CardTypes[];

  private playsThisTurn_: CardTypes[][] = [];

  constructor(game: Game) {
    super(game);

    Promise.resolve().then(() => {
      this.dataAction(
        {
          type: DataType.JOIN,
          name: getBotName(game.players.map((p) => p.name)),
        },
        true
      );
    });
  }

  /**
   * Process all the data the server sends to us.
   * @param data The data the server sends us.
   */
  send(data: PeerData) {
    switch (data.type) {
      case DataType.JOIN:
        // Initialize with a bit of random karma.
        this.playerKarma_ = new Map(
          (data.players as Array<{ id: number }>).map(
            ({ id }) => [id, Math.random() - 0.5] as [number, number]
          )
        );

        this.alivePlayers_ = this.playerKarma_.size;
        break;

      case DataType.UPDATE_STATE:
        this.currentPlayer_ = data.currentPlayer;
        this.ownId_ = data.ownId;
        this.deckSize_ = data.deck;
        this.discardPile_ = data.discard;

        this.ownCards_ = data.players[this.ownId_].cards;
        break;

      case DataType.ANNOUNCEMENT:
        this.processAnnouncement(
          Announcement.deserialize(this.game_, data.announcement)
        );
        break;

      case DataType.GIVE_OPTIONS:
        const probability = this.getModifiedBombProbability();

        // If someone put a bomb back recently, try figuring out if they put it for us or not.
        const lastBombedKarma =
          this.playerKarma_.get(this.lastBombedPlayer_) || 0;
        const carefulness =
          this.lastBombDeckSize_ === -1
            ? 0
            : (1 / (this.lastBombDeckSize_ - this.deckSize_ || 1)) * 0.5 +
              clamp(-2, lastBombedKarma, 2) * -0.2;

        let played = false;
        if (probability + carefulness > 0.33 || Math.random() > 0.9) {
          played = this.tryPlay();
        }

        if (played === false) {
          this.playsThisTurn_ = [];
          this.dataAction({
            type: DataType.DRAW,
          });
        }
        break;

      case DataType.SEE_FUTURE:
        const types = data.future as CardTypes[];
        this.processFuture(types);
        break;

      case DataType.CARD_SELECT:
        const scores = this.getCardsScore(data.cards);
        let card: CardTypes;
        if (this.currentTarget_ === this.ownId_) {
          card = scores[0].type;
        } else {
          card = scores[scores.length - 1].type;
        }

        this.dataAction({
          type: DataType.CARD_SELECT,
          cardType: card,
        });
        break;

      case DataType.PLAYER_SELECT:
        const options = data.players as number[];
        const playerArr = [...this.playerKarma_.entries()].sort(
          (a, b) => a[1] - b[1]
        );

        this.dataAction({
          type: DataType.PLAYER_SELECT,
          player: playerArr.find(
            ([id, karma]) => options.indexOf(id) !== -1
          )![0],
        });
        break;

      case DataType.INSERT_CARD:
        const maxPosition = data.position as number;
        const target = [...this.playerKarma_.entries()].sort(
          (a, b) => a[1] - b[1]
        )[0][0];

        let newPosition = 0;
        let playerIndex = (this.currentPlayer_ + 1) % this.game_.playerCount;
        while (newPosition < maxPosition) {
          if (
            playerIndex === target &&
            Math.random() > 0.7 - newPosition / 10
          ) {
            break;
          }
          newPosition++;
        }

        this.bombPositions_.push(maxPosition - newPosition + 1);
        this.dataAction({
          type: DataType.INSERT_CARD,
          position: newPosition,
        });
        break;

      case DataType.NOPE:
        const actionThreshold = Math.random() * 3 + 2;
        if (
          (this.hasCards([CardTypes.NOPE]) &&
            this.currentTarget_ === this.ownId_ &&
            this.currentNopeResult_ === false &&
            AIPlayer.actionThreats.get(this.currentAction_)! >
              actionThreshold) ||
          (this.currentPlayer_ === this.ownId_ &&
            this.currentNopeResult_ === true &&
            AIPlayer.actionThreats.get(this.currentAction_)! >
              actionThreshold) ||
          (this.currentTarget_ === -1 &&
            this.currentNopeResult_ === false &&
            AIPlayer.actionThreats.get(this.currentAction_)! > actionThreshold)
        ) {
          this.dataAction({
            type: DataType.NOPE,
          });
        }
        break;
    }
  }

  /**
   * Check the current announcement to figure out what is going on in the game.
   * @param announcement The announcement.
   */
  processAnnouncement(announcement: Announcement) {
    let action = announcementToAction(announcement.type);

    if (action !== undefined) {
      this.currentAction_ = action;
      if (announcement.target !== undefined) {
        this.currentTarget_ = announcement.target.id;
        this.processActionConsequences();
      } else {
        this.currentTarget_ = -1;
      }
    }

    switch (announcement.type) {
      case AnnouncementTypes.PLAY_CARD:
        action = cardToAction(announcement.cards![0]);
        if (action !== undefined) {
          this.currentTarget_ = this.getNextPlayerTarget();
          this.currentAction_ = action;
          this.processActionConsequences();
        }

        this.currentNopeResult_ = false;
        break;

      case AnnouncementTypes.SHUFFLE:
        this.bombPositions_ = [];
        this.safePositions_ = [];
        this.lastBombDeckSize_ = -1;
        this.lastBombedPlayer_ = -1;

        if (this.lastBombedPlayer_ === this.ownId_) {
          this.playerKarma_.set(
            this.currentPlayer_,
            this.playerKarma_.get(this.currentPlayer_)! - 0.5
          );
        }
        break;

      case AnnouncementTypes.DIE:
        this.alivePlayers_--;
        this.lastBombDeckSize_ = -1;
        break;

      case AnnouncementTypes.YUP:
        this.currentNopeResult_ = false;
        if (announcement.source!.id !== this.ownId_) {
          if (this.currentTarget_ === this.ownId_) {
            this.playerKarma_.set(
              announcement.source!.id,
              this.playerKarma_.get(announcement.source!.id)! - 1
            );
          } else if (this.currentPlayer_ === this.ownId_) {
            this.playerKarma_.set(
              announcement.source!.id,
              this.playerKarma_.get(announcement.source!.id)! + 1
            );
          }
        }
        break;

      case AnnouncementTypes.NOPE:
        this.currentNopeResult_ = true;
        if (announcement.source!.id !== this.ownId_) {
          if (this.currentTarget_ === this.ownId_) {
            this.playerKarma_.set(
              announcement.source!.id,
              this.playerKarma_.get(announcement.source!.id)! + 1
            );
          } else if (this.currentPlayer_ === this.ownId_) {
            this.playerKarma_.set(
              announcement.source!.id,
              this.playerKarma_.get(announcement.source!.id)! - 1
            );
          }
        }
        break;

      case AnnouncementTypes.PUT_BOMB:
        // Assume the other player put the bomb for us.
        if (
          this.lastBombedPlayer_ !== this.ownId_ &&
          this.lastBombedPlayer_ !== -1 &&
          this.currentPlayer_ === this.ownId_
        ) {
          this.playerKarma_.set(
            this.lastBombedPlayer_,
            this.playerKarma_.get(this.lastBombedPlayer_)! - 3
          );
        }

        // So we are more carful when someone defused recently.
        if (this.currentPlayer_ !== this.ownId_) {
          this.lastBombDeckSize_ = this.deckSize_;
        } else {
          this.lastBombDeckSize_ = -1;
        }

        this.lastBombedPlayer_ = this.currentPlayer_;
        break;
    }
  }

  /**
   * If another player targets us, we lower their karma, so we are more likely to target them in the future.
   */
  processActionConsequences() {
    const consequence = AIPlayer.actionThreats.get(this.currentAction_) || 0;
    if (this.currentPlayer_ !== this.ownId_) {
      if (this.currentTarget_ === this.ownId_) {
        this.playerKarma_.set(
          this.currentPlayer_,
          this.playerKarma_.get(this.currentPlayer_)! -
            (consequence * Math.random()) / 2 +
            0.5
        );
      } else {
        this.playerKarma_.set(
          this.currentPlayer_,
          this.playerKarma_.get(this.currentPlayer_)! +
            (consequence * Math.random()) / 2
        );
      }
    }
  }

  /**
   * Check the future, mark bombs as unsafe and other cards as safe.
   * @param types The future.
   */
  processFuture(types: CardTypes[]) {
    for (let i = 0; i < types.length; i++) {
      if (types[i] === CardTypes.BOMB) {
        this.bombPositions_.push(this.deckSize_ - i);
      } else {
        this.safePositions_.push(this.deckSize_ - i);
      }
    }

    this.dataAction({
      type: DataType.CONFIRM,
    });
  }

  /**
   * Check all our options and play the one we think is best.
   */
  tryPlay() {
    const options: WeightedPlay[] = [];

    if (
      this.hasCards([CardTypes.SHUFFLE]) &&
      !this.checkIfPlayedThisRound(CardTypes.SHUFFLE)
    ) {
      options.push({
        selection: [CardTypes.SHUFFLE],
        weight:
          (1 - this.getModifiedBombProbability()) * (Math.random() / 2 + 0.5),
      });
    }

    if (
      this.hasCards([CardTypes.FUTURE]) &&
      !this.checkIfPlayedThisRound(CardTypes.FUTURE) &&
      this.bombPositions_[this.bombPositions_.length - 1] >
        this.game_.deck.cards.length
    ) {
      options.push({
        selection: [CardTypes.FUTURE],
        weight: 0.6 * (Math.random() / 2 + 0.5),
      });
    }

    if (this.hasCards([CardTypes.SKIP])) {
      options.push({
        selection: [CardTypes.SKIP],
        weight:
          this.bombPositions_[this.bombPositions_.length - 1] ===
          this.game_.deck.cards.length
            ? 0.8
            : 0.1,
      });
    }

    if (this.hasCards([CardTypes.ATTACK])) {
      options.push({
        selection: [CardTypes.ATTACK],
        weight:
          this.bombPositions_[this.bombPositions_.length - 1] ===
          this.game_.deck.cards.length
            ? 0.6
            : 0.1,
      });
    }

    if (this.hasCards([CardTypes.FAVOR])) {
      options.push({
        selection: [CardTypes.FAVOR],
        weight: 0.4 * (Math.random() / 2 + 0.5),
      });
    }

    if (this.hasCards([CardTypes.DEFUSE])) {
      options.push({
        selection: [CardTypes.DEFUSE],
        weight: 0.3 * (Math.random() / 2 + 0.5),
      });
    }

    [
      CardTypes.PUPPY_1,
      CardTypes.PUPPY_2,
      CardTypes.PUPPY_3,
      CardTypes.PUPPY_4,
      CardTypes.PUPPY_5,
    ].forEach((type) => this.addOfAKindOption(type, 0.3, options));
    [CardTypes.NOPE, CardTypes.FAVOR, CardTypes.SHUFFLE].forEach((type) =>
      this.addOfAKindOption(type, 0.2, options)
    );

    if (
      this.discardPile_.find((type) => type === CardTypes.DEFUSE) !==
        undefined &&
      new Set(this.ownCards_.filter((type) => type !== CardTypes.DEFUSE))
        .size >= 5
    ) {
      const scores = this.getCardsScore(this.ownCards_).sort(
        (a, b) => b.score - a.score
      );
      const selection: CardTypes[] = [];
      while (selection.length < 5) {
        selection.push(scores.pop()!.type);
      }

      options.push({
        selection,
        weight: 0.2 * (Math.random() / 2 + 0.5),
      });
    }

    options.sort((a, b) => b.weight - a.weight);
    if (options.length > 0 && options[0].selection[0] !== CardTypes.DEFUSE) {
      const choice = options[0].selection;
      this.playsThisTurn_.push(choice);

      this.dataAction({
        type: DataType.PLAY,
        selection: choice,
      });
      return true;
    }

    return false;
  }

  /**
   * Check if we can perform a two or three of a kind option.
   * @param type The type of cards to play.
   * @param weight The base weight of this action.
   * @param options The array to add the option to.
   */
  addOfAKindOption(type: CardTypes, weight: number, options: WeightedPlay[]) {
    const count = this.ownCards_.filter((card) => card === type).length;
    if (count >= 2) {
      options.push({
        selection: repeat(count > 2 ? 3 : 2).map(() => type),
        weight: weight * (Math.random() / 2 + 0.5),
      });
    }
  }

  /**
   * Check if we own all the given cards.
   * @param types The cards to check.
   */
  hasCards(types: CardTypes[]) {
    const copy = [...this.ownCards_];
    for (const type of types) {
      const index = copy.indexOf(type);
      if (index === -1) {
        return false;
      } else {
        copy.splice(index, 1);
      }
    }

    return true;
  }

  /**
   * Get the actual bomb probability.
   */
  getBombProbability() {
    return (this.alivePlayers_ - 1) / this.deckSize_;
  }

  /**
   * Get the bomb probability based on what we know and some randomness applied.
   */
  getModifiedBombProbability() {
    if (this.bombPositions_.indexOf(this.deckSize_) !== -1) {
      return 1;
    }

    if (this.safePositions_.indexOf(this.deckSize_) !== -1) {
      return 0;
    }

    return this.getBombProbability() * (1 + Math.random());
  }

  /**
   * Give all cards a score so we know which ones we don't want to give away / which ones we want to steal.
   * @param options The types to give a score.
   */
  getCardsScore(options: CardTypes[]) {
    const scores: { [type in CardTypes]?: number } = {};
    for (let type of options) {
      if (type in scores) {
        continue;
      }

      scores[type] = cards.get(type)!.score(this.ownCards_, this.game_);
    }

    const scoreArr: Array<{ type: CardTypes; score: number }> = [];
    for (let type in scores) {
      scoreArr.push({
        type: type as CardTypes,
        score: scores[type],
      });
    }
    return scoreArr.sort((a, b) => a.score - b.score);
  }

  /**
   * Get the player that is the target of an attack or a skip.
   */
  getNextPlayerTarget() {
    let nextTarget = this.currentPlayer_;
    do {
      nextTarget = (nextTarget + 1) % this.game_.playerCount;
    } while (!this.game_.players[nextTarget].alive);

    return nextTarget;
  }

  /**
   * Check so we don't play 2 shuffles or see the futures in the same turn.
   * @param type The type of card to check.
   */
  checkIfPlayedThisRound(type: CardTypes) {
    return (
      this.playsThisTurn_.find(
        (types) => types.length === 1 && types[0] === type
      ) !== undefined
    );
  }
}
