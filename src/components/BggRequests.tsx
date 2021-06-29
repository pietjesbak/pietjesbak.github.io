import "../css/Games.css";

import * as React from "react";
import { Link } from "react-router-dom";
import { BggGameData } from "../data/BggData";
import * as constants from "../data/Constants";
import { ChangeEvent, Inventory } from "../data/Inventory";
import { readableDate } from "../Helpers";
import { withInventory } from "../InventoryProvider";
import BggGame from "./BggGame";
import { CollapsableContainer, headerState } from "./CollapsableContainer";
import { TextPlaceholder } from "./TextPlaceholder";

export interface State {
  requestedGames: BggGameData[] | null;
  nextEvent: { date: Date; confirmed: boolean } | null;
}

export interface Props {
  inventory: Inventory;
}

export class BggRequests extends React.Component<
  Props & React.ClassAttributes<BggRequests>,
  State
> {
  constructor(props: Props & React.ClassAttributes<BggRequests>) {
    super(props);

    this.state = {
      requestedGames: null,
      nextEvent: null,
    };

    // Make sure the dyno is running.
    fetch(constants.CORS_ANYWHERE_DYNO);
  }

  async componentDidMount() {
    this.props.inventory.addChangeListener(
      ChangeEvent.GAME_DATA,
      this.updateGames
    );

    this.setState({ nextEvent: await this.props.inventory.getNextEventDate() });
  }

  componentWillUnmount() {
    this.props.inventory.removeChangeListener(
      ChangeEvent.GAME_DATA,
      this.updateGames
    );
  }

  updateGames = (games: Map<number, BggGameData>) => {
    const requestedGames = [...games.values()]
      .filter((game) => game.requestsThisMonth > 0)
      .sort(
        (a, b) =>
          b.requestsThisMonth - a.requestsThisMonth ||
          b.stats.rating - a.stats.rating
      );
    this.setState({ requestedGames });
  };

  render() {
    let date = <span>de volgende keer</span>;

    if (this.state.nextEvent !== null) {
      date = (
        <span>
          {readableDate(this.state.nextEvent.date, false)}{" "}
          <span className="mute">
            {" "}
            {this.state.nextEvent.confirmed ? "" : "(nog niet vastgelegd)"}
          </span>
        </span>
      );
    }

    if (this.state.requestedGames === null) {
      return (
        <CollapsableContainer
          title="Aanvragen"
          header={headerState.SHOWN_COLLAPSED}
          storeCollapsed={true}
        >
          <h3>Aanvragen voor {date}</h3>
          <TextPlaceholder renderTitle={false} paragraphSize={4} />
        </CollapsableContainer>
      );
    }

    if (this.state.requestedGames.length === 0) {
      return (
        <CollapsableContainer
          title="Aanvragen"
          header={headerState.SHOWN_COLLAPSED}
          storeCollapsed={true}
        >
          <h3>Aanvragen voor {date}</h3>
          <p>
            Er zijn nog geen aanvragen. <br />
            Geef aan welk spel je volgende keer graag wil spelen op de{" "}
            <Link to="/games">games</Link> pagina! <br />
            <br />
            Of neem gerust enkele van je eigen spellen mee.
          </p>
        </CollapsableContainer>
      );
    }

    return (
      <CollapsableContainer
        title="Aanvragen"
        header={headerState.SHOWN_COLLAPSED}
        storeCollapsed={true}
      >
        <h3>Aanvragen voor {date}</h3>
        <ul className="games">
          {this.state.requestedGames.map((game) => (
            <BggGame key={game.id} game={game} />
          ))}
        </ul>
      </CollapsableContainer>
    );
  }
}

export default withInventory(BggRequests);
