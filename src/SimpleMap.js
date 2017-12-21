import GoogleMap from 'google-map-react';
import React, { Component } from 'react';
import Tooltip from "react-simple-tooltip";

const Pietjesbak = () => {
    return (
        <Tooltip style={{position: 'relative', top: '-26px', left: '-28px'}} content={<span className="nobreak">Zandloperstraat 83<br />9030 Mariakerke</span>}>
            <svg id="pietjesbak-marker" width="57" height="52">
                <path d="M4 25.650635094610966L16.5 4L41.5 4L54 25.650635094610966L41.5 47.30127018922193L16.5 47.30127018922193Z" strokeWidth="5" fill="#c33" stroke="#eee"></path>
            </svg>
        </Tooltip>
    );
}

class SimpleMap extends Component {
    static defaultProps = {
      center: {lat: 51.0709, lng: 3.67646},
      zoom: 16
    };

    render() {
      return (
        <GoogleMap
          style={{width: '100%', height: 400, position: 'relative'}}
          defaultCenter={this.props.center}
          defaultZoom={this.props.zoom}
          >
        <Pietjesbak
          lat={this.props.center.lat}
          lng={this.props.center.lng}
        />
      </GoogleMap>
      );
    }
  }

  export default SimpleMap;
