import './css/App.css';

import * as React from 'react';
import { HashRouter, NavLink, Route, Switch } from 'react-router-dom';
import Tooltip from 'react-simple-tooltip';
import AsyncMap from './components/AsyncMap';
import BggList from './components/BggList';
import BggRequests from './components/BggRequests';
import { Container } from './components/Container';
import EventCard from './components/EventCard';
import IconLink from './components/IconLink';
import OptionIconButton from './components/OptionIconButton';
import ScrollToTop from './components/ScrollToTop';
import TouchDecider from './components/TouchDecider';
import inventory, { ChangeEvent } from './data/Inventory';

export interface State {
    username: string;
}

class App extends React.Component<React.HTMLAttributes<App>, State> {
    constructor(props: React.HTMLAttributes<App>) {
        super(props);
        this.state = {
            username: ''
        };
    }

    componentDidMount() {
        inventory.addChangeListener(ChangeEvent.USER, user => {
            if (user) {
                this.setState({ username: (user as FirebaseUser).displayName });
            }
        });
    }

    logout = async () => {
        await inventory.logout();
        this.setState({
            username: ''
        });
    }

    login = async () => {
        const user = await inventory.login();
        this.setState({
            username: user.displayName
        });
    }

    home = () => {
        return (
            <div>
                <EventCard />
                <BggRequests />
            </div>
        );
    }

    games() {
        return (
            <BggList />
        );
    }

    info() {
        return (
            <div>
                <Container>
                    <h3>Wie zijn wij?</h3>
                    Spellenclub De pietjesbak is een spellenclub in Gent / Mariakerke. <br />
                    Elke derde vrijdag van de maand (behalve in juli en augustus) <br /><br />

                    Voor 1 € inkom is iedereen welkom om een nieuw of oud spel mee te komen spelen. <br />
                    Oud of Jong, moeilijk of makkelijk, we brengen steeds een grote variatie aan spellen mee die ter plaatse uitgelegd worden. <br />
                    We starten rond 19u30 en gaan door tot ± 23 a 24u.

                    <h3>In 't Geestje</h3>
                    <span className="location">
                        Zandloperstraat 83 <br />
                        9030 Mariakerke
                    </span>
                    <AsyncMap />
                </Container>
            </div>
        );
    }

    touchDecider() {
        return (
            <Container>
                <p>
                    Deze app kan gebruikt worden om een start speler te bepalen. Iedere speler plaatst 1 vinger op het scherm, de speler wiens kleur het volledige scherm inneemt, is de start speler!
                </p>
                {'ontouchstart' in document.documentElement ? null : <span className="mute">PS: Dit werkt enkel op apparaten met een touchscreen.</span>}
                <TouchDecider />
            </Container>
        );
    }

    noRoute() {
        return (
            <div className="center not-found">
                <span>404</span>
                <div style={{ fontSize: 14 + "vw", whiteSpace: "nowrap" }}>¯\_(ツ)_/¯</div>
            </div>
        )
    }

    renderLoginButton() {
        return (
            <OptionIconButton text="menu" icon="menu" placement="left">
                {inventory.user !== null ? (
                    <button onClick={this.logout}>
                        <i className="icon-logout" /> Log uit
                    </button>
                ) : (
                    <button onClick={this.login}>
                        <i className="icon-login" /> Log in
                    </button>
                )}
                <NavLink exact={true} activeClassName="hidden" to="/startspeler">
                    Startspeler kiezen
                </NavLink>
            </OptionIconButton>
        );
    }

    render() {
        return (
            <HashRouter>
                <ScrollToTop>
                    <div className="full-height">
                        <div className="page-wrap">
                            <header>
                                <div className="wrapper">
                                    <h1>
                                        <svg id="logo" width="57" height="52">
                                            <path d="M4 25.650635094610966L16.5 4L41.5 4L54 25.650635094610966L41.5 47.30127018922193L16.5 47.30127018922193Z" strokeWidth="5" fill="#c33" stroke="#eee" />
                                        </svg>
                                        Spellenclub De Pietjesbak
                                </h1>
                                </div>
                            </header>
                            <div className="wrapper">
                                <nav className="menu">
                                    <ul>
                                        <li><IconLink icon="globe" to="/" text="Home" /></li>
                                        <li><IconLink icon="megaphone" to="/info" text="Info" /></li>
                                        <li><IconLink icon="puzzle" to="/games" text="Games" /></li>
                                        <li className="right">
                                            {this.renderLoginButton()}
                                        </li>
                                    </ul>
                                </nav>
                                {inventory.user !== null ?
                                    <div>
                                        <div className="user-profile">
                                            <Tooltip content={`Ingeloged als ${this.state.username}`} placement="left">
                                                <img alt={this.state.username} src={inventory.user.photoURL} />
                                            </Tooltip>
                                        </div>
                                    </div>
                                    :
                                    <div />
                                }
                                <Switch>
                                    <Route exact={true} path="/" component={this.home} />
                                    <Route path="/games" component={this.games} />
                                    <Route path="/info" component={this.info} />
                                    <Route path="/startspeler" component={this.touchDecider} />
                                    <Route render={this.noRoute} />
                                </Switch>
                            </div>
                        </div>
                        <footer>
                            <ul className="wrapper">
                                <li>
                                    <a href="https://www.facebook.com/gezelschapsspellenpietjesbak/">
                                        <i className="icon-facebook-squared" />
                                        Like
                                </a>
                                </li>
                                <li>
                                    <a href="mailto:pietdecoensel@gmail.com">
                                        <i className="icon-mail-alt" />
                                        Contact
                                </a>
                                </li>
                            </ul>
                            <span>&copy; Spellenclub De Pietjesbak &#9679; Lennert Claeys</span>
                        </footer>
                    </div>
                </ScrollToTop>
            </HashRouter>
        );
    }
}

export default App;
