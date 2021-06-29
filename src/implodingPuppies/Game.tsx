import "./css/Game.css";

import classNames from "classnames";
import * as React from "react";
import * as ReactDOM from "react-dom";
import Announcements from "./Announcements";
import { Game as GameData } from "./data/Game";
import { PeerBase } from "./data/PeerBase";
import { Player as PlayerData } from "./data/Player";
import { Server } from "./data/Server";
import Deck from "./Deck";
import Player from "./Player";
import RemotePlayer from "./RemotePlayer";

interface Props {
  server: PeerBase;
}

interface State {
  players: PlayerData[];
  playerAngles: Map<number, number>;
  width: number;
}

class Game extends React.Component<Props & React.ClassAttributes<Game>, State> {
  static MIN_SCREEN_WIDTH = 600;

  private playerDrawFn_?: () => void;

  constructor(props: Props & React.ClassAttributes<Game>) {
    super(props);

    this.state = {
      players: [],
      width: 960,
      playerAngles: new Map(),
    };
  }

  get isSmall() {
    return this.state.width < Game.MIN_SCREEN_WIDTH;
  }

  componentDidMount() {
    window.addEventListener("resize", this.updateWidth);

    // Calculate the correct angle for every player.
    // The own player should be at the bottom and the others around him in the right order.
    const playerAngles = new Map<number, number>();
    playerAngles.set(this.props.server.ownId, Math.PI / 2);

    let i = this.props.server.ownId;
    let counter = 0;
    while (true) {
      i++;
      if (i >= this.props.server.players.length) {
        i = 0;
      }

      if (i === this.props.server.ownId) {
        break;
      }

      playerAngles.set(i, this.getPlayerAngle_(counter));
      counter++;
    }

    this.setState({
      width: (ReactDOM.findDOMNode(this) as HTMLElement).clientWidth,
      playerAngles,
    });
  }

  componentWillUnmount() {
    this.props.server.shutDown();
    window.removeEventListener("resize", this.updateWidth);
  }

  updateWidth = () => {
    this.setState({
      width: (ReactDOM.findDOMNode(this) as HTMLElement).clientWidth,
    });
  };

  forceStart = () => {
    (this.props.server as Server).start();
  };

  onDeckClick = () => {
    if (typeof this.playerDrawFn_ === "function") {
      this.playerDrawFn_();
    }
  };

  setDrawFn = (drawFn?: () => void) => {
    this.playerDrawFn_ = drawFn;
  };

  getPlayerPos = (playerId: number) => {
    const newId = playerId > this.props.server.ownId ? playerId - 1 : playerId;
    const angle = this.state.playerAngles.get(playerId)!;
    const height = 280;

    if (!this.isSmall) {
      return {
        angle,
        x: (Math.cos(angle) * this.state.width) / 3,
        y: Math.sin(angle) * height,
      };
    } else {
      if (playerId === this.props.server.ownId) {
        return {
          angle,
          x: -this.state.width / 2 + 75,
          y: 168,
        };
      } else {
        return {
          angle,
          x:
            (newId % 2 === 0 ? 0 : this.state.width / 2) -
            this.state.width / 4 -
            25,
          y:
            Math.floor(newId / 2) * 70 -
            height +
            Math.floor(
              (GameData.MAX_PLAYER_COUNT - this.props.server.game.playerCount) /
                2
            ) *
              70,
        };
      }
    }
  };

  getRemotePlayerPosition(player: PlayerData): { transform: string } {
    const { x, y } = this.getPlayerPos(player.id);

    return {
      transform: `translate(${x}px, ${y}px)`,
    };
  }

  render() {
    const players = this.props.server.game.players;
    const ownPlayer = players.find(
      (player) => player.id === this.props.server.ownId
    )!;
    const remotePlayers = players
      .filter((player) => player.id !== this.props.server.ownId)
      .reverse(); // Render in reverse order to get better stacking.

    return (
      <div className="imploding-puppies-game">
        <div
          className={classNames(
            "player-hightlight",
            "active-player-highlight",
            { small: this.isSmall }
          )}
          style={this.getRemotePlayerPosition(
            this.props.server.game.currentPlayer
          )}
        />
        {this.props.server.game.lastTarget ? (
          <div
            className={classNames(
              "player-hightlight",
              "target-player-highlight",
              { small: this.isSmall }
            )}
            key={this.props.server.game.lastTarget.timestamp}
            style={this.getRemotePlayerPosition(
              this.props.server.game.lastTarget.target
            )}
          />
        ) : null}

        <Deck
          game={this.props.server.game}
          getPlayerAngle={this.getPlayerPos}
          onClick={this.onDeckClick}
          small={this.isSmall}
        />
        <div className="remote-area">
          {remotePlayers.map((player, i) => (
            <RemotePlayer
              key={i}
              player={player}
              small={this.isSmall}
              style={this.getRemotePlayerPosition(player)}
            />
          ))}
        </div>
        <Player
          player={ownPlayer}
          small={this.isSmall}
          game={this.props.server.game}
          exposeDrawFn={this.setDrawFn}
        />

        <Announcements announcements={this.props.server.game.announcements} />
      </div>
    );
  }

  private getPlayerAngle_(index: number) {
    const range =
      this.props.server.game.players.length === 3 ? (Math.PI * 1) / 2 : Math.PI;
    const count = this.props.server.game.players.length - 2;
    return (((-count / 2 + index) * range) / count || 0) - Math.PI / 2;
  }
}

export default Game;
