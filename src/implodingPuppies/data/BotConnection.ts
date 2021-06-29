import { Game } from "./Game";
import { DataConnection, PeerData } from "./PeerBase";

abstract class BotConnection implements DataConnection {
  static PLAY_DELAY = 1500;

  protected game_: Game;

  protected closeAction_?: () => void;

  protected dataAction_?: (data: PeerData) => void;

  private closed_ = false;

  constructor(game: Game) {
    this.game_ = game;
  }

  get closed() {
    return this.closed_;
  }

  close() {
    this.closed_ = true;
    this.closeAction();
  }

  abstract send(data: PeerData): void;

  on(type: string, cb: any) {
    switch (type) {
      case "close":
        this.closeAction_ = cb;
        break;

      case "data":
        this.dataAction_ = cb;
        break;
    }
  }

  protected closeAction() {
    if (this.closeAction_ !== undefined) {
      this.closeAction_();
    }
  }

  protected dataAction(data: PeerData, instant?: boolean) {
    if (this.dataAction_ !== undefined) {
      window.setTimeout(
        () => this.dataAction_!(data),
        instant ? 0 : BotConnection.PLAY_DELAY
      );
    }
  }
}

export default BotConnection;
