/**
 * A heroku app running cors-anywhere to access some boardgame geek api endpoints.
 * https://github.com/Rob--W/cors-anywhere
 *
 * @const
 * @type {string}
 */
export const CORS_ANYWHERE_DYNO = 'https://pietjesbak.herokuapp.com/';

/**
 * The pietjesbak game collection on board game geek.
 *
 * @const
 * @type {string}
 */
export const PIETJESBAK_BBG_COLLECTION = 'https://www.boardgamegeek.com/xmlapi/collection/de%20pietjesbak?own=1';

/**
 * Board game geek game details api. Add the board game id. Requires the cors-anywhere dyno.
 *
 * @const
 * @type {string}
 */
export const BBG_GAME_API = 'https://www.boardgamegeek.com/xmlapi/boardgame/';

/**
 * Facebook pietjesbak events graph api.
 * Please don't steal my app secret k thanks.
 *
 * @const
 * @type {string}
 */
export const FACEBOOK_PIETJESBAK_EVENTS = 'https://graph.facebook.com/v2.10/gezelschapsspellenpietjesbak/events?access_token=874889636002007|788af4e5d543244dff7ee209987a2a57&format=json&limit=1';
