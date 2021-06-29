import { Announcement, AnnouncementTypes } from "./Announcement";
import { cards, CardTypes } from "./Cards";
import { Game } from "./Game";
import { Player } from "./Player";

export interface PlayerPlay {
  /**
   * A function that tests if this is the action that should be performed.
   */
  test: (selection: CardTypes[], player: Player, game: Game) => boolean;

  /**
   * Does this action require the player to select a target first.
   */
  requireTarget: (
    selection: CardTypes[],
    player: Player,
    game: Game
  ) => boolean;

  /**
   * Function to announce which action the player is going to perform.
   */
  announce: (
    Selection: CardTypes[],
    player: Player,
    game: Game,
    target?: Player
  ) => void;

  /**
   * Performs the action. The action can be async.
   */
  action: (
    selection: CardTypes[],
    player: Player,
    game: Game,
    target?: Player
  ) => Promise<void> | void;
}

/**
 * An array of all possible actions a player can perform using the playing cards.
 */
export const plays: PlayerPlay[] = [
  {
    test: (selection) =>
      selection.length === 1 &&
      cards.get(selection[0])!.playEffect !== undefined,
    requireTarget: (selection) => cards.get(selection[0])!.requireTarget,
    announce: (selection, player, game, target) => {
      const announcement = cards.get(selection[0])!.announce;
      game.announce(
        announcement
          ? announcement(player, game, target)
          : new Announcement(
              AnnouncementTypes.PLAY_CARD,
              selection,
              game.currentPlayer
            )
      );
    },
    action: (selection, player, game, target) =>
      cards.get(selection[0])!.playEffect!(player, game, target),
  },
  {
    test: (selection) =>
      selection.length === 2 && selection[0] === selection[1],
    requireTarget: () => true,
    announce: (selection, player, game, target) =>
      game.announce(
        new Announcement(
          AnnouncementTypes.TWO_OF_A_KIND,
          selection,
          player,
          target
        )
      ),
    action: (selection, player, game, target) => {
      const card = target!.stealCard(undefined, game);
      if (card !== undefined) {
        player.addCard(card, game);
        game.announce(
          new Announcement(AnnouncementTypes.TAKE, undefined, player, target)
        );
      }
    },
  },
  {
    test: (selection) =>
      selection.length === 3 &&
      selection.every((type) => type === selection[0]),
    requireTarget: () => true,
    announce: (selection, player, game, target) =>
      game.announce(
        new Announcement(
          AnnouncementTypes.THREE_OF_A_KIND,
          selection,
          player,
          target
        )
      ),
    action: async (selection, player, game, target) => {
      const options = Object.values(CardTypes).filter(
        (type) => type !== CardTypes.BOMB
      );
      const selectedType = (await game.selectCard(player, options)).data!
        .selection;
      game.announce(
        new Announcement(
          AnnouncementTypes.WANTS,
          [selectedType],
          player,
          target
        )
      );

      const selectedCard = target!.stealCard(selectedType, game);
      if (selectedCard !== undefined) {
        player.addCard(selectedCard, game);
        game.announce(
          new Announcement(
            AnnouncementTypes.TAKE,
            [selectedType],
            player,
            target
          )
        );
      }
    },
  },
  {
    test: (selection, player, game) =>
      selection.length === 5 &&
      new Set(selection).size === 5 &&
      game.discardPile.length > 0,
    requireTarget: () => false,
    announce: (selection, player, game, target) =>
      game.announce(
        new Announcement(AnnouncementTypes.FIVE_DIFFERENT, selection, player)
      ),
    action: async (selection, player, game, target) => {
      const options = [
        ...new Set(game.discardPile.map((c) => c.prototype.type)),
      ].filter((type) => type !== CardTypes.BOMB);
      const selectedType = (await game.selectCard(player, options)).data!
        .selection;

      const card = game.discardPile.find(
        (c) => c.prototype.type === selectedType
      )!;
      game.announce(
        new Announcement(AnnouncementTypes.TAKE, [selectedType], player)
      );

      game.discardPile.splice(game.discardPile.indexOf(card), 1);
      player.addCard(card, game);
    },
  },
];
