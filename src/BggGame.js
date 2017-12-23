import { blendColors } from './index.js';
import inventory from './data/Inventory';
import React, { Component } from 'react';
import Tooltip from 'react-simple-tooltip';

class BggGame extends Component {
    constructor(data) {
        super();

        this.state = {
            error: false,
            expanded: false,
            game: data.game
        };
    }

    static defaultProps = {
        game: null,
    }

    componentWillReceiveProps(props) {
        this.setState({ game: props.game });
    }

    showFullDetails = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const newState = !this.state.expanded;
        this.setState({ expanded: newState });
        if (newState === true) {
            try {
                await inventory.fetchGameDetails(this.state.game);
                this.setState(this.state);
            } catch (e) {
                console.error(e);
                this.setState({ error: true });
            }
        }
    }

    requestClick = (e) => {
        e.preventDefault();
        e.stopPropagation();

        inventory.toggleGame(this.state.game);
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
                        <i className="icon-spin1 animate-spin"></i>
                    </div>
                </div>
            );
        }

        return (
            <div className="full-details">
                <div className="warning">
                    <i className="icon-attention"></i>
                    Deze info wordt van <a target="blank" href={`https://www.boardgamegeek.com/boardgame/${this.state.game.id}/`}>boardgamegeek</a> gehaald en is dus in het Engels.
                </div>

                <h3><i className="icon-info"></i> Beschrijving</h3>
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
     * @param {string} icon Icon for this section.
     * @param {string} name Title for this section.
     * @param {string} key variable name of where the items are stored.
     */
    renderlist(icon, name, key) {
        let items = this.state.game.details[key];
        if (items === undefined) {
            return;
        }

        if (Array.isArray(items) === false) {
            items = [items];
        }

        return (
            <div>
                <dt><i className={icon}></i> {name}</dt>
                <dd>
                    <ul className="tag-list">{items.map(item => <li key={item}>{item}</li>)}</ul>
                </dd>
            </div>
        );
    }

    renderExpansions() {
        if (this.state.game.details.expansions.size === 0) {
            return;
        }

        return (
            <section>
                <h3><i className="icon-puzzle"></i> Uitbreidingen</h3>
                <ul className="tag-list">
                    {[...this.state.game.details.ownedExpansions.values()].map(game => {
                        return (
                            <li key={game.id}>
                                <a target="blank" href={`https://www.boardgamegeek.com/boardgame/${game.id}/`}>
                                    <i className="icon-ok"></i>
                                    {game.name}
                                </a>
                            </li>
                        )
                    })}
                    {[...this.state.game.details.otherExpansions].map(([id, name]) => {
                        return (
                            <li key={id}>
                                <a target="blank" href={`https://www.boardgamegeek.com/boardgame/${id}/`}>
                                    <i className="icon-cancel"></i>
                                    {name}
                                </a>
                            </li>
                        );
                    })}
                </ul>
            </section>
        );
    }

    renderRequestButton() {
        let text, icon;

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
                let other = (this.state.game.requestsThisMonth > 2) ? 'anderen' : 'andere';
                text = `Jij en ${this.state.game.requestsThisMonth - 1} ${other} willen dit spelen`;
            } else {
                text = `${this.state.game.requestsThisMonth} anderen willen dit spelen`;
            }
        }

        if (inventory.user === null) {
            return (
                <div className="info pointer">
                    <span className="hover" onClick={e => e.stopPropagation()}>
                        <Tooltip content="Log in om aan te geven dat je dit spel wil spelen">
                            <i className={icon}></i> <span className="whitespace-normal">{text}</span>
                        </Tooltip>
                    </span>
                </div>
            );
        } else {
            return (
                <div className="info pointer" >
                    <span className="hover" onClick={this.requestClick}>
                        <i className={icon}></i> <span className="whitespace-normal">{text}</span>
                    </span>
                </div>
            );
        }
    }

    render() {
        return (
            <li className={this.state.expanded ? "expanded" : ""} key={this.state.game.id}>
                <span className="pointer" onClick={this.showFullDetails}>
                    <div className="thumb-holder">
                        <img src={this.state.game.thumbnail} alt={this.state.game.name}></img>
                    </div>
                    <div className="details">
                        <h3>{this.state.game.name}</h3>
                        <div className="info-holder">
                            <div>
                                <div className="info"><i className="icon-users"></i> {this.state.game.stats.players}</div>
                                <div className="info"><i className="icon-clock"></i> {this.state.game.stats.playtime}</div>
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
