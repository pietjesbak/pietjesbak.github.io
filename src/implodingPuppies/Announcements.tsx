import './css/Announcements.css';

import * as React from 'react';
import { Announcement, AnnouncementSubject } from './data/Announcement';

interface Props {
    announcements: Announcement[];
}

class Announcements extends React.Component<Props & React.HTMLAttributes<HTMLDivElement>> {

    static announcementSubjectClasses = {
        [AnnouncementSubject.ACTION]: 'action',
        [AnnouncementSubject.TEXT]: '',
        [AnnouncementSubject.PLAYER]: 'action',
    };

    private lastLength_ = 0;

    constructor(props: Props & React.HTMLAttributes<HTMLDivElement>) {
        super(props);
    }

    shouldComponentUpdate() {
        const shouldUpdate = this.props.announcements.length !== this.lastLength_;
        this.lastLength_ = this.props.announcements.length;
        return shouldUpdate;
    }

    enterAnnouncements = (event: React.MouseEvent | React.TouchEvent) => {
        const target = event.target as HTMLElement;
        target.scroll(0, target.scrollHeight);
    }

    renderAnnouncementMessage(announcement: Announcement) {
        return announcement.formattedMessage.map(([subject, text], i) => <span key={i} className={Announcements.announcementSubjectClasses[subject]}>{text}</span>);
    }

    renderAnnouncements() {
        const elements: JSX.Element[] = [];
        const announcements = this.props.announcements;

        const cutoff = Date.now() - 2000;
        for (let i = announcements.length - 1; i >= 0; i--) {
            const announcement = announcements[i];
            if (announcement.timestamp < cutoff) {
                break;
            }

            elements.push(<li key={'a' + i} className="animated-announcement">
                {this.renderAnnouncementMessage(announcement)}
            </li>);
        }

        // The announcements that will be shown on hover.
        elements.push(...announcements.map((announcement, i) => <li key={i} >
            {this.renderAnnouncementMessage(announcement)}
        </li>));

        return elements;
    }

    render() {
        return (
            <ul className="announcements" onTouchStart={this.enterAnnouncements} onMouseEnter={this.enterAnnouncements}>
                {this.renderAnnouncements()}
            </ul>
        );
    }
}

export default Announcements;
