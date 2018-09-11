import './css/EventCard.css';

import classNames from 'classnames';
import * as React from 'react';
import { readableDate } from '.';
import { Container } from './components/Container';
import { TextPlaceholder } from './components/TextPlaceholder';
import inventory from './data/Inventory';
import IconButton, { IconButtonBehavour } from './IconButton';

export interface State {
    editing: boolean,
    event: FirebaseMessage | null;
    error: boolean;
}

export default class EventCard extends React.Component<React.HTMLAttributes<EventCard>, State> {
    constructor(props: React.HTMLAttributes<EventCard>) {
        super(props);
        this.state = {
            editing: false,
            event: null,
            error: false
        };
    }

    componentDidMount() {
        this.updateMessage();
    }

    async updateMessage() {
        try {
            const event = await inventory.getMessage();
            this.setState({ event });
        } catch (e) {
            console.error(e);
            this.setState({ error: true });
        }
    }

    toggleMessage = async () => {
        if (this.state.editing === true) {
            await inventory.updateMessage(
                (this.refs.title as HTMLInputElement).value,
                (this.refs.body as HTMLTextAreaElement).value,
                new Date((this.refs.date as HTMLInputElement).value).getTime()
            );

            this.updateMessage();
        }

        this.setState({ editing: this.state.editing === false });
    }

    renderDate(date: Date) {
        const readable = readableDate(date, true);

        if (Date.now() - date.getTime() < 0) {
            return <div className="date valid">
                <span>Op {readable}</span>
            </div>
        }

        if (Date.now() - date.getTime() < 1000 * 60 * 60 * 5) {
            return <div className="date ongoing">
                <span>Op {readable}</span><br />
                <span><strong>Nu aan de gang!</strong></span>
            </div>
        }

        return <div className="date expired">
            <span>Op {readable}</span><br />
            <span>Dit event is voorbij, nieuwe events worden meestal 2 weken op voorhand gepland.</span>
        </div>
    }

    renderEvent(event: FirebaseMessage | null, error: boolean) {
        if (error === true) {
            return (
                <div className="event">
                    <h2>Er lijkt geen volgend event gepland te zijn.</h2>
                </div>
            );
        }

        if (event === null) {
            return (
                <div className="event">
                    <TextPlaceholder paragraphs={2} paragraphSize={3} />
                </div>
            );
        }

        if (this.state.editing === false) {
            return (<div className="event">
                <h2>{event.title}</h2>
                {this.renderDate(event.date)}
                <br />

                {event.body.split('\n').map((item, key) => {
                    return <span key={key}>{item}<br /></span>
                })}
            </div>);
        } else {
            return this.renderEditableEvent(event);
        }
    }

    renderEditableEvent(event: FirebaseMessage) {
        return (<div className="content">
            <input type="text" defaultValue={event.title} ref="title"/>
            <input type="datetime-local" defaultValue={new Date(event.date.getTime() - event.date.getTimezoneOffset() * 60000).toISOString().slice(0, -1)} ref="date" />
            <textarea defaultValue={event.body} ref="body" />
        </div>);
    }

    render() {
        return (
            <Container className={classNames('event-card', {'error': this.state.error})}>
                <a className="facebook" href="https://www.facebook.com/gezelschapsspellenpietjesbak/" ><i className="icon-facebook-squared" /></a>

                {this.renderEvent(this.state.event, this.state.error)}
                {inventory.user !== null && inventory.user.admin === true ? <IconButton subClass="edit-event" action={this.toggleMessage} icon="cog" text={this.state.editing ? "Opslaan" : "Aanpassen"} behaviour={IconButtonBehavour.SMALL} />: <span/>}
            </Container>
        );
    }
}
