import 'leaflet/dist/leaflet.css';

import { Icon } from 'leaflet';
import * as React from 'react';
import { Map, Marker, TileLayer, Tooltip } from 'react-leaflet';
import { MAPBOX_KEY } from '../data/Constants'
import * as img from '../Pietjesbak.png';

const logoIcon = new Icon({
    iconUrl: img as any,
    iconSize: [40, 40], // size of the icon
    shadowSize: [40, 40], // size of the shadow
    iconAnchor: [20, 20], // point of the icon which will correspond to marker's location
    shadowAnchor: [10, 10],  // the same for the shadow
    popupAnchor: [0, -20] // point from which the popup should open relative to the iconAnchor
});

interface Props extends React.HTMLAttributes<JSX.Element> {
    center?: { lat: number, lng: number };
    zoom?: number;
}

class SimpleMap extends React.Component<Props> {
    static defaultProps = {
        center: { lat: 51.0709, lng: 3.67646 },
        zoom: 16
    };

    render() {
        return (
            <Map
                style={{ width: '100%', height: 400, position: 'relative' }}
                center={this.props.center!}
                zoom={this.props.zoom!}
            >
                <TileLayer
                    attribution='Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>'
                    url={`https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=${MAPBOX_KEY}`}
                    id="mapbox.streets"
                />
                <Marker position={[this.props.center!.lat, this.props.center!.lng]} icon={logoIcon}>
                    <Tooltip offset={[0, -20]} direction="top" >
                        <span className="nobreak">'t Geestje<br />Zandloperstraat 83<br />9030 Mariakerke</span>
                    </Tooltip>
                </Marker>
            </Map>
        );
    }
}

export default SimpleMap;
