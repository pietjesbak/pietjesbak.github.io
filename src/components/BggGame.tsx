import * as React from 'react';
import Tooltip from 'react-simple-tooltip';
import { BggGameData } from '../data/BggData';
import inventory from '../data/Inventory';
import { blendColors } from '../Helpers';

export interface Props extends React.HtmlHTMLAttributes<BggGame> {
    expanded?: boolean;
    game: BggGameData;
    expansionClick?: ((id: number) => void) | null;
}

export interface State {
    error: boolean;
    expanded: boolean;
    game: BggGameData;
}

class BggGame extends React.Component<Props, State> {
    static defaultProps = {
        expanded: false,
        game: null,
        expansionClick: null
    }

    constructor(props: Props) {
        super(props);

        this.state = {
            error: false,
            expanded: false,
            game: props.game
        };
    }

    componentDidMount() {
        if (this.props.expanded !== this.state.expanded) {
            this.showFullDetails();
        }
    }

    componentDidUpdate() {
        if (this.props.expanded === true) {
            window.scrollTo(0, (this.refs.element as HTMLElement).offsetTop);
        }
    }

    componentWillReceiveProps(props: Props) {
        this.setState({ game: props.game });

        if (props.expanded !== this.state.expanded) {
            this.showFullDetails();
        }
    }

    showFullDetails = async (e?: React.SyntheticEvent) => {
        if (e !== undefined) {
            e.preventDefault();
            e.stopPropagation();
        }

        const newState = !this.state.expanded;
        this.setState({ expanded: newState });
        if (newState === true) {
            try {
                await inventory.fetchGameDetails(this.state.game!);
                this.setState(this.state);
            } catch (e) {
                console.error(e);
                this.setState({ error: true });
            }
        }
    }

    requestClick = (e: React.SyntheticEvent) => {
        e.preventDefault();
        e.stopPropagation();

        inventory.toggleGame(this.state.game!);
    }

    expansionClick = (e: React.SyntheticEvent) => {
        if (this.props.expansionClick !== null) {
            e.preventDefault();
            e.stopPropagation();

            this.props.expansionClick!(Number((e.target as HTMLElement).dataset.expansion));
        }
    }

    renderDetails() {
        if (this.state.expanded === false) {
            return;
        }

        if (this.state.error === true) {
            return (
                <div className="full-details error">
                    <h2>Er is iets misgelopen!</h2>
                    <span>Je kan de pagina proberen herladen, stuur ons gerust een mailtje als het blijft gebeuren!</span>
                </div>
            );
        }

        if (this.state.game.details === null || this.state.game.details === undefined) {
            return (
                <div className="full-details">
                    <div className="spinner">
                        <i className="icon-spin1 animate-spin" />
                    </div>
                </div>
            );
        }

        return (
            <div className="full-details">
                <div className="warning">
                    <i className="icon-attention" />
                    Deze info wordt van <a target="blank" href={`https://www.boardgamegeek.com/boardgame/${this.state.game.id}/`}>boardgamegeek</a> gehaald en is dus in het Engels.
                </div>

                <h3><i className="icon-info" /> Beschrijving</h3>
                <p className="description">{this.state.game.details.descriptionArray.map((part, i) => {
                    if (part.startsWith('http')) {
                        return <a key={i} href={part}>{part}</a>
                    }
                    return <span key={i} >{part}</span>
                })}</p>

                <dl>
                    {this.renderlist('icon-tag', 'Categorieën', 'categories')}
                    {this.renderlist('icon-cog', 'Mechanics', 'mechanics')}
                    {this.renderlist('icon-users', 'Soort', 'domain')}
                    {this.renderlist('icon-globe', 'Thema', 'family')}
                </dl>

                {this.renderExpansions()}
            </div>
        );
    }

