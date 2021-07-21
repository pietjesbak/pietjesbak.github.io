import "leaflet/dist/leaflet.css";

import { Icon } from "leaflet";
import React from "react";
import { MapContainer, Marker, TileLayer, Tooltip } from "react-leaflet";
import { MAPBOX_KEY } from "../data/Constants";
import img from "../Pietjesbak.png";

const logoIcon = new Icon({
  iconUrl: img,
  iconSize: [40, 40], // size of the icon
  shadowSize: [40, 40], // size of the shadow
  iconAnchor: [20, 20], // point of the icon which will correspond to marker's location
  shadowAnchor: [10, 10], // the same for the shadow
  popupAnchor: [0, -20], // point from which the popup should open relative to the iconAnchor
});

interface Props extends React.HTMLAttributes<JSX.Element> {
  center?: { lat: number; lng: number };
  zoom?: number;
}

class SimpleMap extends React.Component<Props> {
  static defaultProps = {
    center: { lat: 51.0709, lng: 3.67646 },
    zoom: 16,
  };

  render() {
    return (
      <MapContainer
        style={{ width: "100%", height: 400, position: "relative" }}
        center={this.props.center!}
        zoom={this.props.zoom!}
      >
        <TileLayer
          attribution='© <a href="https://www.mapbox.com/about/maps/">Mapbox</a> © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> <strong><a href="https://www.mapbox.com/map-feedback/" target="_blank">Improve this map</a></strong>'
          url={`https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token=${MAPBOX_KEY}`}
          tileSize={512}
          maxZoom={18}
          zoomOffset={-1}
          id="mapbox/streets-v11"
        />
        <Marker
          position={[this.props.center!.lat, this.props.center!.lng]}
          icon={logoIcon}
        >
          <Tooltip offset={[0, -20]} direction="top">
            <span className="nobreak">
              't Geestje
              <br />
              Zandloperstraat 83
              <br />
              9030 Mariakerke
            </span>
          </Tooltip>
        </Marker>
      </MapContainer>
    );
  }
}

export default SimpleMap;
