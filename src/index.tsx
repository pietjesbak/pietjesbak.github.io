import "./css/reset.css";

import "./css/animation.css";
import "./css/icons.css";
import "./css/index.css";

// import "core-js/fn/symbol/iterator.js"; // Edge ლ(ಠ益ಠლ)
import React from "react";
import * as ReactDOM from "react-dom";
import App from "./App";
import registerServiceWorker from "./registerServiceWorker";

ReactDOM.render(<App />, document.getElementById("root"));
registerServiceWorker();
