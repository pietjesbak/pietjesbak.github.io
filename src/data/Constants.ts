/**
 * A heroku app running cors-anywhere to access some boardgame geek api endpoints.
 * https://github.com/Rob--W/cors-anywhere
 */
export const CORS_ANYWHERE_DYNO = "https://pietjesbak.herokuapp.com/";

/**
 * The pietjesbak game collection on board game geek.
 */
export const PIETJESBAK_BBG_COLLECTION =
  "https://www.boardgamegeek.com/xmlapi/collection/de%20pietjesbak?own=1";

/**
 * Board game geek game details api. Add the board game id. Requires the cors-anywhere dyno.
 */
export const BBG_GAME_API = "https://www.boardgamegeek.com/xmlapi/boardgame/";

/**
 * Mapbox key.
 * https://www.mapbox.com/account/
 */
export const MAPBOX_KEY =
  "pk.eyJ1IjoibG9yZ2FuMyIsImEiOiJjamxocmNzbmgwNHJvM3BudnV5NmM5dDU4In0.n01kRSSpjingBJyyrledLg";

/**
 * Minimum width to also show the text for the icon buttons.
 */
export const ICONBUTTON_MIN_SCREEN_WIDTH = 585;