    /**
     * Renders a list of tag like objects.
     *
     * @param icon Icon for this section.
     * @param name Title for this section.
     * @param key variable name of where the items are stored.
     */
    renderlist(icon: string, name: string, key: string) {
        let items: string | string[] = this.state.game.details![key];

        if (items === undefined || items.length === 0) {
            return;
        }

        if (Array.isArray(items) === false) {
            items = [items as string];
        }

        return (
            <div>
                <dt><i className={icon} /> {name}</dt>
                <dd>
                    <ul className="tag-list">{(items as string[]).map(item => <li key={item}>{item}</li>)}</ul>
                </dd>
            </div>
        );
    }

    renderExpansions() {
        if (this.state.game.details!.ownedExpansions.size === 0) {
            return;
        }

        return (
            <section>
                <h3><i className="icon-puzzle" /> Uitbreidingen</h3>
                <ul className="tag-list">
                    {[...this.state.game.details!.ownedExpansions].map(([id, name] )=> {
                        return (
                            <li key={id}>
                                <a target="blank" href={`https://www.boardgamegeek.com/boardgame/${id}/`} onClick={this.expansionClick} data-expansion={id}>
                                    <i className="icon-ok" />
                                    {name}
                                </a>
                            </li>
                        )
                    })}
                    {/* {[...this.state.game.details.otherExpansions].map(([id, name]) => {
                        return (
                            <li key={id}>
                                <a target="blank" href={`https://www.boardgamegeek.com/boardgame/${id}/`}>
                                    <i className="icon-cancel"></i>
                                    {name}
                                </a>
                            </li>
                        );
                    })} */}
                </ul>
            </section>
        );
    }

    stopPropagation = (e: React.SyntheticEvent) => e.stopPropagation();

    renderRequestButton() {
        let text: string;
        let icon: string;

        icon = this.state.game.requestedByMe ? 'icon-heart' : 'icon-heart-empty';
        if (this.state.game.requestsThisMonth === 0) {
            text = 'Speel dit spel volgende keer';
        } else if (this.state.game.requestsThisMonth === 1) {
            if (this.state.game.requestedByMe === true) {
                text = 'Jij wil dit spelen';
            } else {
                text = 'Iemand wil dit spelen';
            }
        } else {
            if (this.state.game.requestedByMe === true) {
                const other = (this.state.game.requestsThisMonth > 2) ? 'anderen' : 'andere';
                text = `Jij en ${this.state.game.requestsThisMonth - 1} ${other} willen dit spelen`;
            } else {
                text = `${this.state.game.requestsThisMonth} anderen willen dit spelen`;
            }
        }

        if (inventory.user === null) {
            return (
                <div className="info pointer">
                    <span className="hover" onClick={this.stopPropagation}>
                        <Tooltip content="Log in om aan te geven dat je dit spel wil spelen">
                            <i className={icon} /> <span className="whitespace-normal">{text}</span>
                        </Tooltip>
                    </span>
                </div>
            );
        } else {
            return (
                <div className="info pointer" >
                    <span className="hover" onClick={this.requestClick}>
                        <i className={icon} /> <span className="whitespace-normal">{text}</span>
                    </span>
                </div>
            );
        }
    }

    render() {
        return (
            <li className={this.state.expanded ? "expanded" : ""} key={this.state.game.id} ref="element">
                <span>
                    <div className="thumb-holder pointer" onClick={this.showFullDetails}>
                        <img src={this.state.game.thumbnail} alt={this.state.game.name} />
                    </div>
                    <div className="details">
                        <h3 className="pointer" onClick={this.showFullDetails}>{this.state.game.name}</h3>
                        <div className="info-holder">
                            <div>
                                <div className="info"><i className="icon-users" /> {this.state.game.stats.players}</div>
                                <div className="info"><i className="icon-clock" /> {this.state.game.stats.playtime}</div>
                                {this.renderRequestButton()}
                            </div>
                            <div className="score" style={{ borderColor: blendColors('#FF0000', '#00FF00', this.state.game.stats.rating / 12) }}>{this.state.game.stats.rating.toFixed(1)}</div>
                        </div>
                    </div>
                </span>
                {this.renderDetails()}
            </li>
        );
    }
}

export default BggGame;
