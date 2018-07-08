declare module 'react-simple-tooltip' {
    interface Props extends React.HTMLAttributes<JSX.Element> {
        content: string | JSX.Element;
        placement?: string;
    }

    export default class Tooltip extends React.Component<Props> { }
}

declare module 'google-map-react' {
    interface Props extends React.HTMLAttributes<JSX.Element> {
        bootstrapURLKeys: {key: string };
        defaultCenter: {lat: number, lng: number};
        defaultZoom: number;
    }

    export default class GoogleMap extends React.Component<Props> { }
}

interface FacebookEvent {
    start_time: number;
    name: string;
    description: string;
}

interface FirebaseUser {
    uid: string;
    displayName: string;
    photoURL: string;
}
